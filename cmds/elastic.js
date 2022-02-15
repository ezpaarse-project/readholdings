const elastic = require('../lib/elastic');
const logger = require('../lib/logger');
const ezhlmMapping = require('../mapping/ezhlm.json');

/**
 * reset the index
 * @param {Object} args object from commander
 */
const resetIndex = async (args) => {
  const { index } = args;
  if (!index) {
    logger.error('--index required');
    process.exit(1);
  }
  const client = await elastic.connection();
  await elastic.resetIndex(client, index, ezhlmMapping);
  logger.info(`[${index}] is reseted`);
  process.exit(0);
};

/**
 * create the index
 * @param {Object} args object from commander
 */
const createIndex = async (args) => {
  const { index } = args;
  if (!index) {
    logger.error('--index required');
    process.exit(1);
  }
  const client = await elastic.connection();

  const isExist = await elastic.isIndexExist(index, client);
  if (isExist) {
    logger.info(`index [${index}] already exist`);
    process.exit(0);
  }
  elastic.createIndexInElastic(index, ezhlmMapping, client);
  logger.info(`[${index}] index is created`);
  process.exit(0);
};

module.exports = {
  createIndex,
  resetIndex,
};
