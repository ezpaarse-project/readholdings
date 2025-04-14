/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import { parse } from 'csv-parse';
import fs from 'fs';
import path from 'path';
import { paths } from 'config';
import appLogger from '~/lib/logger/appLogger';
import { bulk, updateBulk, refresh } from '~/lib/elastic';
import { getClient } from '~/lib/redis';

import {
  transformCoverage,
  transformStringToArray,
  transformEmbargo,
} from '~/lib/holdingsIQ/transform';

export async function insertStandardFileInElastic(portalName, filename, index, date) {
  const redisClient = getClient();
  const filePath = path.resolve(paths.data.holdingsIQDir, filename);
  const parser = fs.createReadStream(filePath).pipe(parse({
    columns: (header) => header.map((h) => h.trim()),
  }));
  appLogger.info(`[${portalName}][standard][csv]: read [${filename}]`);

  let lineUpserted = 0;

  let records = [];

  for await (const record of parser) {
    const standardRecord = {
      meta: {
        BibCNRS: portalName,
        createdAt: date,
        EmbargoMonth: transformEmbargo(record?.Embargo) || null,
        CustomEmbargoMonth: transformEmbargo(record?.CustomEmbargo) || null,
        ManagedCoverageBegin: transformCoverage(record?.ManagedCoverageBegin) || null,
        ManagedCoverageEnd: transformCoverage(record?.ManagedCoverageEnd) || null,
        CustomCoverageBegin: transformCoverage(record?.CustomCoverageBegin) || null,
        CustomCoverageEnd: transformCoverage(record?.CustomCoverageEnd) || null,
      },
      standard: {
        KBID: record?.KBID || null,
        Title: record?.Title || null,
        AlternateTitle: record?.AlternateTitle || null,
        PackageName: record?.PackageName || null,
        URL: record?.URL || null,
        ProxiedURL: record?.ProxiedURL || null,
        Publisher: record?.Publisher || null,
        Edition: record?.Edition || null,
        Author: record?.Author || null,
        Editor: record?.Editor || null,
        Illustrator: record?.Illustrator || null,
        PrintISSN: record?.PrintISSN || null,
        OnlineISSN: record?.OnlineISSN || null,
        PrintISBN: record?.PrintISBN || null,
        OnlineISBN: record?.OnlineISBN || null,
        DOI: record?.DOI || null,
        PeerReviewed: record?.PeerReviewed || null,
        ManagedCoverageBegin: transformStringToArray(record?.ManagedCoverageBegin) || null,
        ManagedCoverageEnd: transformStringToArray(record?.ManagedCoverageEnd) || null,
        CustomCoverageBegin: transformStringToArray(record?.CustomCoverageBegin) || null,
        CustomCoverageEnd: transformStringToArray(record?.CustomCoverageEnd) || null,
        CoverageStatement: record?.CoverageStatement || null,
        Embargo: record?.Embargo || null,
        CustomEmbargo: record?.CustomEmbargo || null,
        Description: record?.Description || null,
        Subject: transformStringToArray(record?.Subject) || null,
        ResourceType: record?.ResourceType || null,
        PackageContentType: record?.PackageContentType || null,
        CreateCustom: record?.CreateCustom || null,
        HideOnPublicationFinder: record?.HideOnPublicationFinder || null,
        Delete: record?.Delete || null,
        OrderedThroughEBSCO: record?.OrderedThroughEBSCO || null,
        IsCustom: record?.IsCustom || null,
        UserDefinedField1: record?.UserDefinedField1 || null,
        UserDefinedField2: record?.UserDefinedField2 || null,
        UserDefinedField3: record?.UserDefinedField3 || null,
        UserDefinedField4: record?.UserDefinedField4 || null,
        UserDefinedField5: record?.UserDefinedField5 || null,
        PackageType: record?.PackageType || null,
        AllowEBSCOtoSelectNewTitles: record?.AllowEBSCOtoSelectNewTitles || null,
        PackageID: record?.PackageID || null,
        VendorName: record?.VendorName || null,
        VendorID: record?.VendorID || null,
        Absorbed: record?.Absorbed || null,
        Continued: record?.Continued || null,
        'Continued in part': record['Continued in part'] || null,
        Merged: record?.Merged || null,
        Split: record?.Split || null,
      },
    };

    if (/DOAJ|DOAB/.test(record.PackageName)) {
      await redisClient.set(`oa-${record.KBID}`, '1');
    }

    records.push({ index: { _index: index, _id: `${portalName}-${record.VendorID}-${record.PackageID}-${record.KBID}` } });
    records.push(standardRecord);

    if (records.length === 1000 * 2) {
      const dataToInsert = records.slice();
      const res = await bulk(dataToInsert);
      lineUpserted += res.insertedDocs + res.updatedDocs;
      records = [];

      if (lineUpserted % 10000 === 0) {
        appLogger.info(`[${portalName}][standard][elastic]: ${lineUpserted} lines upserted`);
      }
    }
  }
  if (records.length > 0) {
    const dataToInsert = records.slice();
    const res = await bulk(dataToInsert);
    lineUpserted += res.insertedDocs + res.updatedDocs;
    records = [];
    appLogger.info(`[${portalName}][standard][elastic]: ${lineUpserted} lines upserted`);
  }
  appLogger.info(`[${portalName}][standard][csv]: File [${filename}] is inserted`);

  appLogger.info(`[${portalName}][standard][elastic]: Refresh index [${index}] is started`);
  await refresh(index);
  return lineUpserted;
}

