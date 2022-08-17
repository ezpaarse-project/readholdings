const elastic = require('../../lib/service/elastic');
const holdingsAPI = require('../../lib/service/holdings');

const { parseGetHoldings } = require('./parser');

const logger = require('../../lib/logger');

/**
 * @param {String} index Index where the values will be inserted
 */
async function getSnapshotForElastic(name, custid, apikey, index) {
  let request = 0;
  let insertedLines = 0;
  let updatedLines = 0;

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
    holdings = parseGetHoldings(holdings.data, name, index);
    const { insertedDocs, updatedDocs } = await elastic.bulk(holdings);
    insertedLines += insertedDocs;
    updatedLines += updatedDocs;
    logger.info(`API call ${i}/${page}: ${insertedLines + updatedLines}/${totalCount} lines inserted`);
    i += 1;
  } while (holdings?.length >= 2 * size);

  await elastic.refresh(index);

  return {
    request,
    insertedLines,
    updatedLines,
  };
}

module.exports = getSnapshotForElastic;
