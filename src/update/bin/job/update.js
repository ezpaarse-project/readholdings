const config = require('config');

const logger = require('../../lib/logger');
const createModelHoldings = require('../../lib/sequelize/model');

const { sendMailReport } = require('../../lib/service/mail');

const State = require('../../models/state');

const updateSnapshot = require('../update/snapshot');

const { createReport } = require('../update/report');

const { updateCache, mergeCache } = require('../update/cache');

const { flush, swapTableName } = require('../../lib/service/database');

const { getSnapshotAndSaveCacheInDatabase } = require('../update/download');

async function update(customerName, index) {
  const state = new State(customerName);
  const { custid, apikey } = config.get(`holdings.${customerName.toUpperCase()}`);

  const SaveHoldingsModel = await createModelHoldings(`${customerName}-saveholdings`);
  const CacheModel = await createModelHoldings(`${customerName}-caches`);

  let step;

  step = state.stepUpdateSnapshot();

  // try {
  //   step = await updateSnapshot(customerName, custid, apikey, step);
  // } catch (err) {
  //   logger.error(err);
  //   await state.fail();
  //   return;
  // }

  await state.setLatestStep(step);

  step = state.createStepSaveCache();

  // try {
  //   step = await getSnapshotAndSaveCacheInDatabase(customerName, custid, apikey, step);
  // } catch (err) {
  //   logger.error(err);
  //   await state.fail();
  //   return;
  // }

  await state.setLatestStep(step);

  step = state.createStepEnrichCache();

  try {
    step = await updateCache(custid, customerName, apikey, step);
  } catch (err) {
    logger.error(err);
    await state.fail();
    return;
  }

  await state.setLatestStep(step);

  // TODO DEL

  step = state.createStepMergeCache();

  try {
    step = await mergeCache(customerName, index, step);
  } catch (err) {
    logger.error(err);
    await state.fail();
    return;
  }

  await state.setLatestStep(step);

  // try {
  //   await flush(SaveHoldingsModel);
  // } catch (err) {
  //   logger.error(err);
  //   await state.fail();
  //   return;
  // }

  // try {
  //   await swapTableName(`${customerName}-holdings`, `${customerName}-saveholdings`);
  // } catch (err) {
  //   logger.error(err);
  //   await state.fail();
  //   return;
  // }

  // try {
  //   await flush(CacheModel);
  // } catch (err) {
  //   logger.error(err);
  //   await state.fail();
  //   return;
  // }

  state.endState(step);

  try {
    await createReport(customerName, state);
  } catch (err) {
    logger.error(err);
  }

  try {
    await sendMailReport(state);
  } catch (err) {
    logger.error(err);
  }
}

module.exports = update;
