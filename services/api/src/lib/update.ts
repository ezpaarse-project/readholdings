/* eslint-disable consistent-return */
/* eslint-disable no-await-in-loop */
import fs from 'fs';
import path from 'path';
import { format, getYear } from 'date-fns';
import { setTimeout } from 'node:timers/promises';
import { generateExport, getExportByID } from '~/lib/holdingsIQ/api';
import appLogger from '~/lib/logger/appLogger';
import { sendErrorMail } from '~/lib/mail';
import { setWorkInProgress } from '~/lib/status';
import { config } from '~/lib/config';
import { getReadHoldingsIndices, createIndex, removeIndex } from '~/lib/elastic';

import { getClient } from '~/lib/redis';

import updateOA from '~/lib/holdingsIQ/updateOA';
import updatePortals from '~/lib/holdingsIQ/updatePortal';
import updateFirstOccurrence from '~/lib/holdingsIQ/updateFirstOccurrence';

import holding from '~/../mapping/holding.json';
import { createReport } from './report';
import type { Portals, PortalConfig } from './portals';
import downloadFileFromAWS from './aws';
import { downloadAndInsertFile } from './download';
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
} from './state';

const { portals, paths } = config;

export async function generateAndDownloadExport(
  portalConfig: PortalConfig,
  portalName: string,
  type: string,
  filename: string,
) {
  let res1;
  try {
    res1 = await generateExport(portalConfig, type);
  } catch (err) {
    appLogger.error(`[${portalName}][${type}][holdingsIQ]: Cannot generate [${type}] export`);
    throw err;
  }
  const { id } = res1;
  appLogger.info(`[${portalName}][${type}][holdingsIQ]: export ID [${id}]`);
  let res2;
  let status = '';
  let i = 0;
  while (status !== 'COMPLETED') {
    i += 1;
    res2 = await getExportByID(portalConfig, id);
    status = res2.status;
    appLogger.verbose(`[${portalName}][${type}][holdingsIQ]: ${i} try`);
    appLogger.verbose(`[${portalName}][${type}][holdingsIQ]: status of export: [${res2.status}]`);
    if (status !== 'COMPLETED') {
      await setTimeout(10000);
    }
    // TODO if status !== COMPLETED and QUEUE, and 10 minutes : exit
  }
  const downloadLink = res2.links[0].href;
  const filepath = path.resolve(paths.data.holdingsIQDir, filename);
  if (!fs.existsSync(path.resolve(filepath))) {
    try {
      await downloadFileFromAWS(portalName, downloadLink, filename);
    } catch (err) {
      appLogger.info(`[${portalName}][${type}][aws]: Cannot download file from aws`);
      throw err;
    }
  }
  return id;
}

export function fail(message: string) {
  appLogger.error(message);
  failLatestStep(message);
  setWorkInProgress(false);
  const state = getState();
  sendErrorMail(message, state);
}

// TODO comment
export default async function update(portal?: keyof Portals, forceDownload = false) {
  setWorkInProgress(true);

  const redisClient = getClient();
  await redisClient.flushall();

  resetState();

  let localPortals: Partial<Portals> = JSON.parse(JSON.stringify(portals));
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
    try {
      await downloadAndInsertFile(portalName, portalConfig, forceDownload, date, 'STANDARD');
    } catch {
      return;
    }

    try {
      await downloadAndInsertFile(portalName, portalConfig, forceDownload, date, 'KBART2');
    } catch {
      return;
    }

    // #region Update OA
    const accessTypeStep = addStep(portalName, '[elastic][insert][access_type]', 'KBART2');
    let lineUpserted;
    try {
      lineUpserted = await updateOA(portalName, index);
    } catch (err) {
      appLogger.error(`[${portalName}][oa][holdingsIQ]: Cannot update OA`);
    }
    accessTypeStep.lineUpserted = lineUpserted;
    updateLatestStep(accessTypeStep); // ? Maybe not useful as insertStep is a ref
    endLatestStep();
    // #endregion Update OA
  }

  try {
    await updatePortals(index);
  } catch (err) {
    appLogger.error('[holdingsIQ]: Cannot update portals');
  }

  try {
    await updateFirstOccurrence(index);
  } catch (err) {
    appLogger.error('[holdingsIQ]: Cannot update first occurrence');
  }

  await redisClient.flushAll();

  end();

  setWorkInProgress(false);

  appLogger.info('[holdingsIQ]: Data update is done.');

  const actualYear = getYear(date).toString();

  const indices = await getReadHoldingsIndices();
  const currentIndexInfo = indices.find((item) => item.index === index);
  // remove current index and old year index
  const indexNames = indices
    .map((item) => item.index ?? '')
    .filter((indexName) => indexName !== index && indexName.includes(actualYear));

  // eslint-disable-next-line no-restricted-syntax
  for (const indexName of indexNames) {
    await removeIndex(indexName);
  }

  state = getState();
  if (currentIndexInfo?.['docs.count']) {
    state.documents = Number.parseInt(currentIndexInfo['docs.count'], 10);
  }
  setState(state);

  await createReport(state);
}
