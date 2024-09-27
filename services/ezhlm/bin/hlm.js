/* eslint-disable no-param-reassign */
/* eslint-disable guard-for-in */
const fs = require('fs-extra');
const Papa = require('papaparse');
const cliProgress = require('cli-progress');
const { exec } = require('child_process');

const elastic = require('../services/elastic');

const logger = require('../lib/logger');

/**
 * parse csv data to json
 * @param {Object} data unparsed data
 * @param {String} name key of data need to be parsed
 * @returns {Object} parsed data
 */
function transformCoverage(data, name) {
  if (data[name]) {
    if (data[name].includes('|')) {
      data[name] = data[name].split('|');
    }
  }
  return data;
}

/**
 * parse embargo data for json format
 * @param {Object} data unparsed data
 * @param {String} embargo type of embargo
 * @returns {Object} parsed data
 */
function transformEmbargo(data, embargo) {
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
}

/**
 * insert the content of file in elastic
 * @param {String} filePath filepath
 */
async function insertFile(filePath, index, date) {
  const client = await elastic.connection();

  logger.info(`insert ${filePath}`);

  let lineInFile = 0;
  let lineUpserted = 0;

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

        data = transformCoverage(data, 'ManagedCoverageBegin');
        data = transformCoverage(data, 'ManagedCoverageEnd');
        data = transformCoverage(data, 'CustomCoverageBegin');
        data = transformCoverage(data, 'CustomCoverageEnd');
        data = transformEmbargo(data, 'Embargo');
        data = transformEmbargo(data, 'CustomEmbargo');
        data.createdAt = date;

        data.ezhlmid = `${data.BibCNRS}-${data.VendorID}-${data.PackageID}-${data.KBID}`;

        tab.push({ index: { _index: index, _id: data.ezhlmid } });
        tab.push(data);
        if (tab.length === 1000) {
          await parser.pause();
          const dataToInsert = tab.slice();
          const res = await elastic.bulk(client, dataToInsert);
          lineUpserted += res.insertedDocs + res.updatedDocs;
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
    const dataToInsert = tab.slice();
    const res = await elastic.bulk(client, dataToInsert);
    lineUpserted += res.insertedDocs + res.updatedDocs;
    tab = [];
  }
  bar.update(stat.size);
  bar.stop();
  logger.info(`${lineUpserted}/${lineInFile - 1} lines updated`);

  await elastic.refresh(client, index);
}

module.exports = insertFile;
