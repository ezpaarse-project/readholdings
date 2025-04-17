/* eslint-disable no-await-in-loop */
import { getIndexSettings, refresh, scrollSearch } from '~/lib/elastic';
import { insertFirstOccurrenceInElastic } from '~/lib/holdingsIQ/insert';
import appLogger from '~/lib/logger/appLogger';

import type { Holding } from '~/models/holding';

type FirstOccurrenceUpdate = { id: string, firstOccurrence: boolean };

function createInsertQueue(indexName: string) {
  const queue: FirstOccurrenceUpdate[][] = [];
  const promises: Promise<number>[] = [];
  let current: Promise<number> | undefined;
  let updated = 0;

  const insertNext = async () => {
    const processing = queue.shift();
    if (!processing) {
      return;
    }

    promises.push(insertFirstOccurrenceInElastic(processing, indexName));
    updated += await promises.at(-1)!;
    insertNext();
  };

  return {
    push(toInsert: FirstOccurrenceUpdate[]) {
      queue.push(toInsert);
      if (!current) {
        insertNext();
      }
    },
    async flush() {
      await Promise.all(promises);
      return updated;
    },
  };
}

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
  const insertQueue = createInsertQueue(indexName);
  const foundHoldingIds = new Set<string>();

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

  const updatedLines = await insertQueue.flush();

  appLogger.info(`[elastic]: ${updatedLines} first occurrences updated`);

  appLogger.info(`[elastic]: refresh index [${indexName}] is started`);
  await refresh(indexName);
}
