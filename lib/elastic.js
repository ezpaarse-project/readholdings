const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { Client } = require('@elastic/elasticsearch');
const { URL } = require('url');
const logger = require('./logger');

/**
 * create elastic client with config in $HOME/.config/ezhlm.json
 * @returns elastic client
 */
const connection = () => {
  const configPath = path.resolve(os.homedir(), '.config', 'ezhlm.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

  const {
    baseURL,
    username,
    password,
  } = config?.elastic;

  let client;
  try {
    client = new Client({
      node: {
        url: new URL(`${baseURL}`),
        auth: {
          username,
          password,
        },
      },
      requestTimeout: 2000,
    });
  } catch (err) {
    logger.error(`Cannot request ${baseURL} with ${username} ${password}`);
    logger.error('Your elastic config is incorrect, update it or reload by default with : ezhlm config --set default');
    process.exit(1);
  }
  client.baseURL = baseURL;
  return client;
};

/**
 * Ping elastic with config in $HOME/.config/ezhlm.json4
 * @param {Object} client elastic client
 * @returns {Boolean} if ping success
 */
const ping = async (client) => {
  const configPath = path.resolve(os.homedir(), '.config', 'ezhlm.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

  const {
    baseURL,
  } = config?.elastic;

  let elasticStatus;
  do {
    try {
      elasticStatus = await client.ping();
    } catch (err) {
      logger.error(`Cannot ping ${baseURL}`);
      logger.error(err);
    }
    if (elasticStatus?.statusCode !== 200) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  } while (elasticStatus?.statusCode !== 200);
  logger.info(`ping: ${baseURL} ok`);
  return true;
};

/**
 * create, update, delete in bulk in elastic
 * @param {Object} client elastic client
 * @param {Array} data array of HLM datas
 */
const bulk = async (client, data, action) => {
  let res;
  try {
    res = await client.bulk({ body: data });
  } catch (err) {
    logger.error(`Cannot bulk: ${err}`);
    console.log(err?.meta?.body?.error);
    process.exit(1);
  }

  const items = Array.isArray(res?.body?.items) ? res?.body?.items : [];

  if (res?.body?.errors) {
    logger.error('Error in bulk');
  }

  items.forEach((i) => {
    if (i?.index?.status !== 200 && i?.index?.status !== 201) {
      logger.error(`[${i?.index?._index}]: ${i?.index?.status}`);
    }
    logger.info(`[${i?.index?._index}]: ${i?.index?.result}`);
  });

  return items.length;
};

/**
 * update one data in elastic
 * @param {Object} client elastic client
 * @param {Array} data array of HLM datas
 */
const update = async (client, index, id, data) => {
  let res;
  try {
    res = await client.update({ index, id, body: { doc: data } });
  } catch (err) {
    logger.error(`Cannot update: ${err}`);
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
const countDocuments = async (client, name) => {
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
 * check if index exit
 * @param {Object} client elastic client
 * @param {String} index Name of index
 * @returns {Boolean} if exist
 */
const checkIfIndexExist = async (client, index) => {
  let res;
  try {
    res = await client.indices.exists({
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
const deleteIndex = async (client, name) => {
  const exist = await checkIfIndexExist(client, name);
  if (exist) {
    try {
      await client.indices.delete({
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
const createIndex = async (client, name, mapping) => {
  const exist = await checkIfIndexExist(client, name);
  if (!exist) {
    try {
      await client.indices.create({
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
const resetIndex = async (client, name, mapping) => {
  await deleteIndex(client, name);
  try {
    await client.indices.create({
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
const getDocumentsFromIndex = async (client, index, from, size) => {
  let res;
  try {
    res = await client.search({
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
const refresh = async (client, index) => {
  try {
    await client.indices.refresh({ index });
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
const search = async (client, index, id) => {
  let res;
  try {
    res = await client.search({
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
    process.exit(1);
  }

  // eslint-disable-next-line no-underscore-dangle
  return res?.body?.hits?.hits?.map((hit) => hit?._source)[0]?.doc;
};

const getAll = async (client, index) => {
  let res;
  try {
    res = await client.search({
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
  connection,
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
