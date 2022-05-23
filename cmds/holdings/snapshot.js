const { checkArgs, sleep } = require('../../bin/utils');
const getSnapshot = require('../../bin/snapshot');
const { logger } = require('../../lib/logger');
const holdingsAPI = require('../../services/holdings');
const elastic = require('../../services/elastic');

const ezhlmMapping = require('../../mapping/ezhlm.json');

async function updateSnapshot(args) {
  const { customer } = await checkArgs(args);

  const { state } = args;

  let step;

  if (state) {
    state.addStepUpdateSnapshot();
    step = state.getLatestStep();
  }

  holdingsAPI.postHoldings(customer);

  let res;

  do {
    res = await holdingsAPI.getHoldingsStatus(customer);
    await sleep(120 * 1000);
  } while (res?.result?.status.toLowerCase() !== 'completed');

  if (state) {
    step.endAt = new Date();
    step.totalLine = res?.result?.totalCount;
    step.status = 'success';
    state.setLatestStep(step);
  }

  logger.info(`[${customer?.name}] snapshot updated`);
}

async function fillTmpSnapshot(args) {
  const { customer } = await checkArgs(args);
  const { name } = customer;

  const { state } = args;

  let step;

  if (state) {
    state.addStepSnapshotIndex();
    step = state.getLatestStep();
  }

  const client = elastic.connection();
  const indexSnapshot = `${name}-snapshot`.toLowerCase();

  await elastic.createIndex(client, indexSnapshot, ezhlmMapping);
  const { request, linesInserted, linesUpdated } = await getSnapshot(customer, indexSnapshot);

  if (state) {
    step.endAt = new Date();
    step.status = 'success';
    state.set('request', request);
    step.request = request;
    step.linesInserted = linesInserted;
    step.linesUpdated = linesUpdated;
    state.setLatestStep(step);
  }
}

module.exports = {
  updateSnapshot,
  fillTmpSnapshot,
};
