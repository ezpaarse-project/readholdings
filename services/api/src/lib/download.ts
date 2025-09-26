import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout } from 'node:timers/promises';

import appLogger from '~/lib/logger/appLogger';
import { config } from '~/lib/config';
import { deleteExportByID, generateExport, getExportByID } from '~/lib/holdingsIQ/api';
import {
  insertKbart2FileInElastic,
  insertStandardFileInElastic,
} from '~/lib/holdingsIQ/insert';

import type { PortalConfig } from './portals';
import downloadFileFromAWS from './aws';
import { sendErrorMail } from './mail';
import { setWorkInProgress } from './status';
import {
  addStep,
  endLatestStep,
  failLatestStep,
  getState,
  updateLatestStep,
} from './state';

const { holdingsIQDir } = config.paths.data;

function fail(message: string) {
  appLogger.error(message);
  failLatestStep(message);
  setWorkInProgress(false);
  const state = getState();
  sendErrorMail(message, state);
}

async function generateAndDownloadExport(
  portalConfig: PortalConfig,
  portalName: string,
  type: string,
  filename: string,
) {
  let res1;
  try {
    res1 = await generateExport(portalConfig, type);
  } catch (err) {
    appLogger.error(`[${portalName}][${type}][holdingsIQ]: Cannot generate export`);
    throw err;
  }
  const { id } = res1;
  appLogger.info(`[${portalName}][${type}][holdingsIQ]: export ID [${id}]`);
  let res2;
  let status = '';
  let i = 0;
  while (status !== 'COMPLETED') {
    i += 1;
    // eslint-disable-next-line no-await-in-loop
    res2 = await getExportByID(portalConfig, id);
    status = res2.status;
    appLogger.verbose(`[${portalName}][${type}][holdingsIQ]: ${i} try`);
    appLogger.verbose(`[${portalName}][${type}][holdingsIQ]: status of export: [${res2.status}]`);
    if (status !== 'COMPLETED') {
      // eslint-disable-next-line no-await-in-loop
      await setTimeout(10000);
    }
    // TODO if status !== COMPLETED and QUEUE, and 10 minutes : exit
  }
  const downloadLink = res2.links[0].href;
  const filepath = resolve(holdingsIQDir, filename);
  if (!existsSync(resolve(filepath))) {
    try {
      await downloadFileFromAWS(portalName, downloadLink, filename);
    } catch (err) {
      appLogger.info(`[${portalName}][aws]: Cannot download file from aws]`);
      throw err;
    }
  }
  return id;
}

const inserters = {
  STANDARD: insertStandardFileInElastic,
  KBART2: insertKbart2FileInElastic,
};

// eslint-disable-next-line import/prefer-default-export
export async function downloadAndInsertFile(
  portalName: string,
  portalConfig: PortalConfig,
  forceDownload: boolean,
  date: string,
  type: keyof typeof inserters,
) {
  let id;

  const filename = `${portalName}-${date}-${type}.csv`;
  const index = `holdings-${date}`;

  const fileExists = forceDownload ? false : existsSync(resolve(holdingsIQDir, filename));
  if (!fileExists) {
    addStep(`portal:${portalName}`, '[holdingsIQ][download]', type);
    try {
      id = await generateAndDownloadExport(
        portalConfig,
        portalName,
        type,
        filename,
      );
    } catch (err) {
      fail(`[${portalName}][${type}][holdingsIQ]: Cannot generate and download export. ${err}`);
      throw err;
    }
    endLatestStep();
  } else {
    appLogger.info(`[${portalName}][${type}][holdingsIQ]: File [${filename}] already exists`);
  }

  const insertStep = addStep(`portal:${portalName}`, '[elastic][insert]', type);
  let lineUpserted;
  try {
    lineUpserted = await inserters[type](portalName, filename, index, date);
  } catch (err) {
    fail(`[${portalName}][${type}][elastic]: insert file in elastic. ${err}`);
    throw err;
  }
  insertStep.lineUpserted = lineUpserted;
  updateLatestStep(insertStep); // ? Maybe not useful as insertStep is a ref
  endLatestStep();

  if (!id) {
    return;
  }

  addStep(`portal:${portalName}`, '[holdingsIQ][delete]', type);
  try {
    await deleteExportByID(portalConfig, id);
  } catch (err) {
    appLogger.error(`[${portalName}][${type}][holdingsIQ]: Cannot delete export [${id}].`);
  }
  endLatestStep();
}
