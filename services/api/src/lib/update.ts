/* eslint-disable consistent-return */
/* eslint-disable no-await-in-loop */
import fs from 'fs';
import path from 'path';
import { format } from 'date-fns';
import { portals, paths } from 'config';
import { setTimeout } from 'node:timers/promises';
import { generateExport, getExportByID, deleteExportByID } from '~/lib/holdingsIQ/api';
import appLogger from '~/lib/logger/appLogger';
import downloadFileFromAWS from './aws';
import { insertStandardFileInElastic, insertKbart2FileInElastic } from '~/lib/holdingsIQ/insert';

async function generateAndDownloadExport(portalConfig, portalName, type, filename) {
  let res1;
  try {
    res1 = await generateExport(portalConfig, portalName, type);
  } catch (err) {
    appLogger.error(`[${portalName}][holdingsIQ]: Cannot generate [${type}] export`);
    return;
  }
  const { id } = res1;
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
    await downloadFileFromAWS(portalName, downloadLink, filename);
  }
  return id;
}

export default async function update() {
  const portalsName = Object.keys(portals);
  const date = format(new Date(), 'yyyy-MM-dd');

  for (let i = 0; i < portalsName.length; i += 1) {
    const portalName = portalsName[i];
    const portalConfig = portals[portalName];

    const standardFilename = `${portalName}-${date}-STANDARD.csv`;
    const standardId = await generateAndDownloadExport(portalConfig, portalName, 'STANDARD', standardFilename);
    await insertStandardFileInElastic(portalName, standardFilename);
    await deleteExportByID(portalConfig, standardId);

    const kbart2Filename = `${portalName}-${date}-KBART2.csv`;
    const kbart2Id = await generateAndDownloadExport(portalConfig, portalName, 'KBART2', kbart2Filename);
    await insertKbart2FileInElastic(portalName, kbart2Filename);
    await deleteExportByID(portalConfig, kbart2Id);
  }

  // TODO delete yesterday index
}
