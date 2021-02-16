const client = require('../../lib/client');
const logger = require('../../lib/logger');
const etatcollhlmIndex = require('../../index/etatcollhlm.json');

const isIndexExist = async (name) => {
  let res;
  try {
    res = await client.indices.exists({
      index: name,
    });
  } catch (err) {
    logger.error(`Error in indices.exists in isIndexExist: ${err}`);
  }
  return res.body;
};

const countDocuments = async (name) => {
  let data;
  try {
    data = await client.count({
      index: name,
    });
  } catch (err) {
    logger.error(`Error in countDocuments: ${err}`);
  }
  return data.body.count ? data.body.count : 0;
};

const deleteIndex = async (name) => {
  const exist = await isIndexExist(name);
  let nb;
  if (exist) {
    try {
      nb = await countDocuments(name);
      await client.indices.delete({
        index: name,
      });
    } catch (err) {
      logger.error(`Error in deleteIndex: ${err}`);
    }
  }
  logger.info(`documents deleted : ${nb}`);
};

const resetIndex = async (name, index) => {
  await deleteIndex(name);
  try {
    await client.indices.create({
      index: name,
      body: index,
    });
  } catch (err) {
    logger.error(`Error in indices.delete resetIndex: ${err}`);
  }
};

const reset = () => {
  resetIndex('etatcollhlm', etatcollhlmIndex);
};

module.exports = {
  reset,
};
