const { updateSnapshot, fillTmpSnapshot } = require('./holdings/snapshot');
const update = require('./holdings/delta');
const mergeMarcIndex = require('./holdings/merge');
const downloadMarc = require('./marc/download');

const deleteFromMarc = require('./holdings/delete');

const clean = require('./clean');

const State = require('../models/state');
const logger = require('../lib/logger');

const { getCustomer } = require('../lib/config');

async function auto(args) {
  let { customer } = args;
  const config = args;

  if (!customer) {
    logger.error('Customer required');
    process.exit(1);
  }

  customer = await getCustomer(customer);

  const state = new State(customer?.name);

  config.state = state;

  try {
    await updateSnapshot(config);
  } catch (err) {
    logger.error(err);
    state.fail();
  }

  try {
    await fillTmpSnapshot(config);
  } catch (err) {
    logger.error(err);
    state.fail();
  }

  try {
    await downloadMarc(config);
  } catch (err) {
    logger.error(err);
    state.fail();
  }

  try {
    await update(config);
  } catch (err) {
    logger.error(err);
    state.fail();
  }

  try {
    await mergeMarcIndex(config);
  } catch (err) {
    logger.error(err);
    state.fail();
  }

  try {
    await deleteFromMarc(config);
  } catch (err) {
    logger.error(err);
    state.fail();
  }

  try {
    await clean(config);
  } catch (err) {
    logger.error(err);
    state.fail();
  }

  await state.endState();
  await state.saveInFile();
}

module.exports = auto;
