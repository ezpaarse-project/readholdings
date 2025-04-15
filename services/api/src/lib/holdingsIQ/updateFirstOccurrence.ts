/* eslint-disable no-await-in-loop */
import { refresh, scrollSearch } from '~/lib/elastic';
import { insertFirstOccurrenceInElastic } from '~/lib/holdingsIQ/insert';
import appLogger from '~/lib/logger/appLogger';

import type { Holding } from '~/models/holding';

export default async function updateFirstOccurrence(indexName: string) {
  const documents = scrollSearch<Holding>(indexName, {
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

  const idsPerHoldingId = new Map<string, string[]>();

  // eslint-disable-next-line no-restricted-syntax
  for await (const document of documents) {
    if (!document._source?.meta?.holdingID) {
      // eslint-disable-next-line no-continue
      continue;
    }
    const { holdingID } = document._source.meta;

    const idsForHoldingId = idsPerHoldingId.get(holdingID) ?? [];
    idsForHoldingId.push(`${document._id}`);
    idsPerHoldingId.set(holdingID, idsForHoldingId);
  }

  const updatedLines = await insertFirstOccurrenceInElastic(idsPerHoldingId, indexName);
  appLogger.info(`[elastic]: ${updatedLines} first occurrence updated`);

  appLogger.info(`[elastic]: refresh index [${indexName}] is started`);
  await refresh(indexName);
}
