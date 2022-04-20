const path = require('path');
const fs = require('fs-extra');
const logger = require('../lib/logger');

const { getCustomer } = require('../lib/config');

const downloadDir = path.resolve(__dirname, '..', 'download');

async function clean(args) {
  let { index, customer } = args;
  const { state } = args;

  if (!customer) {
    logger.error('Customer required');
    process.exit(1);
  }

  customer = await getCustomer(customer);

  const { name } = customer;

  if (!index) {
    index = `ezhlm-${new Date().getFullYear()}`;
  }

  let step;

  if (state) {
    state.addStepSnapshotIndex();
    step = state.getLatestStep();
  }

  const customerDir = path.resolve(downloadDir, name);
  const files = await fs.readdir(customerDir);
  for await (const filename of files) {
    const filePath = path.resolve(downloadDir, name, filename);
    try {
      await fs.unlink(filePath);
      logger.info(`[${filename}] deleted`);
    } catch (err) {
      logger.error(err);
      process.exit(1);
    }
  }

  if (state) {
    step.endAt = new Date();
    step.status = 'success';
    state.setLatestStep(step);
  }
}

module.exports = clean;
