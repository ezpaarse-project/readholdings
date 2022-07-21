const sleep = require('../utils');
const logger = require('../../lib/logger');
const holdingsAPI = require('../../service/holdings');

async function updateSnapshot(name, custid, apikey, state) {
  const step = state.addStepUpdateSnapshot();

  // await holdingsAPI.postHoldings(custid, apikey);
  logger.info('Update snapshot is started - wait 2 minutes to check status');

  let res;
  do {
    res = await holdingsAPI.getHoldingsStatus(custid, apikey);
    if (res?.data?.status.toLowerCase() !== 'completed') {
      await sleep(120 * 1000);
      logger.info(`Status: [${res?.data?.status.toLowerCase()}] - wait 2 minutes`);
    }
  } while (res?.data?.status.toLowerCase() !== 'completed');

  if (state) {
    step.endAt = new Date();
    step.totalLine = res?.result?.totalCount;
    step.status = 'success';
    state.setLatestStep(step);
  }

  logger.info(`[${name}] snapshot updated`);
}

module.exports = updateSnapshot;
