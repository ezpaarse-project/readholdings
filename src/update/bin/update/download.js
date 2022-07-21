/* eslint-disable no-restricted-syntax */
const database = require('../../service/database');
const holdingsAPI = require('../../service/holdings');

const { parseGetHoldings } = require('./parser');

const createModelHoldings = require('../../lib/sequelize/model');

const logger = require('../../lib/logger');

const args = [
  'access_type',
  'coverage_depth',
  'date_first_issue_online',
  'date_last_issue_online',
  'date_monograph_published_online',
  'date_monograph_published_print',
  'embargo_info',
  'first_author',
  'first_editor',
  'monograph_edition',
  'monograph_volume',
  'notes',
  'num_first_issue_online',
  'num_first_vol_online',
  'num_last_issue_online',
  'num_last_vol_online',
  'online_identifier',
  'package_content_type',
  'package_id',
  'package_name',
  'parent_publication_title_id',
  'preceeding_publication_title_id',
  'print_identifier',
  'publication_title',
  'publication_type',
  'publisher_name',
  'resource_type',
  'title_id',
  'title_url',
  'vendor_id',
  'vendor_name',
];

/**
 * @param {String} index Index where the values will be inserted
 */
async function getSnapshotForDatabase(name, custid, apikey) {
  const HoldingsModel = await createModelHoldings('SaveHoldings');

  let request = 0;
  let linesInserted = 0;

  const res = await holdingsAPI.getHoldingsStatus(custid, apikey);
  const { totalCount } = res.data;
  request += res.request;
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

    linesInserted += sizeBulk;
    logger.info(`API call ${i}/${page}: ${i * 4000}/${totalCount} lines inserted`);
    i += 1;
  } while (holdings?.length >= size);

  return {
    request,
    linesInserted,
  };
}

async function getSnapshotAndSaveIDForDatabase(name, custid, apikey) {
  const HoldingsModel = await createModelHoldings('Holdings');
  const SaveHoldingsModel = await createModelHoldings('SaveHoldings');
  const CacheModel = await createModelHoldings('Cache');

  let request = 0;
  let linesInserted = 0;

  const res = await holdingsAPI.getHoldingsStatus(custid, apikey);
  const { totalCount } = res.data;
  request += res.request;
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

    linesInserted += sizeBulk;
    logger.info(`API call ${i}/${page}: ${i * 4000}/${totalCount} lines inserted`);
    i += 1;

    for await (const holding of holdings) {
      const data = await database.selecByID(SaveHoldingsModel, holding.rhID);
      if (data) {
        for await (const arg of args) {
          if (holding[arg] !== data[arg]) {
            console.log(arg, ': ', holding[arg], ' !== ', data[arg]);
            await database.upsert(CacheModel, holding);
            break;
          }
        }
      }
    }
  } while (holdings?.length >= size);

  return {
    request,
    linesInserted,
  };
}

module.exports = {
  getSnapshotForDatabase,
  getSnapshotAndSaveIDForDatabase,
};
