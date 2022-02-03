/* eslint-disable no-param-reassign */
/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */

const path = require('path');
const fs = require('fs-extra');
const Papa = require('papaparse');
const cliProgress = require('cli-progress');
const { exec } = require('child_process');
const { format } = require('date-fns');
const { connection } = require('../lib/client');

const logger = require('../lib/logger');

/**
 * insert by packet of 1000, parsed data to elastic (ez-meta)
 * @param {Object} client elastic client
 * @param {Array} data array of HLM datas
 */
const insertInElastic = async (client, data, index) => {
  let res;
  const body = data.flatMap((doc) => [{ index: { _index: index } }, doc]);
  try {
    res = await client.bulk({ refresh: true, body });
  } catch (err) {
    logger.error(`insertInElastic: ${err}`);
    process.exit(1);
  }
  return res.body.items.length;
};

/**
 * parse csv data to json
 * @param {Object} data unparsed data
 * @param {String} name key of data need to be parsed
 * @returns {Object} parsed data
 */
const transformStringToArray = (data, name) => {
  if (data[name]) {
    if (data[name].includes('|')) {
      data[name] = data[name].split('|');
    }
  }
  return data;
};

/**
 * parse embargo data for json format
 * @param {Object} data unparsed data
 * @param {String} embargo type of embargo
 * @returns {Object} parsed data
 */
const transformEmbargo = (data, embargo) => {
  if (!data[embargo]) {
    return data;
  }
  const time = data[embargo];
  const splited = time.split(' ');
  const number = splited[0];
  const indicator = splited[1].toUpperCase();
  let multiplicator = 1;
  if (indicator === 'YEARS') {
    multiplicator = 12;
  }
  if (indicator === 'DAYS') {
    multiplicator = 0.3;
  }
  data[embargo] = `${number * multiplicator} mois`;
  return data;
};

/**
 * insert the content of file in elastic
 * @param {String} filePath filepath
 */
const insertFile = async (filePath, index) => {
  const client = await connection();

  logger.info(`insert ${filePath}`);

  let lineInFile = 0;
  let lineInserted = 0;

  await new Promise((resolve) => {
    exec(`wc -l < ${filePath}`, (error, results) => {
      if (error) {
        logger.error(`wc -l: ${error}`);
        process.exit(1);
      }
      lineInFile = results;
      logger.info(`lines that must be inserted ${results - 1}`);
      resolve();
    });
  });

  let readStream;
  let tab = [];
  let data;
  try {
    readStream = fs.createReadStream(filePath);
  } catch (err) {
    logger.error(`readstream in insertDatasHLM: ${err}`);
  }

  const tmp = readStream.path.split('/');
  const [file] = tmp[tmp.length - 1].split('.');

  const bar = new cliProgress.SingleBar({
    format: 'progress [{bar}] {percentage}% | {value}/{total} bytes',
  });

  const stat = await fs.stat(readStream.path);
  bar.start(stat.size, 0);

  await new Promise((resolve) => {
    Papa.parse(readStream, {
      delimiter: ',',
      header: true,
      transformHeader: (header) => header.trim(),
      step: async (results, parser) => {
        // update bar
        results.data.BibCNRS = file;
        data = results.data;
        for (const attr in data) {
          if (attr.trim() !== attr) {
            data[attr.trim()] = data[attr];
            delete data[attr];
          }
          // skip empty field
          if (data[attr] === '') {
            delete data[attr];
          }
        }

        data = transformStringToArray(data, 'ManagedCoverageBegin');
        data = transformStringToArray(data, 'ManagedCoverageEnd');
        data = transformStringToArray(data, 'CustomCoverageBegin');
        data = transformStringToArray(data, 'CustomCoverageEnd');
        data = transformEmbargo(data, 'Embargo');
        data = transformEmbargo(data, 'CustomEmbargo');
        data.createdAt = new Date('2022-01-19');

        tab.push(data);
        if (tab.length === 1000) {
          await parser.pause();
          lineInserted += await insertInElastic(client, tab, index);
          tab = [];
          bar.update(results.meta.cursor);
          await parser.resume();
        }
      },
      complete: () => {
        resolve();
      },
    });
  });
  if (tab.length !== 0) {
    lineInserted += await insertInElastic(client, tab, index);
    tab = [];
  }
  bar.update(stat.size);
  bar.stop();
  logger.info(`${lineInserted}/${lineInFile - 1} lines inserted`);
};

/**
 * insert the content of file into elastic (ez-meta)
 * @param {Object} args object from commander
 */
const insertFromHLM = async (args) => {
  const { folder } = args;
  let {
    index,
    date,
  } = args;

  if (!index) {
    index = `ezHLM-${new Date().getFullYear()}`;
  }

  if (!date) {
    date = format(new Date(), 'yyyy-MM-dd');
  }

  if (!args.folder || args.folder === '') {
    logger.error('folder expected');
    process.exit(1);
  }

  const folderPath = path.resolve(folder);

  const folderExist = await fs.pathExists(folderPath);
  if (!folderExist) {
    logger.error('folder not found');
    process.exit(1);
  }

  const files = await fs.readdir(folderPath);

  for await (const file of files) {
    await insertFile(path.resolve(folderPath, file), index);
  }
};

module.exports = insertFromHLM;
