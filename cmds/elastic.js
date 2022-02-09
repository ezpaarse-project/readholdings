const { elasticClient } = require('../lib/client');
const logger = require('../lib/logger');
const ezhlmIndex = require('../mapping/ezhlm.json');

/**
 * check if index exist
 * @param {String} name name of index
 * @param {Object} client elastic client
 * @returns {boolean} isExist
 */
const isIndexExist = async (name, client) => {
  let res;
  try {
    res = await client.indices.exists({
      index: name,
    });
  } catch (err) {
    logger.error(`Cannot check if index [${name}] exist: ${err}`);
    console.error(err);
    process.exit(1);
  }
  return res?.body;
};

/**
 * return number of document of index
 * @param {String} name name of index
 * @param {Object} client elastic client
 * @returns {Int} number of document
 */
const countDocuments = async (name, client) => {
  let data;
  try {
    data = await client.count({
      index: name,
    });
  } catch (err) {
    logger.error(`Cannot count documents on index [${name}]`);
    console.error(err);
    process.exit(1);
  }
  return data.body.count ? data.body.count : 0;
};

/**
 * delete index
 * @param {String} name name of index
 * @param {Object} client elastic client
 */
const deleteIndex = async (name, client) => {
  const exist = await isIndexExist(name, client);
  let nb;
  if (exist) {
    try {
      nb = await countDocuments(name, client);
      await client.indices.delete({
        index: name,
      });
    } catch (err) {
      logger.error(`Cannot delete index [${name}]`);
      console.error(err);
      process.exit(1);
    }
  }
  logger.info(`index [${name}] - documents deleted : ${nb}`);
};

/**
 * delete index and recreate it
 * @param {String} name name of index
 * @param {Object} index mapping of index
 * @param {Object} client elastic client
 */
const resetIndexInElastic = async (name, index, client) => {
  await deleteIndex(name, client);
  try {
    await client.indices.create({
      index: name,
      body: index,
    });
  } catch (err) {
    logger.error(`Cannot create index [${name}]`);
    console.error(err);
    process.exit(1);
  }
};

/**
 * create index if it does'nt exist
 * @param {String} name name of index
 * @param {Object} index mapping of index
 * @param {Object} client elastic client
 */
const createIndexInElastic = async (name, index, client) => {
  const exist = await isIndexExist(name, client);
  if (exist) {
    logger.error(`${name} index already exist`);
    process.exit(1);
  }
  try {
    await client.indices.create({
      index: name,
      body: index,
    });
  } catch (err) {
    logger.error(`Cannot create index [${name}]`);
    console.error(err);
    process.exit(1);
  }
  logger.info(`${name} index has created`);
};

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
  const client = await elasticClient(args.use);
  const isExist = await isIndexExist(index, client);
  if (!isExist) {
    logger.info(`index [${index}] doesn't exist`);
    process.exit(0);
  }
  resetIndexInElastic(index, ezhlmIndex, client);
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
  const client = await elasticClient(args.use);

  const isExist = await isIndexExist(index, client);
  if (isExist) {
    logger.info(`index [${index}] already exist`);
    process.exit(0);
  }
  createIndexInElastic(index, ezhlmIndex, client);
};

module.exports = {
  createIndex,
  resetIndex,
};
