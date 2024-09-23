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
  getState,
} from './state';
import { getIndices, createIndex, removeIndex } from '~/lib/elastic';

import holding from '~/../mapping/holding.json';

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
  }
  const downloadLink = res2.links[0].href;
  const filepath = path.resolve(paths.data.holdingsIQDir, filename);
  if (!await fs.existsSync(path.resolve(filepath))) {
    try {
      await downloadFileFromAWS(portalName, downloadLink, filename);
    } catch (err) {
      appLogger.info(`[${portalName}][aws]: Cannot download file from aws]`);
      throw err;
    }
  }
  return id;
}

export default async function update() {
  const portalsName = Object.keys(portals);
  const date = format(new Date(), 'yyyy-MM-dd');
  const index = `holdings-${date}`;

  setWorkInProgress(true);

  let state = createState();

  appLogger.info('[holdingsIQ]: Start data update');

  try {
    await createIndex(index, holding);
  } catch (err) {
    appLogger.error(`[elastic]: Cannot create index [${index}]`);
    throw err;
  }

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
      const message = `[${portalName}][holdingsIQ]: Cannot generate and download ${type} export. ${err}`;
      appLogger.error(message);
      failLatestStep(message);
      state = getState();
      sendErrorMail(message, state);
      return;
    }

    endLatestStep();
    addStep(portalName, 'elastic', type);

    try {
      await insertStandardFileInElastic(portalName, standardFilename);
    } catch (err) {
      const message = `[${portalName}][elastic]: insert ${type} file in elastic. ${err}`;
      appLogger.error(message);
      failLatestStep(message);
      state = getState();
      sendErrorMail(message, state);
      return;
    }

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
      const message = `[${portalName}][holdingsIQ]: Cannot generate and download ${type} export. ${err}`;
      appLogger.error(message);
      failLatestStep(message);
      state = getState();
      sendErrorMail(message, state);
      return;
    }

    endLatestStep();

    addStep(portalName, 'elastic', type);

    try {
      await insertKbart2FileInElastic(portalName, kbart2Filename);
    } catch (err) {
      const message = `[${portalName}][elastic]: insert STANDARD ${type} in elastic. ${err}`;
      appLogger.error(message);
      failLatestStep(message);
      state = getState();
      sendErrorMail(message, state);
      return;
    }

    endLatestStep();
    addStep(portalName, '[holdingsIQ][delete]', type);

    try {
      await deleteExportByID(portalConfig, kbart2Id);
    } catch (err) {
      appLogger.error(`[${portalName}][holdingsIQ]: Cannot delete export [${kbart2Id}].`);
    }

    endLatestStep();
    end();
  }

  setWorkInProgress(false);

  appLogger.info('[holdingsIQ]: Data update is done.');

  const actualYear = getYear(date);

  let indices = await getIndices();
  indices = indices.map((item) => item.index);
  // remove current index and old year index
  indices = indices.filter((item) => item !== index && item.includes(actualYear));

  if (indices.length > 0) {
    for (let i = 0; i < indices.length; i += 1) {
      const indexCurrentYear = indices[i];
      await removeIndex(indexCurrentYear);
    }
  }

  resetState();
}
