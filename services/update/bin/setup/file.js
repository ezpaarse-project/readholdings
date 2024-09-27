/* eslint-disable no-param-reassign */
/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */
const { exec } = require('child_process');
const fs = require('fs-extra');
const Papa = require('papaparse');

const elastic = require('../../lib/service/elastic');

const logger = require('../../lib/logger');

/**
 * parse csv data to json
 * @param {Object} data unparsed data
 * @param {String} name key of data need to be parsed
 * @returns {Object} parsed data
 */
function transformCoverage(data, name) {
  if (data[name].value) {
    if (data[name].value.includes('|')) {
      data[name].value = data[name].value.split('|');
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
  if (!data[embargo].value) {
    return data;
  }
  const time = data[embargo].value;
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
  data[embargo].value = `${number * multiplicator} mois`;
  return data;
}

/**
 * insert the content of file in elastic
 * @param {String} filePath filepath
 */
async function insertFile(filePath, index, date) {
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

  let i = 0;

  await new Promise((resolve) => {
    Papa.parse(readStream, {
      delimiter: ',',
      header: true,
      transformHeader: (header) => header.trim(),
      step: async (results, parser) => {
        results.data.BibCNRS = file;
        data = results.data;
        for (const attr in data) {
          if (attr.trim() !== attr) {
            delete data[attr];
          }
          // skip empty field
          if (data[attr] === '') {
            delete data[attr];
          }

          data[attr.trim()] = { value: data[attr], tag: 'proprietary' };
        }

        data = transformCoverage(data, 'ManagedCoverageBegin');
        data = transformCoverage(data, 'ManagedCoverageEnd');
        data = transformCoverage(data, 'CustomCoverageBegin');
        data = transformCoverage(data, 'CustomCoverageEnd');
        data = transformEmbargo(data, 'Embargo');
        data = transformEmbargo(data, 'CustomEmbargo');
        data.createdAt = { value: date, tag: 'meta' };

        data.ezhlmid = { value: `${data.BibCNRS.value}-${data.VendorID.value}-${data.PackageID.value}-${data.KBID.value}`, tag: 'meta' };

        tab.push({ index: { _index: index, _id: data.ezhlmid.value } });
        tab.push(data);
        i += 1;
        if (tab.length === 1000) {
          await parser.pause();
          const dataToInsert = tab.slice();
          const res = await elastic.bulk(dataToInsert);
          lineUpserted += res.insertedDocs + res.updatedDocs;
          tab = [];
          await parser.resume();
        }
        if (i % 10000 === 0) {
          logger.info(`${i} Lines reads`);
        }
      },
      complete: () => {
        resolve();
      },
    });
  });
  if (tab.length !== 0) {
    const dataToInsert = tab.slice();
    const res = await elastic.bulk(dataToInsert);
    lineUpserted += res.insertedDocs + res.updatedDocs;
    tab = [];
  }
  logger.info(`${lineUpserted}/${lineInFile - 1} lines updated`);

  await elastic.refresh(index);
}

module.exports = insertFile;
