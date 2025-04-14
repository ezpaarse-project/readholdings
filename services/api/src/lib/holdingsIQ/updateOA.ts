/* eslint-disable no-await-in-loop */
import { getClient } from '~/lib/redis';
import { search, refresh } from '~/lib/elastic';
import { insertOAInElastic } from '~/lib/holdingsIQ/insert';
import appLogger from '~/lib/logger/appLogger';

export default async function updateOA(portalName, indexName) {
  const redisClient = getClient();
  const allID = await redisClient.keys('*');
  const oaID = allID.filter((id) => id.includes('oa'));
  const oaIDFiltered = oaID.map((id) => {
    const [, idFiltered] = id.split('-');
    return idFiltered;
  });
  let packetOfIds = [];
  let updatedLines = 0;
  // TODO 2025-04-14 put in config
  const length = 100;
  for (let i = 0; i < oaIDFiltered.length; i += 1) {
    packetOfIds.push(oaIDFiltered[i]);
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
      const result = await search(indexName, length * 11, body);
      const ids = result.map((res) => `${res.meta.BibCNRS}-${res.standard.VendorID}-${res.standard.PackageID}-${res.standard.KBID}`);
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
  const result = await search(indexName, packetOfIds.length, body);
  const ids = result.map((res) => `${res.meta.BibCNRS}-${res.standard.VendorID}-${res.standard.PackageID}-${res.standard.KBID}`);
  updatedLines += await insertOAInElastic(ids, indexName);

  appLogger.info(`[${portalName}][elastic]: ${updatedLines} oa has updated`);

  appLogger.info(`[${portalName}][elastic]: refresh index [${indexName}] is started`);
  await refresh(indexName);

  await redisClient.del(oaID);
}