export async function insertKbart2FileInElastic(portalName, filename, index) {
  const redisClient = getClient();

  const filePath = path.resolve(paths.data.holdingsIQDir, filename);
  const parser = fs.createReadStream(filePath).pipe(parse({
    columns: (header) => header.map((h) => h.trim()),
  }));
  appLogger.info(`[${portalName}][kbart2][csv]: read [${filename}]`);

  let lineUpdate = 0;

  let records = [];

  for await (const record of parser) {
    const holdingID = `${portalName}-${record?.vendor_id}-${record?.package_id}-${record?.title_id}`;
    const kbart2Record = {
      meta: {
        access_type: 'P',
        holdingID: `${record?.vendor_id}_${record?.package_id}_${record?.title_id}_${record.date_first_issue_online}_${record.date_last_issue_online}_${record.embargo_info}`,
        IN2P3: false,
        INC: false,
        INEE: false,
        INP: false,
        INS2I: false,
        INSB: false,
        INSHS: false,
        INSIS: false,
        INSMI: false,
        INSU: false,
        INTEST: false,
      },
      kbart2: {
        publication_title: record?.publication_title || null,
        print_identifier: record?.print_identifier || null,
        online_identifier: record?.online_identifier || null,
        date_first_issue_online: record?.date_first_issue_online || null,
        num_first_vol_online: record?.num_first_vol_online || null,
        num_first_issue_online: record?.num_first_issue_online || null,
        date_last_issue_online: record?.date_last_issue_online || null,
        num_last_vol_online: record?.num_last_vol_online || null,
        num_last_issue_online: record?.num_last_issue_online || null,
        title_url: record?.title_url || null,
        first_author: record?.first_author || null,
        title_id: record?.title_id || null,
        embargo_info: record?.embargo_info || null,
        coverage_depth: record?.coverage_depth || null,
        notes: record?.notes || null,
        publisher_name: record?.publisher_name || null,
        publication_type: record?.publication_type || null,
        date_monograph_published_print: record?.date_monograph_published_print || null,
        date_monograph_published_online: record?.date_monograph_published_online || null,
        monograph_volume: record?.monograph_volume || null,
        monograph_edition: record?.monograph_edition || null,
        first_editor: record?.first_editor || null,
        parent_publication_title_id: record?.parent_publication_title_id || null,
        preceeding_publication_title_id: record?.preceeding_publication_title_id || null,
        access_type: record?.access_type || null,
        package_name: record?.package_name || null,
        package_id: record?.package_id || null,
        vendor_name: record?.vendor_name || null,
        vendor_id: record?.vendor_id || null,
        resource_type: record?.resource_type || null,
        package_content_type: record?.package_content_type || null,
        proxied_url: record?.proxied_url || null,
      },
    };

    records.push({ update: { _index: index, _id: holdingID } });
    records.push({ doc: kbart2Record, doc_as_upsert: true });

    await redisClient.set(`holdingID_${kbart2Record.meta.holdingID}`, 1);

    if (records.length === 1000 * 2) {
      const dataToInsert = records.slice();
      const updatedDocs = await updateBulk(dataToInsert);
      lineUpdate += updatedDocs;
      records = [];

      if (lineUpdate % 10000 === 0) {
        appLogger.info(`[${portalName}][kbart2][elastic]: ${lineUpdate} lines updated`);
      }
    }
  }
  if (records.length > 0) {
    const dataToInsert = records.slice();
    const updatedDocs = await updateBulk(dataToInsert);
    lineUpdate += updatedDocs;
    records = [];
    appLogger.info(`[${portalName}][kbart2][elastic]: ${lineUpdate} lines updated`);
  }
  appLogger.info(`[${portalName}][kbart2][csv]: File [${filename}] is inserted`);

  appLogger.info(`[${portalName}][kbart2][elastic]: refresh index [${index}] is started`);
  await refresh(index);
}

export async function insertOAInElastic(ids, indexName) {
  const records = [];

  for (let i = 0; i < ids.length; i += 1) {
    const id = ids[i];
    const record = {
      meta: {
        access_type: 'F',
      },
    };

    records.push({ update: { _index: indexName, _id: id } });
    records.push({ doc: record, doc_as_upsert: true });
  }
  const dataToInsert = records.slice();
  const updatedDocs = await updateBulk(dataToInsert);
  return updatedDocs;
}

export async function insertPortalsInElastic(holdingIDs, result, indexName) {
  const records = [];

  for (let i = 0; i < holdingIDs.length; i += 1) {
    const holdingID = holdingIDs[i];

    const dataHasHoldingID = result.filter((res) => res.meta.holdingID === holdingID);
    const portals = dataHasHoldingID.map((res) => res.meta.BibCNRS);

    dataHasHoldingID.forEach((res) => {
      const id = `${res.meta.BibCNRS}-${res.standard.VendorID}-${res.standard.PackageID}-${res.standard.KBID}`;
      const record = { meta: { } };
      portals.forEach((portal) => {
        record.meta[portal] = true;
      });
      records.push({ update: { _index: indexName, _id: id } });
      records.push({ doc: record, doc_as_upsert: true });
    });
  }

  const dataToInsert = records.slice();
  const updatedDocs = await updateBulk(dataToInsert);
  return updatedDocs;
}
