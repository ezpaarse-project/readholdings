const { checkArgs } = require('../../bin/utils');
const getSnapshot = require('../../bin/snapshot');

async function initEnrich(args) {
  const { index, customer } = await checkArgs(args);
  await getSnapshot(customer, index, true);
}

module.exports = initEnrich;
