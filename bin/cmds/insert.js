/* eslint-disable no-param-reassign */
/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */

const path = require('path');
const fs = require('fs-extra');
const Papa = require('papaparse');
const cliProgress = require('cli-progress');
const { exec } = require('child_process');
const { connection } = require('../../lib/client');

const logger = require('../../lib/logger');

/**
 * insert by packet of 1000, parsed data to elastic (ez-meta)
 * @param {Object} client elastic client
 * @param {Array} data array of HLM datas
 */
const insertHLM = async (client, data) => {
  let res;
  const body = data.flatMap((doc) => [{ index: { _index: 'ezhlm2' } }, doc]);
  try {
    res = await client.bulk({ refresh: true, body });
  } catch (err) {
    logger.error(`insertHLM: ${err}`);
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
      const dates = data[name].split('|');
      const newdates = [];
      dates.forEach((date) => {
        if (date === 'Present') {
          newdates.push('3000-01-01');
        } else {
          newdates.push(date);
        }
        newdates.push(date);
      });
      data[name] = newdates;
    }
  }
  if (data[name] === 'Present') {
    data[name] = '3000-01-01';
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
 * insert the content of file into elastic (ez-meta)
 * @param {Object} args object from commander
 */
const insertion = async (args) => {
  let lineInFile = 0;
  let lineInserted = 0;
  if (!args.file || args.file === '') {
    logger.error('file expected');
    process.exit(1);
  }
  const filePath = path.resolve(args.file);

  const fileExist = await fs.pathExists(filePath);
  if (!fileExist) {
    logger.error('file not found');
    process.exit(1);
  }

  if (args.verbose) {
    await new Promise((resolve) => {
      exec(`wc -l < ${filePath}`, (error, results) => {
        if (error) {
          logger.error(`wc -l: ${error}`);
        }
        lineInFile = results;
        logger.info(`lines that must be inserted ${results - 1}`);
        resolve();
      });
    });
  }

  const client = await connection(args.use);

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

        tab.push(data);
        if (tab.length === 1000) {
          await parser.pause();
          lineInserted += await insertHLM(client, tab);
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
    lineInserted += await insertHLM(client, tab);
    tab = [];
  }
  bar.update(stat.size);
  bar.stop();
  if (args.verbose) {
    logger.info(`${lineInserted}/${lineInFile - 1} lines inserted`);
  }
};

module.exports = {
  insertion,
};
