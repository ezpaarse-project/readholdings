const { connection } = require('../../lib/client');
const logger = require('../../lib/logger');
const etatcollhlmIndex = require('../../index/etatcollhlm.json');

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

const initIndex = async (name, index, client) => {
  const exist = await isIndexExist(name, client);
  if (exist) {
    logger.error(`${name} already exist`);
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
};

const reset = async (args) => {
  const client = await connection(args.use);
  resetIndex('etatcollhlm', etatcollhlmIndex, client);
};

const init = async (args) => {
  const client = await connection(args.use);
  initIndex('etatcollhlm', etatcollhlmIndex, client);
};

module.exports = {
  init,
  reset,
};
