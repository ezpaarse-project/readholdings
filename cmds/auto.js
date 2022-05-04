const {
  updateSnapshot,
  downloadMarc,
  fillTmpSnapshot,
  update,
  mergeMarcIndex,
  deleteFromMarc,
} = require('./ebsco');

const clean = require('./clean');

const State = require('../lib/state');
const logger = require('../lib/logger');

const { getCustomer } = require('../lib/config');

async function auto(args) {
  let { customer } = args;

  if (!customer) {
    logger.error('Customer required');
    process.exit(1);
  }

  customer = await getCustomer(customer);

  const state = new State(customer?.name);

  args.state = state;

  try {
    await updateSnapshot(args);
  } catch (err) {
    logger.error(err);
    state.fail();
  }

  try {
    await fillTmpSnapshot(args);
  } catch (err) {
    logger.error(err);
    state.fail();
  }

  try {
    await downloadMarc(args);
  } catch (err) {
    logger.error(err);
    state.fail();
  }

  try {
    await update(args);
  } catch (err) {
    logger.error(err);
    state.fail();
  }

  try {
    await mergeMarcIndex(args);
  } catch (err) {
    logger.error(err);
    state.fail();
  }

  try {
    await deleteFromMarc(args);
  } catch (err) {
    logger.error(err);
    state.fail();
  }

  try {
    await clean(args);
  } catch (err) {
    logger.error(err);
    state.fail();
  }
}

module.exports = auto;
