const { sleep } = require('../utils');
const logger = require('../../lib/logger');
const holdingsAPI = require('../../lib/service/holdings');

async function updateSnapshot(name, custid, apikey, step) {
  await holdingsAPI.postHoldings(custid, apikey);
  logger.info('Update snapshot is started');

  let res;
  do {
    res = await holdingsAPI.getHoldingsStatus(custid, apikey);
    step.nbRequest += res.nbRequest;
    if (res?.data?.status.toLowerCase() !== 'completed') {
      logger.info(`Status: [${res?.data?.status.toLowerCase()}] - wait 2 minutes`);
      await sleep(120 * 1000);
    }
  } while (res?.data?.status.toLowerCase() !== 'completed');

  step.endAt = new Date();
  step.totalLine = res?.data?.totalCount;
  step.status = 'success';

  logger.info(`[${name}] snapshot updated`);
  return step;
}

module.exports = updateSnapshot;
