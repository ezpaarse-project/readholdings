const elastic = require('../lib/elastic');
const holdingsAPI = require('../lib/holdingsiq');
const logger = require('../lib/logger');

/**
 * @param {Object} customer - config on institute (name, apikey, custid)
 * @param {String} index Index where the values will be inserted
 * @param {boolean} update Type of bulk, if true: update bulk, else create
 */
const getSnapshot = async (customer, index, update) => {
  const client = elastic.connection();

  const { totalCount } = await holdingsAPI.getHoldingsStatus(customer);
  const size = 4000;
  const page = Math.ceil(totalCount / size);
  logger.info(`${customer.name}: ${totalCount} lines from holdings`);
  logger.info(`estimate API call ${page}`);
  let holdings;
  let i = 1;
  do {
    logger.info(`${i} API call: ${(i - 1) * size} to ${(i) * size}`);
    holdings = await holdingsAPI.getHoldings(customer, size, i, index, update);
    await elastic.bulk(client, holdings);
    i += 1;
  } while (holdings.length >= 2 * size);

  await elastic.refresh(client, index);
};

module.exports = getSnapshot;
