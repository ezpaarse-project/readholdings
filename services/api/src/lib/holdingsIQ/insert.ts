/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import { parse } from 'csv-parse';
import fs from 'fs';
import path from 'path';
import { paths } from 'config';
import { format } from 'date-fns';
import appLogger from '~/lib/logger/appLogger';
import { bulk, refresh, createIndex } from '~/lib/elastic';

import { transformStringToArray, transformEmbargo, transformGetHoldings } from '~/lib/holdingsIQ/transform';

import holding from '~/../mapping/holding.json';

export async function insertStandardFileInElastic(portalName, filename) {
  const date = format(new Date(), 'yyyy-MM-dd');
  const index = `holdings-${date}`;

  try {
    await createIndex(index, holding);
  } catch (err) {
    appLogger.error(`[elastic]: Cannot create index [${index}]`);
    throw err;
  }

  const filePath = path.resolve(paths.data.holdingsIQDir, filename);
  const parser = fs.createReadStream(filePath).pipe(parse({
    columns: (header) => header.map((h) => h.trim()),
  }));
  appLogger.info(`[csv]: read [${filename}]`);

  let lineUpserted = 0;

  let records = [];

  for await (const record of parser) {
    record.ManagedCoverageBegin = transformStringToArray(record.ManagedCoverageBegin);
    record.ManagedCoverageEnd = transformStringToArray(record.ManagedCoverageEnd);
    record.CustomCoverageBegin = transformStringToArray(record.CustomCoverageBegin);
    record.CustomCoverageEnd = transformStringToArray(record.CustomCoverageEnd);
    record.Embargo = transformEmbargo(record.Embargo);
    record.CustomEmbargo = transformEmbargo(record.CustomEmbargo);
    record.createdAt = date;
    record.holdingID = `${portalName}-${record.VendorID}-${record.PackageID}-${record.KBID}`;

    records.push({ index: { _index: index, _id: record.holdingID } });
    records.push(record);

    if (records.length === 1000 * 2) {
      const dataToInsert = records.slice();

      const res = await bulk(dataToInsert);
      lineUpserted += res.insertedDocs + res.updatedDocs;
      records = [];

      if (lineUpserted % 10000 === 0) {
        appLogger.info(`[elastic]: ${lineUpserted} lines upserted`);
      }
    }
  }
  if (records.length > 0) {
    const dataToInsert = records.slice();
    const res = await bulk(dataToInsert);
    lineUpserted += res.insertedDocs + res.updatedDocs;
    records = [];
    appLogger.info(`[elastic]: ${lineUpserted} lines upserted`);
  }
  appLogger.info(`[csv]: File [${filename}] is inserted`);

  appLogger.info(`[elastic]: refresh index [${index}] is started`);
  await refresh(index);
}

export async function insertKbart2FileInElastic(portalName, filename) {
  const date = format(new Date(), 'yyyy-MM-dd');
  const index = `holdings-${date}`;

  try {
    await createIndex(index, holding);
  } catch (err) {
    appLogger.error(`[elastic]: Cannot create index [${index}]`);
    throw err;
  }

  const filePath = path.resolve(paths.data.holdingsIQDir, filename);
  const parser = fs.createReadStream(filePath).pipe(parse({
    columns: (header) => header.map((h) => h.trim()),
  }));
  appLogger.info(`[csv]: read [${filename}]`);

  let lineUpserted = 0;

  let records = [];

  for await (const record of parser) {
    const recordTransformed = transformGetHoldings(record, portalName);

    records.push({ index: { _index: index, _id: record.holdingID } });
    records.push(recordTransformed);

    if (records.length === 1000 * 2) {
      const dataToInsert = records.slice();

      const res = await bulk(dataToInsert);
      lineUpserted += res.insertedDocs + res.updatedDocs;
      records = [];

      if (lineUpserted % 10000 === 0) {
        appLogger.info(`[elastic]: ${lineUpserted} lines upserted`);
      }
    }
  }
  if (records.length > 0) {
    const dataToInsert = records.slice();
    const res = await bulk(dataToInsert);
    lineUpserted += res.insertedDocs + res.updatedDocs;
    records = [];
    appLogger.info(`[elastic]: ${lineUpserted} lines upserted`);
  }
  appLogger.info(`[csv]: File [${filename}] is inserted`);

  appLogger.info(`[elastic]: refresh index [${index}] is started`);
  await refresh(index);
}
