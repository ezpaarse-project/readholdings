const logger = require('../lib/logger');
const { getCustomer } = require('../lib/config');

async function checkArgs(args) {
  let { index, customer } = args;

  if (!customer) {
    logger.error('Customer required');
    process.exit(1);
  }

  customer = await getCustomer(customer);

  if (!index) {
    index = `ezhlm-${new Date().getFullYear()}`;
  }

  return { index, customer };
}

function sleep(waitTimeInMs) { return new Promise((resolve) => setTimeout(resolve, waitTimeInMs)); }

module.exports = {
  checkArgs,
  sleep,
};
