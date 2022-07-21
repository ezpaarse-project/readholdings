const config = require('config');

const logger = require('../../lib/logger');

const State = require('../../models/state');

const updateSnapshot = require('../update/snapshot');
const { getSnapshotAndSaveIDForDatabase } = require('../update/download');

async function update(customerName, index, date) {
  const state = new State(customerName);
  const { custid, apikey } = config.get(`holdings.${customerName}`);

  try {
    await updateSnapshot(customerName, custid, apikey, state);
  } catch (err) {
    logger.error(err);
    state.fail();
    return;
  }

  try {
    await getSnapshotAndSaveIDForDatabase(customerName, custid, apikey);
  } catch (err) {
    logger.error(err);
    state.fail();
    return;
  }

  console.log('tt');
  // TODO
}

module.exports = update;
