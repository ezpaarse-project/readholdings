/* eslint-disable consistent-return */
/* eslint-disable no-await-in-loop */
import fs from 'fs';
import path from 'path';
import { format, getYear } from 'date-fns';
import { portals, paths } from 'config';
import { setTimeout } from 'node:timers/promises';
import { generateExport, getExportByID, deleteExportByID } from '~/lib/holdingsIQ/api';
import appLogger from '~/lib/logger/appLogger';
import downloadFileFromAWS from './aws';
import { insertStandardFileInElastic, insertKbart2FileInElastic } from '~/lib/holdingsIQ/insert';
import { sendErrorMail } from '~/lib/mail';
import { setWorkInProgress } from '~/lib/status';
import {
  createState,
  addStep,
  failLatestStep,
  endLatestStep,
  end,
  resetState,
  updateLatestStep,
  setState,
  getState,
  getLatestStep,
} from './state';
import {
  getReadHoldingsIndices, createIndex, removeIndex,
} from '~/lib/elastic';

import { getClient } from '~/lib/redis';

import updateOA from '~/lib/holdingsIQ/updateOA';
import updatePortals from '~/lib/holdingsIQ/updatePortal';

import holding from '~/../mapping/holding.json';
import { createReport } from './report';

async function generateAndDownloadExport(portalConfig, portalName, type, filename) {
  let res1;
  try {
    res1 = await generateExport(portalConfig, portalName, type);
  } catch (err) {
    appLogger.error(`[${portalName}][holdingsIQ]: Cannot generate [${type}] export`);
    throw err;
  }
  const { id } = res1;
  appLogger.info(`[${portalName}][holdingsIQ]: export ID [${id}]`);
  let res2;
  let status = '';
  let i = 0;
  while (status !== 'COMPLETED') {
    i += 1;
    res2 = await getExportByID(portalConfig, id);
    status = res2.status;
    appLogger.verbose(`[${portalName}][holdingsIQ]: ${i} try`);
    appLogger.verbose(`[${portalName}][holdingsIQ]: status of [${type}] export: [${res2.status}]`);
    if (status !== 'COMPLETED') {
      await setTimeout(10000);
    }
    // TODO if status !== COMPLETED and QUEUE, and 10 minutes : exit
  }
  const downloadLink = res2.links[0].href;
  const filepath = path.resolve(paths.data.holdingsIQDir, filename);
  // TODO use async function
  if (!fs.existsSync(path.resolve(filepath))) {
    try {
      await downloadFileFromAWS(portalName, downloadLink, filename);
    } catch (err) {
      appLogger.info(`[${portalName}][aws]: Cannot download file from aws]`);
      throw err;
    }
  }
  return id;
}

function fail(message) {
  appLogger.error(message);
  failLatestStep(message);
  setWorkInProgress(false);
  const state = getState();
  sendErrorMail(message, state);
}

