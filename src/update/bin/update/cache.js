const logger = require('../../lib/logger');

const createModelHoldings = require('../../lib/sequelize/model');
const { parseCacheForElastic, parseGetVendorsPackagesTitles, parseGetVendorsPackages } = require('./parser');

const holdingsAPI = require('../../lib/service/holdings');
const database = require('../../lib/service/database');
const elastic = require('../../lib/service/elastic');

async function updateCache(custid, customerName, apikey, step) {
  const CacheModel = await createModelHoldings(`${customerName}-caches`);

  let ids = await database.selectAll(CacheModel);
  ids = ids.map((e) => e.rhID);

  step.nbLine = ids.length;

  let holdings1;
  let vendorIDCache;
  let packageIDCache;

  logger.info(`${customerName}: ${ids.length} lines from cache-holdings`);

  for (let i = 0; i < ids.length; i += 1) {
    const rhID = ids[i];

    const [, vendorID, packageID, kbID] = rhID.split('-');

    if (vendorID !== vendorIDCache || packageID !== packageIDCache) {
      holdings1 = await holdingsAPI
        .getVendorsPackages(custid, apikey, vendorID, packageID);

      step.nbRequest += holdings1.nbRequest;

      holdings1 = parseGetVendorsPackages(holdings1.data);
      holdings1.rhID = rhID;

      vendorIDCache = vendorID;
      packageIDCache = packageID;
    }
    await database.upsert(CacheModel, holdings1);

    let holdings2 = await holdingsAPI
      .getVendorsPackagesTitles(custid, apikey, vendorID, packageID, kbID);

    step.nbRequest += holdings2.nbRequest;

    holdings2 = parseGetVendorsPackagesTitles(holdings2.data);
    holdings2.rhID = rhID;

    await database.upsert(CacheModel, holdings2);
  }

  step.endAt = new Date();
  step.status = 'success';

  logger.info(`[${customerName}-caches] is enriched`);

  return step;
}

async function mergeCache(customerName, index, step) {
  const CacheModel = await createModelHoldings(`${customerName}-caches`);

  let insertedLines = 0;
  let updatedLines = 0;

  const readHoldingsLength = await database.count(CacheModel);

  const size = 2000;

  const pages = Math.ceil(readHoldingsLength / size);

  for (let currentPage = 0; currentPage < pages; currentPage += 1) {
    let holdings = await database.selectByPage(CacheModel, size, size * currentPage);
    holdings = parseCacheForElastic(holdings, index);
    let res;
    try {
      res = await elastic.bulk(holdings);
    } catch (err) {
      logger.err(err);
      throw err;
    }
    insertedLines += res.insertedDocs;
    updatedLines += res.updatedDocs;
  }

  await elastic.refresh(index);

  step.endAt = new Date();
  step.insertedLines = insertedLines;
  step.updatedLines = updatedLines;
  step.status = 'success';

  logger.info(`[${customerName}-caches] is merged on elastic`);

  return step;
}

module.exports = {
  updateCache,
  mergeCache,
};
