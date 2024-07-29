const config = require('config');

const { sleep } = require('../utils');

const logger = require('../../lib/logger');
const createModelHoldings = require('../../lib/sequelize/model');

const { sendMailReport } = require('../../lib/service/mail');

const State = require('../../models/state');

const updateSnapshot = require('../update/snapshot');

const { createReport } = require('../update/report');

const { enrichCache, mergeCache } = require('../update/cache');
const deleteLines = require('../update/delete');

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

  try {
    step = await getSnapshotAndSaveCacheInDatabase(customerName, custid, apikey, step);
  } catch (err) {
    logger.error(err);
    await state.fail();
    return;
  }

  console.log(state);
  logger.warn('slep');
  await sleep(60000);

  await state.setLatestStep(step);

  step = state.createStepEnrichCache();

  try {
    step = await enrichCache(custid, customerName, apikey, step);
  } catch (err) {
    logger.error(err);
    await state.fail();
    return;
  }

  console.log(state);
  logger.warn('slep');
  await sleep(60000);

  await state.setLatestStep(step);

  step = state.createStepDeleteLines();

  try {
    step = await deleteLines(`${customerName}-saveholdings`, `${customerName}-holdings`, step);
  } catch (err) {
    logger.error(err);
    await state.fail();
    return;
  }

  step = state.createStepMergeCache();

  try {
    step = await mergeCache(customerName, index, step);
  } catch (err) {
    logger.error(err);
    await state.fail();
    return;
  }

  await state.setLatestStep(step);

  try {
    await flush(SaveHoldingsModel);
  } catch (err) {
    logger.error(err);
    await state.fail();
    return;
  }

  try {
    await swapTableName(`${customerName}-saveholdings`, `${customerName}-holdings`);
  } catch (err) {
    logger.error(err);
    await state.fail();
    return;
  }

  try {
    await flush(CacheModel);
  } catch (err) {
    logger.error(err);
    await state.fail();
    return;
  }

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