// TODO comment
export default async function update(portal, forceDownload = false) {
  setWorkInProgress(true);

  resetState();

  let localPortals = JSON.parse(JSON.stringify(portals));

  if (portal) {
    localPortals = { [portal]: localPortals[portal] };
  }

  const date = format(new Date(), 'yyyy-MM-dd');
  const index = `holdings-${date}`;

  let state = createState(index);

  appLogger.info('[holdingsIQ]: Start data update');

  try {
    await createIndex(index, holding);
  } catch (err) {
    appLogger.error(`[elastic]: Cannot create index [${index}]`);
    throw err;
  }

  // eslint-disable-next-line no-restricted-syntax
  for (const [portalName, portalConfig] of Object.entries(localPortals)) {
    let type = 'STANDARD';

    // #region Download STANDARD
    const standardFilename = `${portalName}-${date}-${type}.csv`;
    let standardId;

    if (!await fs.existsSync(path.resolve(paths.data.holdingsIQDir, standardFilename))
      || forceDownload) {
      addStep(portalName, '[holdingsIQ][download]', type);
      try {
        standardId = await generateAndDownloadExport(
          portalConfig,
          portalName,
          type,
          standardFilename,
        );
      } catch (err) {
        fail(`[${portalName}][holdingsIQ]: Cannot generate and download ${type} export. ${err}`);
        return;
      }
      endLatestStep();
    } else {
      appLogger.info(`[${portalName}][holdingsIQ]: File [${standardFilename}] already exists`);
    }
    // #endregion Download STANDARD

    // #region Insert STANDARD
    addStep(portalName, '[elastic][insert]', type);
    let lineUpserted;
    try {
      lineUpserted = await insertStandardFileInElastic(portalName, standardFilename, index, date);
    } catch (err) {
      fail(`[${portalName}][elastic]: insert ${type} file in elastic. ${err}`);
      return;
    }
    const standardInsertStep = getLatestStep();
    standardInsertStep.lineUpserted = lineUpserted;
    updateLatestStep(standardInsertStep);
    endLatestStep();
    // #endregion Insert STANDARD

    // #region Delete STANDARD
    if (standardId) {
      addStep(portalName, '[holdingsIQ][delete]', type);
      try {
        await deleteExportByID(portalConfig, standardId);
      } catch (err) {
        appLogger.error(`[${portalName}][holdingsIQ]: Cannot delete export [${standardId}].`);
      }
      endLatestStep();
    }
    // #endregion Delete STANDARD

    // #region Download KBART2
    type = 'KBART2';
    const kbart2Filename = `${portalName}-${date}-${type}.csv`;
    let kbart2Id;

    if (!await fs.existsSync(path.resolve(paths.data.holdingsIQDir, kbart2Filename))
      || forceDownload) {
      addStep(portalName, '[holdingsIQ][download]', type);
      try {
        kbart2Id = await generateAndDownloadExport(portalConfig, portalName, type, kbart2Filename);
      } catch (err) {
        fail(`[${portalName}][holdingsIQ]: Cannot generate and download ${type} export. ${err}`);
        return;
      }
      endLatestStep();
    } else {
      appLogger.info(`[${portalName}][holdingsIQ]: File [${kbart2Filename}] already exists`);
    }

    // #endregion Download KBART2

    // #region Insert KBART2
    addStep(portalName, '[elastic][insert]', type);
    try {
      lineUpserted = await insertKbart2FileInElastic(portalName, kbart2Filename, index);
    } catch (err) {
      fail(`[${portalName}][elastic]: insert ${type} in elastic. ${err}`);
      return;
    }
    const kbart2InsertStep = getLatestStep();
    kbart2InsertStep.lineUpserted = lineUpserted;
    updateLatestStep(kbart2InsertStep);
    endLatestStep();
    // #endregion Insert KBART2

    // #region Delete KBART2
    if (kbart2Id) {
      addStep(portalName, '[holdingsIQ][delete]', type);
      try {
        await deleteExportByID(portalConfig, kbart2Id);
      } catch (err) {
        appLogger.error(`[${portalName}][holdingsIQ]: Cannot delete export [${kbart2Id}].`);
      }
      endLatestStep();
    }
    // #endregion Delete KBART2

    // #region Update OA
    addStep(portalName, '[elastic][insert][access_type]', type);
    try {
      lineUpserted = await updateOA(portalName, index);
    } catch (err) {
      appLogger.error(`[${portalName}][holdingsIQ]: Cannot update OA`);
    }
    const accessTypeInsertStep = getLatestStep();
    accessTypeInsertStep.lineUpserted = lineUpserted;
    updateLatestStep(accessTypeInsertStep);
    endLatestStep();
    // #endregion Update OA
  }

  // region Update Portal
  try {
    await updatePortals(index);
  } catch (err) {
    appLogger.error('[holdingsIQ]: Cannot update portals');
  }
  // #endregion Update Portal

  const redisClient = getClient();
  await redisClient.flushAll();

  end();

  setWorkInProgress(false);

  appLogger.info('[holdingsIQ]: Data update is done.');

  const actualYear = getYear(date);

  const indices = await getReadHoldingsIndices();
  const currentIndexInfo = indices.find((item) => item.index === index);
  let indexNames = indices.map((item) => item.index);
  // remove current index and old year index
  indexNames = indexNames.filter(
    (indexName) => indexName !== index && indexName.includes(actualYear),
  );

  for (let i = 0; i < indexNames.length; i += 1) {
    const indexCurrentYear = indexNames[i];
    await removeIndex(indexCurrentYear);
  }

  state = getState();
  state.documents = currentIndexInfo['docs.count'];
  setState(state);

  await createReport(state);
}
