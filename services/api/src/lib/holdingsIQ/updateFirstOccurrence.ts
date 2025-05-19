/* eslint-disable no-await-in-loop */
import { getIndexSettings, refresh, scrollSearch } from '~/lib/elastic';
import { insertFirstOccurrenceInElastic } from '~/lib/holdingsIQ/insert';
import appLogger from '~/lib/logger/appLogger';

import type { Holding } from '~/models/holding';

export default async function updateFirstOccurrence(indexName: string) {
  const insertSize = 1000;

  let searchSize = 10000; // Elasticsearch defaults
  // Try to use maximum possible size for scroll searches
  const { settings, defaults } = await getIndexSettings(indexName);
  if (defaults?.index?.max_result_window) {
    searchSize = defaults.index.max_result_window;
    appLogger.info(`[elastic]: Default result window is ${searchSize}`);
  }
  if (settings?.index?.max_result_window) {
    searchSize = settings.index.max_result_window;
    appLogger.info(`[elastic]: Index result window is ${searchSize}`);
  }

  appLogger.info(`[elastic]: Looking for first occurrences with size=${searchSize}`);

  const documents = scrollSearch<Holding>(indexName, {
    size: searchSize,
    _source: ['meta.holdingID'],
    sort: [
      {
        'kbart2.vendor_id': {
          order: 'asc',
        },
      },
      {
        'kbart2.package_id': {
          order: 'asc',
        },
      },
    ],
  });

  let buffer: string[] = [];
  const foundHoldingIds = new Set<string>();

  let i = 0;
  let updatedLines = 0;
  // eslint-disable-next-line no-restricted-syntax
  for await (const document of documents) {
    i += 1;
    if (!document._source?.meta?.holdingID) {
      // eslint-disable-next-line no-continue
      continue;
    }
    const { _id: id, _source: source } = document;
    const { holdingID } = source.meta;

    // Buffering
    if (!foundHoldingIds.has(holdingID)) {
      buffer.push(`${id}`);
      foundHoldingIds.add(holdingID);
    }

    // Logging
    if (i % (searchSize * 10) === 0) {
      appLogger.info(`[elastic]: ${foundHoldingIds.size} first occurrences found so far...`);
    }

    // Start update in elastic
    if (buffer.length >= insertSize) {
      appLogger.info(`[elastic]: Updating first occurrences with size=${insertSize}`);
      updatedLines += await insertFirstOccurrenceInElastic(buffer, indexName);
      buffer = [];
    }
  }

  // Updating leftovers
  appLogger.info(`[elastic]: ${foundHoldingIds.size} first occurrences found so far...`);
  if (buffer.length > 0) {
    appLogger.info(`[elastic]: Updating first occurrences with size=${buffer.length}`);
    updatedLines += await insertFirstOccurrenceInElastic(buffer, indexName);
  }

  appLogger.info(`[elastic]: ${updatedLines} first occurrences updated`);

  appLogger.info(`[elastic]: refresh index [${indexName}] is started`);
  await refresh(indexName);
}
