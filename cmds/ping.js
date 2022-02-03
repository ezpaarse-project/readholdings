const { connection, getConfig } = require('../lib/client');
const logger = require('../lib/logger');

/**
 * check if elastic (ez-meta is available)
 * @param {Object} args object from commander
 */
const ping = async (args) => {
  const client = await connection(args.use);
  const config = await getConfig(args.use);

  let res;
  try {
    res = await client.ping();
  } catch (err) {
    logger.error(`service unavailable ${config.baseURL}`);
    process.exit(1);
  }
  if (res?.statusCode === 200) {
    logger.info(`service available ${config.baseURL}`);
  }
};

module.exports = {
  ping,
};
