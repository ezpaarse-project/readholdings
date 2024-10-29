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

import holding from '~/../mapping/holding.json';
import { createReport } from './report';

import updateOA from '~/lib/holdingsIQ/updateOA';

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
export default async function update() {
  setWorkInProgress(true);

  resetState();

  const portalsName = Object.keys(portals);
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

  // TODO use Object.entries
  // eslint-disable-next-line no-unreachable-loop
  for (let i = 0; i < portalsName.length; i += 1) {
    const portalName = portalsName[i];
    const portalConfig = portals[portalName];

    let type = 'STANDARD';

    const standardFilename = `${portalName}-${date}-${type}.csv`;
    let standardId;

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

    addStep(portalName, '[holdingsIQ][delete]', type);

    try {
      await deleteExportByID(portalConfig, standardId);
    } catch (err) {
      appLogger.error(`[${portalName}][holdingsIQ]: Cannot delete export [${standardId}].`);
    }

    endLatestStep();

    type = 'KBART2';
    const kbart2Filename = `${portalName}-${date}-${type}.csv`;
    let kbart2Id;

    addStep(portalName, '[holdingsIQ][download]', type);

    try {
      kbart2Id = await generateAndDownloadExport(portalConfig, portalName, type, kbart2Filename);
    } catch (err) {
      fail(`[${portalName}][holdingsIQ]: Cannot generate and download ${type} export. ${err}`);
      return;
    }

    endLatestStep();
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
    addStep(portalName, '[elastic][insert][access_type]', type);

    try {
      lineUpserted = await updateOA(portalName, index);
    } catch (err) {
      appLogger.error(`[${portalName}][holdingsIQ]: Cannot delete export [${kbart2Id}].`);
    }

    const accessTypeInsertStep = getLatestStep();
    accessTypeInsertStep.lineUpserted = lineUpserted;
    updateLatestStep(accessTypeInsertStep);
    endLatestStep();
    addStep(portalName, '[holdingsIQ][delete]', type);

    try {
      await deleteExportByID(portalConfig, kbart2Id);
    } catch (err) {
      appLogger.error(`[${portalName}][holdingsIQ]: Cannot delete export [${kbart2Id}].`);
    }

    endLatestStep();
  }
  end();

  setWorkInProgress(false);

  appLogger.info('[holdingsIQ]: Data update is done.');

  const actualYear = getYear(date);

  // document why i do this
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
