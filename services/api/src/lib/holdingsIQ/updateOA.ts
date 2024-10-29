/* eslint-disable no-await-in-loop */
import { getClient } from '~/lib/redis';
import { search, refresh } from '~/lib/elastic';
import { insertOAInElastic } from '~/lib/holdingsIQ/insert';
import appLogger from '~/lib/logger/appLogger';

export default async function updateOA(portalName, indexName) {
  const redisClient = getClient();
  const idsOpenAccess = await redisClient.keys('*');
  let packetOfIds = [];
  let updatedLines = 0;
  for (let i = 0; i < idsOpenAccess.length; i += 1) {
    packetOfIds.push(idsOpenAccess[i]);
    if (packetOfIds.length === 1000) {
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
      const result = await search(indexName, packetOfIds.length, body);
      const ids = result.map((res) => `${res.meta.BibCNRS}-${res.standard.VendorID}-${res.standard.PackageID}-${res.standard.KBID}`);
      updatedLines += await insertOAInElastic(portalName, ids, indexName);
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
  const result = await search(indexName, packetOfIds.length, body);
  const ids = result.map((res) => `${res.meta.BibCNRS}-${res.standard.VendorID}-${res.standard.PackageID}-${res.standard.KBID}`);
  updatedLines += await insertOAInElastic(portalName, ids, indexName);

  appLogger.info(`[${portalName}][elastic]: [${updatedLines}] has updated`);

  await redisClient.flushAll();
  appLogger.info(`[${portalName}][elastic]: refresh index [${indexName}] is started`);
  await refresh(indexName);
}
