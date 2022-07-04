const path = require('path');
const fs = require('fs-extra');
const os = require('os');
const logger = require('./logger');

const getConfig = async () => {
  const configPath = path.resolve(os.homedir(), '.config', 'ezhlm.json');
  let config;
  try {
    config = await fs.readFile(configPath, 'utf-8');
    config = JSON.parse(config);
  } catch (err) {
    logger.error(err);
  }
  return config;
};

const getCustomer = async (name) => {
  const config = await getConfig();
  const { customers } = config?.holdingsiq;
  const customer = customers.find((e) => e.name === name);

  if (!customer) {
    logger.error(`[${name}] not exist on config`);
    process.exit(1);
  }

  return customer;
};

module.exports = {
  getConfig,
  getCustomer,
};
