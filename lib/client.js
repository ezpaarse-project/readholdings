const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { Client } = require('@elastic/elasticsearch');
const { URL } = require('url');
const logger = require('./logger');

const elasticClient = () => {
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

const pingElastic = async () => {
  const configPath = path.resolve(os.homedir(), '.config', 'ezhlm.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

  const {
    baseURL,
  } = config?.elastic;

  let elasticStatus;
  do {
    try {
      elasticStatus = await elasticClient.ping();
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

module.exports = {
  elasticClient,
  pingElastic,
};
