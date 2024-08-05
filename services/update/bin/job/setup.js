/* eslint-disable no-param-reassign */
/* eslint-disable no-restricted-syntax */
/* eslint-disable guard-for-in */
const path = require('path');
const config = require('config');
const insertFile = require('../setup/file');

const logger = require('../../lib/logger');

const State = require('../../models/state');

const getSnapshotForElastic = require('../setup/enrich');

const uploadDir = path.resolve(__dirname, '..', '..', 'out', 'upload');

async function initiate(customerName, index, date) {
  const state = new State(customerName);

  const filepath = path.resolve(uploadDir, `${customerName}.csv`);
  const { custid, apikey } = config.get(`holdings.${customerName}`);
  // TODO report
  try {
    await insertFile(filepath, index, date);
  } catch (err) {
    logger.error(err);
    await state.fail();
    return;
  }

  try {
    await getSnapshotForElastic(customerName, custid, apikey, index);
  } catch (err) {
    logger.error(err);
    await state.fail();
    return;
  }

  // TODO end Report
  // TODO send Mail
}

module.exports = initiate;
