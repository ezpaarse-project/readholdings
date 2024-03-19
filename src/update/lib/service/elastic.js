/* eslint-disable no-promise-executor-return */
const fs = require('fs-extra');
const path = require('path');

const { Client } = require('@elastic/elasticsearch');
const { URL } = require('url');
const { elasticsearch, node } = require('config');
const logger = require('../logger');

const isProd = (node === 'production');

let ssl;

if (isProd) {
  let ca;
  const caPath = path.resolve(__dirname, '..', '..', 'certs', 'ca.crt');
  try {
    ca = fs.readFileSync(caPath, 'utf8');
  } catch {
    logger.error(`Cannot read elastic certificate file in ${caPath}`);
  }
  ssl = {
    ca,
    rejectUnauthorized: true,
  };
}

const elasticClient = new Client({
  node: {
    url: new URL(`${elasticsearch.host}:${elasticsearch.port}`),
    auth: {
      username: elasticsearch.user,
      password: elasticsearch.password,
    },
    ssl,
  },
  requestTimeout: 2000,
});

const ping = async () => {
  let elasticStatus;
  for (let i = 1; i <= 6; i += 1) {
    try {
      elasticStatus = await elasticClient.ping();
    } catch (err) {
      logger.error(`Cannot ping ${elasticsearch.host}:${elasticsearch.port} - ${err}`);
    }
    if (elasticStatus?.statusCode !== 200) {
      logger.error(`ping - wait ${2 ** i} seconds`);
      await new Promise((resolve) => setTimeout(resolve, 1000 * i ** 2));
    } else {
      logger.info(`ping - ${elasticsearch.host}:${elasticsearch.port} ok`);
      return true;
    }
  }
  logger.error(`Cannot ping ${elasticsearch.host}:${elasticsearch.port} Fail 6 times`);
  return false;
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
    logger.error('Cannot bulk on elastic');
    logger.error(err);
    console.log(err?.meta?.body?.error);
    throw err;
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
      throw i?.index?.error;
    }
  });

  items.forEach((i) => {
    if (i?.index?.status !== 200 && i?.index?.status !== 201) {
      if (i?.delete === undefined) {
        logger.error(JSON.stringify(i?.index, null, 2));
        throw i?.index?.error;
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
    logger.error(`Cannot update [${id}] on index [${index}]: ${err}`);
    console.error(err?.body?.error);
    throw err;
  }
  return res;
};

/**
 * return number of document of index
 * @param {Object} client elastic client
 * @param {String} index name of index
 * @returns {Int} number of document
 */
const countDocuments = async (index) => {
  let data;
  try {
    data = await elasticClient.count({
      index,
    });
  } catch (err) {
    logger.error(`Cannot count documents on index [${index}]`);
    console.error(err);
    throw err;
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
    throw err;
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
      throw err;
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
      throw err;
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
    throw err;
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
    throw err;
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
  } catch (err) {
    logger.error(`Cannot refresh index [${index}] - ${err.message}`);
    throw err;
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
    logger.error(`Cannot search in index [${index}] - ${err.message}`);
    logger.error(err);
    throw err;
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
    logger.error(`Cannot search by size 100 in index [${index}] - ${err.message}`);
    throw err;
  }

  // eslint-disable-next-line no-underscore-dangle
  return res?.body?.hits?.hits?.map((hit) => hit?._source);
};

const bulkRemove = async (data, index) => {
  let res;
  try {
    res = await elasticClient.bulk({
      body: data,
    });
  } catch (err) {
    logger.error(`Cannot delete in bulk in index [${index}]- ${err.message}`);
    throw err;
  }

  // eslint-disable-next-line no-underscore-dangle
  return res?.body;
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
  bulkRemove,
  checkIfIndexExist,
  refresh,
  search,
  getAll,
};
