const elastic = require('../services/elastic');
const holdingsAPI = require('../services/holdings');
const logger = require('../lib/logger');

/**
 * @param {Object} customer - config on institute (name, apikey, custid)
 * @param {String} index Index where the values will be inserted
 * @param {boolean} update Type of bulk, if true: update bulk, else create
 */
const getSnapshot = async (customer, index) => {
  const client = elastic.connection();
  let request = 0;
  let linesInserted = 0;
  let linesUpdated = 0;

  const res = await holdingsAPI.getHoldingsStatus(customer);
  const { totalCount } = res?.result;
  request += res?.request;
  const size = 4000;
  const page = Math.ceil(totalCount / size);
  logger.info(`${customer.name}: ${totalCount} lines from holdings`);
  logger.info(`estimate API call ${page}`);
  let holdings;
  let i = 1;

  do {
    holdings = await holdingsAPI.getHoldings(customer, size, i, index);
    request += holdings.request;
    const { insertedDocs, updatedDocs } = await elastic.bulk(client, holdings?.result);
    linesInserted += insertedDocs;
    linesUpdated += updatedDocs;
    logger.info(`API call ${i}: ${linesInserted + linesUpdated}/${totalCount} lines inserted`);
    i += 1;
  } while (holdings?.result?.length >= 2 * size);

  await elastic.refresh(client, index);

  return {
    request,
    linesInserted,
    linesUpdated,
  };
};

module.exports = getSnapshot;
