const { connection } = require('../../lib/client');
const logger = require('../../lib/logger');
const ezhlmIndex = require('../../index/ezhlm.json');

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
    logger.error(`indices.exists in isIndexExist: ${err}`);
  }
  return res.body;
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
    logger.error(`countDocuments: ${err}`);
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
      logger.error(`deleteIndex: ${err}`);
    }
  }
  logger.info(`documents deleted : ${nb}`);
};

/**
 * delete index and recreate it
 * @param {String} name name of index
 * @param {Object} index mapping of index
 * @param {Object} client elastic client
 */
const resetIndex = async (name, index, client) => {
  await deleteIndex(name, client);
  try {
    await client.indices.create({
      index: name,
      body: index,
    });
  } catch (err) {
    logger.error(`indices.delete resetIndex: ${err}`);
  }
};

/**
 * create index if it does'nt exist
 * @param {String} name name of index
 * @param {Object} index mapping of index
 * @param {Object} client elastic client
 */
const initIndex = async (name, index, client) => {
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
    logger.error(`indices.delete resetIndex: ${err}`);
  }
  logger.info(`${name} index has created`);
};

/**
 * reset the index
 * @param {Object} args object from commander
 */
const reset = async (args) => {
  const client = await connection(args.use);
  resetIndex('ezhlm', ezhlmIndex, client);
};

/**
 * init the index
 * @param {Object} args object from commander
 */
const init = async (args) => {
  const client = await connection(args.use);
  initIndex('ezhlm', ezhlmIndex, client);
};

module.exports = {
  init,
  reset,
};
