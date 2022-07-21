const { Client } = require('@elastic/elasticsearch');
const { URL } = require('url');
const { elasticsearch } = require('config');
const logger = require('../lib/logger');

const elasticClient = new Client({
  node: {
    url: new URL(`${elasticsearch.host}:${elasticsearch.port}`),
    auth: {
      username: elasticsearch.user,
      password: elasticsearch.password,
    },
  },
  requestTimeout: 2000,
});

const ping = async () => {
  let elasticStatus;
  do {
    try {
      elasticStatus = await elasticClient.ping();
    } catch (err) {
      logger.error(`Cannot ping ${elasticsearch.host}:${elasticsearch.port}`);
      logger.error(err);
    }
    if (elasticStatus?.statusCode !== 200) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  } while (elasticStatus?.statusCode !== 200);
  logger.info(`ping: ${elasticsearch.host}:${elasticsearch.port} ok`);
  return true;
};

/**
 * create, update, delete in bulk in elastic
 * @param {Object} client elastic client
 * @param {Array} data array of HLM datas
 */
const bulk = async (data) => {
  let res;
  try {
    res = await elasticClient.bulk({ body: data });
  } catch (err) {
    logger.error(`Cannot bulk: ${err}`);
    console.log(err?.meta?.body?.error);
    process.exit(1);
  }

  const items = Array.isArray(res?.body?.items) ? res?.body?.items : [];

  if (res?.body?.errors) {
    logger.error('Error in bulk');
  }

  const errors = [];

  let insertedDocs = 0;
  let updatedDocs = 0;
  let deletedDocs = 0;

  items.forEach((i) => {
    if (i?.index?.result === 'created') {
      insertedDocs += 1;
      return;
    }
    if (i?.index?.result === 'updated') {
      updatedDocs += 1;
      return;
    }
    if (i?.index?.result === 'deleted') {
      deletedDocs += 1;
      return;
    }

    if (i?.index?.error !== undefined) {
      errors.push(i?.index?.error);
      logger.error(JSON.stringify(i?.index?.error, null, 2));
      process.exit(1);
    }
  });

  items.forEach((i) => {
    if (i?.index?.status !== 200 && i?.index?.status !== 201) {
      if (i?.delete === undefined) {
        logger.error(JSON.stringify(i?.index, null, 2));
        process.exit(1);
      }
    }
  });

  return {
    insertedDocs,
    updatedDocs,
    deletedDocs,
    errors,
  };
};

/**
 * update one data in elastic
 * @param {Object} client elastic client
 * @param {Array} data array of HLM datas
 */
const update = async (index, id, data) => {
  let res;
  try {
    res = await elasticClient.update({ index, id, body: { doc: data } });
  } catch (err) {
    logger.error(`Cannot update [${index} ${id}]: ${err}`);
    console.error(err?.body?.error);
    process.exit(1);
  }
  return res;
};

/**
 * return number of document of index
 * @param {Object} client elastic client
 * @param {String} name name of index
 * @returns {Int} number of document
 */
const countDocuments = async (name) => {
  let data;
  try {
    data = await elasticClient.count({
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
 * check if index exit
 * @param {Object} client elastic client
 * @param {String} index Name of index
 * @returns {Boolean} if exist
 */
const checkIfIndexExist = async (index) => {
  let res;
  try {
    res = await elasticClient.indices.exists({
      index,
    });
  } catch (err) {
    logger.error(`Cannot check if index [${index}] exist : ${err}`);
    process.exit(1);
  }
  return res.body;
};

/**
 * delete index if it exist
 * @param {Object} client elastic client
 * @param {String} name Name of index
 */
const deleteIndex = async (name) => {
  const exist = await checkIfIndexExist(name);
  if (exist) {
    try {
      await elasticClient.indices.delete({
        index: name,
      });
    } catch (err) {
      logger.error(`Cannot delete index [${name}]: ${err}`);
      process.exit(1);
    }
  }
};

/**
 * Create index if it doesn't exist
 * @param {Object} client elastic client
 * @param {String} name Name of index
 * @param {JSON} mapping mapping in JSON format
 */
const createIndex = async (name, mapping) => {
  const exist = await checkIfIndexExist(name);
  if (!exist) {
    try {
      await elasticClient.indices.create({
        index: name,
        body: mapping,
      });
    } catch (err) {
      logger.error(`Cannot create index [${name}]: ${err}`);
      process.exit(1);
    }
  }
};

/**
 * delete index and recreate it
 * @param {Object} client elastic client
 * @param {String} name name of index
 * @param {Object} index mapping of index
 */
const resetIndex = async (name, mapping) => {
  await deleteIndex(name);
  try {
    await elasticClient.indices.create({
      index: name,
      body: mapping,
    });
  } catch (err) {
    logger.error(`Cannot create index [${name}]`);
    console.error(err);
    process.exit(1);
  }
};

/**
 * get documents from index
 * @param {Object} client elastic client
 * @param {String} index name of index
 * @param {Integer} from page
 * @param {Integer} size size of result
 * @returns {Object} ezhlm documents
 */
const getDocumentsFromIndex = async (index, from, size) => {
  let res;
  try {
    res = await elasticClient.search({
      index,
      from,
      size,
    });
  } catch (err) {
    logger.error(`Cannot search on index [${index}]`);
    console.error(err?.meta?.body);
    process.exit(1);
  }
  return res.body?.hits?.hits;
};

/**
 * refresh the index in elastic
 * @param {Object} client elastic client
 * @param {String} index name of index
 */
const refresh = async (index) => {
  try {
    await elasticClient.indices.refresh({ index });
  } catch (e) {
    logger.error(`Cannot refresh index ${index} - ${e.message}`);
    process.exit(1);
  }
};

/**
 * search the index in elastic with id
 * @param {Object} client elastic client
 * @param {String} index name of index
 */
const search = async (index, id) => {
  let res;
  try {
    res = await elasticClient.search({
      index,
      body: {
        query: {
          terms: {
            _id: [id],
          },
        },
      },
    });
  } catch (err) {
    logger.error(`Cannot search in index ${index} - ${err.message}`);
    logger.error(err);
    process.exit(1);
  }

  // eslint-disable-next-line no-underscore-dangle
  return res?.body?.hits?.hits?.map((hit) => hit?._source)[0]?.doc;
};

const getAll = async (index) => {
  let res;
  try {
    res = await elasticClient.search({
      index,
      size: 100,
    });
  } catch (err) {
    logger.error(`Cannot search in index ${index} - ${err.message}`);
    process.exit(1);
  }

  // eslint-disable-next-line no-underscore-dangle
  return res?.body?.hits?.hits?.map((hit) => hit?._source);
};

module.exports = {
  ping,
  bulk,
  update,
  createIndex,
  deleteIndex,
  countDocuments,
  resetIndex,
  getDocumentsFromIndex,
  checkIfIndexExist,
  refresh,
  search,
  getAll,
};