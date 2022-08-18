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
  const nbPage = Math.ceil(totalCount / size);
  logger.info(`${name}: ${totalCount} lines from holdings`);
  logger.info(`Need ${nbPage} request to Holdings API`);
  let holdings;

  for (let currentPage = 1; currentPage < nbPage; currentPage += 1) {
    holdings = await holdingsAPI.getHoldings(custid, apikey, size, currentPage);
    request += holdings.nbRequest;
    holdings = parseGetHoldings(holdings.data, name, index);
    const { insertedDocs, updatedDocs } = await elastic.bulk(holdings);
    insertedLines += insertedDocs;
    updatedLines += updatedDocs;
    logger.info(`API call ${currentPage}/${nbPage}: ${insertedLines + updatedLines}/${totalCount} lines inserted`);
  }

  await elastic.refresh(index);

  return {
    request,
    insertedLines,
    updatedLines,
  };
}

module.exports = getSnapshotForElastic;
