/* eslint-disable no-restricted-syntax */

const database = require('../../lib/service/database');
const holdingsAPI = require('../../lib/service/holdings');

const { parseGetHoldings } = require('./parser');

const createModelHoldings = require('../../lib/sequelize/model');

const logger = require('../../lib/logger');

const { args } = require('../utils');

/**
 * @param {String} index Index where the values will be inserted
 */
async function getSnapshotForDatabase(name, custid, apikey) {
  const HoldingsModel = await createModelHoldings('saveholdings');

  let request = 0;
  let insertedLines = 0;

  const res = await holdingsAPI.getHoldingsStatus(custid, apikey);
  const { totalCount } = res.data;
  request += res.nbRequest;
  const size = 4000;
  const page = Math.ceil(totalCount / size);
  logger.info(`${name}: ${totalCount} lines from holdings`);
  logger.info(`Need ${page} request to Holdings API`);
  let holdings;
  let i = 1;

  do {
    holdings = await holdingsAPI.getHoldings(custid, apikey, size, i);
    request += holdings.nbRequest;
    holdings = parseGetHoldings(holdings.data, name);
    let sizeBulk;
    try {
      sizeBulk = await database.bulk(HoldingsModel, holdings);
    } catch (err) {
      logger.error(err);
    }

    insertedLines += sizeBulk;
    logger.info(`API call ${i}/${page}: ${i * holdings.length}/${totalCount} lines inserted`);
    i += 1;
  } while (holdings?.length >= size);

  return {
    request,
    insertedLines,
  };
}

async function getSnapshotAndSaveCacheInDatabase(customerName, custid, apikey, step) {
  const HoldingsModel = await createModelHoldings(`${customerName}-holdings`);
  const saveholdingsModel = await createModelHoldings(`${customerName}-saveholdings`);
  const CacheModel = await createModelHoldings(`${customerName}-caches`);

  let nbRequest = 0;
  let insertedLines = 0;

  const res = await holdingsAPI.getHoldingsStatus(custid, apikey);
  const { totalCount } = res.data;
  nbRequest += res.nbRequest;
  const size = 4000;
  const nbPage = Math.ceil(totalCount / size);

  logger.info(`${customerName}: ${totalCount} lines from holdings`);
  logger.info(`Need ${nbPage} requests to Holdings API`);

  let holdings;
  let nbCacheLine = 0;

  for (let currentPage = 1; currentPage < nbPage; currentPage += 1) {
    holdings = await holdingsAPI.getHoldings(custid, apikey, size, currentPage);
    nbRequest += holdings.nbRequest;
    holdings = parseGetHoldings(holdings.data, customerName);
    let sizeBulk;
    try {
      sizeBulk = await database.bulk(HoldingsModel, holdings);
    } catch (err) {
      logger.error(err);
      throw err;
    }

    insertedLines += sizeBulk;
    logger.info(`API call ${currentPage}/${nbPage}: ${currentPage * size}/${totalCount} lines inserted`);

    for (let j = 0; j < holdings.length; j += 1) {
      const holding = holdings[j];
      const oldHolding = await database.selecByID(saveholdingsModel, holding.rhID);

      if (oldHolding) {
        for (const arg of args) {
          const value = holding?.[arg];
          const oldValue = oldHolding?.[arg];

          if (value !== oldValue) {
            console.log(arg);
            console.log('EBSCO: ', value);
            console.log('POSTGRES: ', oldValue);

            nbCacheLine += 1;
            await database.upsert(CacheModel, holding);
            break;
          }
        }
      } else {
        await database.upsert(CacheModel, holding);
      }
    }
  }

  step.endAt = new Date();
  step.totalLine = res?.result?.totalCount;
  step.nbRequest = nbRequest;
  step.totalCount = totalCount;
  step.insertedLines = insertedLines;
  step.nbCacheLine = nbCacheLine;
  step.status = 'success';

  logger.info(`[${customerName}] snapshot is inserted`);

  return step;
}

module.exports = {
  getSnapshotForDatabase,
  getSnapshotAndSaveCacheInDatabase,
};
