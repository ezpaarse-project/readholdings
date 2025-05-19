/* eslint-disable no-await-in-loop */
import { getClient } from '~/lib/redis';
import { search, refresh } from '~/lib/elastic';
import { insertOAInElastic } from '~/lib/holdingsIQ/insert';
import appLogger from '~/lib/logger/appLogger';

import type { Holding } from '~/models/holding';

export default async function updateOA(portalName: string, indexName: string): Promise<number> {
  const redisClient = getClient();

  const oaKeys = await redisClient.keys('oa-*');
  const oaIDs = oaKeys.map((id) => id.split('-')[1]);

  let packetOfIds = [];
  let updatedLines = 0;
  // TODO 2025-04-14 put in config
  const length = 100;
  for (let i = 0; i < oaIDs.length; i += 1) {
    packetOfIds.push(oaIDs[i]);
    if (packetOfIds.length === length) {
      const body = {
        query: {
          bool: {
            must: [
              {
                terms: {
                  'standard.KBID': packetOfIds,
                },
              },
              {
                term: {
                  'meta.BibCNRS': portalName,
                },
              },
            ],
          },
        },
      };
      const result = await search<Holding>(indexName, length * 11, body);
      const ids = result.filter((res) => !!res)
        .map((res) => `${res.meta.BibCNRS}-${res.standard.VendorID}-${res.standard.PackageID}-${res.standard.KBID}`);
      updatedLines += await insertOAInElastic(ids, indexName);
      appLogger.info(`[${portalName}][elastic]: ${updatedLines} oa updated`);
      packetOfIds = [];
    }
  }

  const body = {
    query: {
      bool: {
        must: [
          {
            terms: {
              'standard.KBID': packetOfIds,
            },
          },
          {
            term: {
              'meta.BibCNRS': portalName,
            },
          },
        ],
      },
    },
  };
  const result = await search<Holding>(indexName, packetOfIds.length, body);
  const ids = result.filter((res) => !!res)
    .map((res) => `${res.meta.BibCNRS}-${res.standard.VendorID}-${res.standard.PackageID}-${res.standard.KBID}`);
  updatedLines += await insertOAInElastic(ids, indexName);

  appLogger.info(`[${portalName}][elastic]: ${updatedLines} oa has updated`);

  appLogger.info(`[${portalName}][elastic]: refresh index [${indexName}] is started`);
  await refresh(indexName);

  await redisClient.del(oaKeys);

  return updatedLines;
}
