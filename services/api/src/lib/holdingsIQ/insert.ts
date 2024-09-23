/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import { parse } from 'csv-parse';
import fs from 'fs';
import path from 'path';
import { paths } from 'config';
import { format } from 'date-fns';
import appLogger from '~/lib/logger/appLogger';
import { bulk, refresh, createIndex } from '~/lib/elastic';

import { transformStringToArray, transformEmbargo } from '~/lib/holdingsIQ/transform';

import holding from '~/../mapping/holding.json';

export async function insertStandardFileInElastic(portalName, filename) {
  const date = format(new Date(), 'yyyy-MM-dd');
  const index = `holdings-${date}`;

  try {
    await createIndex(index, holding);
  } catch (err) {
    appLogger.error(`[${portalName}][elastic]: Cannot create index [${index}]`);
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
    const standardRecord = {
      meta: {
        holdingID: `${portalName}-${record.VendorID}-${record.PackageID}-${record.KBID}`,
      },
      standard: {
        KBID: record.KBID,
        Title: record.Title,
        AlternateTitle: record.AlternateTitle,
        PackageName: record.PackageName,
        URL: record.URL,
        ProxiedURL: record.ProxiedURL,
        Publisher: record.Publisher,
        Edition: record.Edition,
        Author: record.Author,
        Editor: record.Editor,
        Illustrator: record.Illustrator,
        PrintISSN: record.PrintISSN,
        OnlineISSN: record.OnlineISSN,
        PrintISBN: record.PrintISBN,
        OnlineISBN: record.OnlineISBN,
        DOI: record.DOI,
        PeerReviewed: record.PeerReviewed,
        ManagedCoverageBegin: transformStringToArray(record.ManagedCoverageBegin),
        ManagedCoverageEnd: transformStringToArray(record.ManagedCoverageEnd),
        CustomCoverageBegin: transformStringToArray(record.CustomCoverageBegin),
        CustomCoverageEnd: transformStringToArray(record.CustomCoverageEnd),
        CoverageStatement: record.CoverageStatement,
        Embargo: transformEmbargo(record.Embargo),
        CustomEmbargo: transformEmbargo(record.CustomEmbargo),
        Description: record.Description,
        Subject: record.Subject,
        ResourceType: record.ResourceType,
        PackageContentType: record.PackageContentType,
        CreateCustom: record.CreateCustom,
        HideOnPublicationFinder: record.HideOnPublicationFinder,
        Delete: record.Delete,
        OrderedThroughEBSCO: record.OrderedThroughEBSCO,
        IsCustom: record.IsCustom,
        UserDefinedField1: record.UserDefinedField1,
        UserDefinedField2: record.UserDefinedField2,
        UserDefinedField3: record.UserDefinedField3,
        UserDefinedField4: record.UserDefinedField4,
        UserDefinedField5: record.UserDefinedField5,
        PackageType: record.PackageType,
        AllowEBSCOtoSelectNewTitles: record.AllowEBSCOtoSelectNewTitles,
        PackageID: record.PackageID,
        VendorName: record.VendorName,
        VendorID: record.VendorID,
        Absorbed: record.Absorbed,
        Continued: record.Continued,
        'Continued in part': record['Continued in part'],
        Merged: record.Merged,
        Split: record.Split,
        createdAt: date,
      },
    };

    records.push({ index: { _index: index, _id: standardRecord.meta.holdingID } });
    records.push(standardRecord);

    if (records.length === 1000 * 2) {
      const dataToInsert = records.slice();

      const res = await bulk(dataToInsert);
      lineUpserted += res.insertedDocs + res.updatedDocs;
      records = [];

      if (lineUpserted % 10000 === 0) {
        appLogger.info(`[${portalName}][elastic]: ${lineUpserted} lines upserted`);
      }
    }
  }
  if (records.length > 0) {
    const dataToInsert = records.slice();
    const res = await bulk(dataToInsert);
    lineUpserted += res.insertedDocs + res.updatedDocs;
    records = [];
    appLogger.info(`[${portalName}][elastic]: ${lineUpserted} lines upserted`);
  }
  appLogger.info(`[${portalName}][csv]: File [${filename}] is inserted`);

  appLogger.info(`[${portalName}][elastic]: Refresh index [${index}] is started`);
  await refresh(index);
}

export async function insertKbart2FileInElastic(portalName, filename) {
  const date = format(new Date(), 'yyyy-MM-dd');
  const index = `holdings-${date}`;

  try {
    await createIndex(index, holding);
  } catch (err) {
    appLogger.error(`[${portalName}][elastic]: Cannot create index [${index}]`);
    throw err;
  }

  const filePath = path.resolve(paths.data.holdingsIQDir, filename);
  const parser = fs.createReadStream(filePath).pipe(parse({
    columns: (header) => header.map((h) => h.trim()),
  }));
  appLogger.info(`[${portalName}][csv]: read [${filename}]`);

  let lineUpserted = 0;

  let records = [];

  for await (const record of parser) {
    const kbart2Record = {
      meta: {
        holdingID: `${portalName}-${record?.vendor_id}-${record?.package_id}-${record?.title_id}`,
      },
      kbart2: {
        package_id: record?.package_id,
        vendor_id: record?.vendor_id,
        title_id: record?.title_id,
        package_name: record?.package_name,
        vendor_name: record?.vendor_name,
        publication_title: record?.publication_title,
        access_type: record?.access_type,
        publication_type: record?.publication_type,
        resource_type: record?.resource_type,
        title_url: record?.title_url,
        first_author: record?.first_author,
        num_last_issue_online: record?.num_last_issue_online,
        num_last_vol_online: record?.num_last_vol_online,
        coverage_depth: record?.coverage_depth,
        num_first_issue_online: record?.num_first_issue_online,
        num_first_vol_online: record?.num_first_vol_online,
        date_first_issue_online: record?.date_first_issue_online || null,
        date_last_issue_online: record?.date_last_issue_online || null,
        embargo_info: record?.embargo_info,
        online_identifier: record?.online_identifier,
        print_identifier: record?.print_identifier,
      },
    };

    records.push({ index: { _index: index, _id: kbart2Record.meta.holdingID } });
    records.push(kbart2Record);

    if (records.length === 1000 * 2) {
      const dataToInsert = records.slice();

      const res = await bulk(dataToInsert);
      lineUpserted += res.insertedDocs + res.updatedDocs;
      records = [];

      if (lineUpserted % 10000 === 0) {
        appLogger.info(`[${portalName}][elastic]: ${lineUpserted} lines upserted`);
      }
    }
  }
  if (records.length > 0) {
    const dataToInsert = records.slice();
    const res = await bulk(dataToInsert);
    lineUpserted += res.insertedDocs + res.updatedDocs;
    records = [];
    appLogger.info(`[${portalName}][elastic]: ${lineUpserted} lines upserted`);
  }
  appLogger.info(`[${portalName}][csv]: File [${filename}] is inserted`);

  appLogger.info(`[${portalName}][elastic]: refresh index [${index}] is started`);
  await refresh(index);
}
