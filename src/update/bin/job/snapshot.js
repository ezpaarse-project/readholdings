const config = require('config');

const logger = require('../../lib/logger');

const State = require('../../models/state');

const updateSnapshot = require('../update/snapshot');
const { getSnapshotForDatabase } = require('../update/download');

async function saveSnapshot(customerName, index, date) {
  const state = new State(customerName);
  const { custid, apikey } = config.get(`holdings.${customerName}`);

  try {
    await updateSnapshot(customerName, custid, apikey, state);
  } catch (err) {
    logger.error(err);
    await state.fail();
    return;
  }

  try {
    await getSnapshotForDatabase(customerName, custid, apikey);
  } catch (err) {
    logger.error(err);
    await state.fail();
    return;
  }

  console.log('tt');
  // TODO
}

module.exports = saveSnapshot;
