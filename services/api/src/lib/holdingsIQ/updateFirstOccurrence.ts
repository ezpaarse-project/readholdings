/* eslint-disable no-await-in-loop */
import { getIndexSettings, refresh, scrollSearch } from '~/lib/elastic';
import { insertFirstOccurrenceInElastic } from '~/lib/holdingsIQ/insert';
import appLogger from '~/lib/logger/appLogger';
import createInMemoryQueue from '~/lib/queue';

import type { Holding } from '~/models/holding';

type FirstOccurrenceUpdate = { id: string, firstOccurrence: boolean };

export default async function updateFirstOccurrence(indexName: string) {
  let size = 10000; // Elasticsearch defaults
  // Try to use maximum possible size for scroll searches
  const { settings, defaults } = await getIndexSettings(indexName);
  if (defaults?.index?.max_result_window) {
    size = defaults.index.max_result_window;
    appLogger.info(`[elastic]: Default result window is ${size}`);
  }
  if (settings?.index?.max_result_window) {
    size = settings.index.max_result_window;
    appLogger.info(`[elastic]: Index result window is ${size}`);
  }

  appLogger.info(`[elastic]: Looking for first occurrences with size=${size}`);

  const documents = scrollSearch<Holding>(indexName, {
    size,
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

  let buffer: FirstOccurrenceUpdate[] = [];
  const foundHoldingIds = new Set<string>();

  const insertQueue = createInMemoryQueue<FirstOccurrenceUpdate[], number>(
    (data) => insertFirstOccurrenceInElastic(data, indexName),
  );

  let i = 0;
  // eslint-disable-next-line no-restricted-syntax
  for await (const document of documents) {
    i += 1;
    if (!document._source?.meta?.holdingID) {
      // eslint-disable-next-line no-continue
      continue;
    }
    const { holdingID } = document._source.meta;

    // Buffering
    buffer.push({ id: `${document._id}`, firstOccurrence: !foundHoldingIds.has(holdingID) });
    foundHoldingIds.add(holdingID);

    // Logging
    if (i % (size * 10) === 0) {
      appLogger.info(`[elastic]: ${foundHoldingIds.size} first occurrences found so far...`);
    }

    // Start update in elastic
    if (buffer.length >= 1000) {
      insertQueue.push([...buffer]);
      buffer = [];
    }
  }

  // Updating leftovers
  appLogger.info(`[elastic]: ${foundHoldingIds.size} first occurrences found so far...`);
  insertQueue.push(buffer);

  appLogger.info(`[elastic]: Waiting on ${insertQueue.size * 1000} updates...`);
  const updated = await insertQueue.flush();
  const updatedLines = updated.reduce((acc, curr) => acc + curr, 0);

  appLogger.info(`[elastic]: ${updatedLines} first occurrences updated`);

  appLogger.info(`[elastic]: refresh index [${indexName}] is started`);
  await refresh(indexName);
}
