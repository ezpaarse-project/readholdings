/* eslint-disable no-await-in-loop */
import { getClient } from '~/lib/redis';
import { search, refresh } from '~/lib/elastic';
import { insertPortalsInElastic } from '~/lib/holdingsIQ/insert';
import appLogger from '~/lib/logger/appLogger';

import type { Holding } from '~/models/holding';

export default async function updatePortals(indexName: string) {
  const redisClient = getClient();

  const holdingsID = (
    await redisClient.keys('holdingID_*')
  ).map((id) => id.split('holdingID_')[1]);

  let packetOfIds = [];
  let updatedLines = 0;
  for (let i = 0; i < holdingsID.length; i += 1) {
    packetOfIds.push(holdingsID[i]);
    if (packetOfIds.length === 100) {
      const body = {
        query: {
          bool: {
            must: [
              {
                terms: {
                  'meta.holdingID': packetOfIds,
                },
              },
            ],
          },
        },
      };

      const result = (await search<Holding>(indexName, 1000, body)).filter((res) => !!res);
      updatedLines += await insertPortalsInElastic(packetOfIds, result, indexName);
      appLogger.info(`[elastic]: ${updatedLines} portals updated`);
      packetOfIds = [];
    }
  }

  const body = {
    query: {
      bool: {
        must: [
          {
            terms: {
              'meta.holdingID': packetOfIds,
            },
          },
        ],
      },
    },
  };

  const result = (await search<Holding>(indexName, 1000, body)).filter((res) => !!res);
  updatedLines += await insertPortalsInElastic(packetOfIds, result, indexName);
  appLogger.info(`[elastic]: ${updatedLines} portals updated`);
  packetOfIds = [];

  appLogger.info(`[elastic]: refresh index [${indexName}] is started`);
  await refresh(indexName);
}
