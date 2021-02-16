/* eslint-disable no-param-reassign */
/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */

const path = require('path');
const fs = require('fs-extra');
const Papa = require('papaparse');
const cliProgress = require('cli-progress');
const { connection } = require('../../lib/client');

const logger = require('../../lib/logger');

const bar = new cliProgress.SingleBar({
  format: 'progress [{bar}] {percentage}% | {value}/{total} bytes',
});

/**
 * @param {*} data array of HLM datas
 */
const insertHLM = async (client, data) => {
  const body = data.flatMap((doc) => [{ index: { _index: 'etatcollhlm' } }, doc]);
  try {
    const res = await client.bulk({ refresh: true, body });
    if (res.body.errors) {
      logger.error(res.body.errors);
    }
  } catch (err) {
    logger.error(`Error in insertHLM: ${err}`);
    process.exit(1);
  }
};

const transformStringToArray = (data, name) => {
  if (data[name]) {
    if (data[name].includes('|')) {
      const dates = data[name].split('|');
      const newdates = [];
      dates.forEach((date) => {
        if (date === 'Present') {
          newdates.push(null);
        } else {
          newdates.push(date);
        }
      });
      data[name] = newdates;
    }
  }
  if (data[name] === 'Present') {
    data[name] = null;
  }
  return data;
};

const insertion = async (args) => {
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

  const client = await connection(args.use);

  let readStream;
  let tab = [];
  let data;
  try {
    readStream = fs.createReadStream(filePath);
  } catch (err) {
    logger.error(`Error in readstream in insertDatasHLM: ${err}`);
  }

  const stat = await fs.stat(readStream.path);
  bar.start(stat.size, 0);

  await new Promise((resolve) => {
    Papa.parse(readStream, {
      delimiter: ',',
      header: true,
      transformHeader: (header) => header.trim(),
      step: async (results, parser) => {
        // update bar
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

          data = transformStringToArray(data, 'ManagedCoverageBegin');
          data = transformStringToArray(data, 'ManagedCoverageEnd');
          data = transformStringToArray(data, 'CustomCoverageBegin');
          data = transformStringToArray(data, 'CustomCoverageEnd');
        }
        tab.push(data);
        if (tab.length === 1000) {
          await parser.pause();
          await insertHLM(client, tab);
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
    await insertHLM(client, tab);
    tab = [];
  }
  bar.update(stat.size);
  bar.stop();
};

module.exports = {
  insertion,
};
