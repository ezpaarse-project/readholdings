const { connection, getConfig } = require('../../lib/client');
const logger = require('../../lib/logger');

module.exports = {
  ping: async (args) => {
    const client = await connection(args.use);
    const config = await getConfig(args.use);

    let res;
    try {
      res = await client.ping();
    } catch (err) {
      logger.error(`service unavailable ${config.url}:${config.port}`);
      process.exit(1);
    }
    if (res?.statusCode === 200) {
      logger.info(`service available ${config.url}:${config.port}`);
    }
  },
};