const path = require('path');
const fs = require('fs-extra');

const getSnapshot = require('../bin/snapshot');
const holdingsAPI = require('../lib/holdingsiq');
const { getConfig, getCustomer } = require('../lib/config');
const elastic = require('../lib/elastic');
const marc = require('../lib/marc');
const ezhlmMapping = require('../mapping/ezhlm.json');
const logger = require('../lib/logger');

const downloadDir = path.resolve(__dirname, '..', 'download');

const sleep = (waitTimeInMs) => new Promise((resolve) => setTimeout(resolve, waitTimeInMs));

const initEnrich = async (args) => {
  let { index, customer } = args;

  if (!index) {
    index = `ezhlm-${new Date().getFullYear()}`;
  }

  if (!customer) {
    logger.error('Customer required');
    process.exit(1);
  }

  customer = await getCustomer(customer);

  await getSnapshot(customer, index, true);
};

const updateSnapshot = async (args) => {
  let { customer } = args;

  if (!customer) {
    logger.error('Customer required');
    process.exit(1);
  }

  customer = await getCustomer(customer);
  // holdingsAPI.postHoldings(customer);

  let res;

  do {
    res = await holdingsAPI.getHoldingsStatus(customer);
    await sleep(120 * 1000);
  } while (res.status.toLowerCase() !== 'completed');

  logger.info(`[${customer?.name}] snapshot updated`);
};

const downloadMarc = async (args) => {
  let { index, customer } = args;

  if (!customer) {
    logger.error('Customer required');
    process.exit(1);
  }

  customer = await getCustomer(customer);

  const { name } = customer;

  if (!index) {
    index = `ezhlm-${new Date().getFullYear()}`;
  }

  logger.info(`[${name}] Download files on Marc service`);
  try {
    await marc.getMarcFiles(customer);
  } catch (err) {
    logger.error(err);
  }

  const files = await fs.readdir(path.resolve(downloadDir, name));
  logger.info(`[${name}] Unzip marc files`);
  for await (const file of files) {
    try {
      logger.info(`[${name}] file [${file}]`);
      await marc.unzipMarcFile(name, path.resolve(downloadDir, name, file));
    } catch (err) {
      logger.error(err);
    }
  }
};

const fillTmpSnapshot = async (args) => {
  let { index, customer } = args;

  if (!customer) {
    logger.error('Customer required');
    process.exit(1);
  }

  customer = await getCustomer(customer);

  const { name } = customer;

  if (!index) {
    index = `ezhlm-${new Date().getFullYear()}`;
  }

  const client = elastic.connection();

  const indexSnapshot = `${name}-snapshot`.toLowerCase();

  await elastic.createIndex(client, indexSnapshot, ezhlmMapping);
  await getSnapshot(customer, indexSnapshot);
};

const update = async (args) => {
  let { index, customer } = args;

  if (!customer) {
    logger.error('Customer required');
    process.exit(1);
  }

  customer = await getCustomer(customer);

  const { name } = customer;

  if (!index) {
    index = `ezhlm-${new Date().getFullYear()}`;
  }

  const client = elastic.connection();

  const matchUpsert = /(Add|Chg)/i;

  const customerDir = path.resolve(downloadDir, name);
  let files = await fs.readdir(customerDir);
  files = files.filter((file) => file.split('.')[1] === 'xml');

  const upsert = files.filter((file) => matchUpsert.exec(file));

  const indexSnapshot = `${name}-snapshot`.toLowerCase();
  const indexMarc = `${name}-marc`.toLowerCase();

  await elastic.createIndex(client, indexMarc, ezhlmMapping);

  for await (const filename of upsert) {
    const filePath = path.resolve(downloadDir, name, filename);
    const idsFromXML = await marc.getIDFromXML(filePath, name, indexMarc, 'upsert');

    // TODO sort ids
    await elastic.bulk(client, idsFromXML, 'update');
    await elastic.refresh(client, indexMarc);

    const count = await elastic.countDocuments(client, indexMarc);

    const scroll = Math.ceil(count / 5000);
    for (let i = 1; i <= scroll; i += 1) {
      const ezhlmids = await elastic.getDocumentsFromIndex(client, indexMarc, i, 5000);
      for await (let ezhlmid of ezhlmids) {
        ezhlmid = ezhlmid._id;
        const id = ezhlmid.split('-');
        const vendorID = id[1];
        const packageID = id[2];
        const kbID = id[3];

        const snapshot = await elastic.search(client, indexSnapshot, ezhlmid);
        if (snapshot) {
          await elastic.update(client, indexMarc, ezhlmid, snapshot);
        }

        const holdings1 = await holdingsAPI
          .getVendorsPackagesTitles(customer, vendorID, packageID, kbID, indexMarc);
        await elastic.update(client, indexMarc, ezhlmid, holdings1);

        const holdings2 = await holdingsAPI
          .getVendorsPackages(customer, vendorID, packageID, indexMarc);
        await elastic.update(client, indexMarc, ezhlmid, holdings2);

        const holdings3 = await elastic.search(client, indexSnapshot, ezhlmid);
        await elastic.update(client, indexMarc, ezhlmid, holdings3);
      }
    }
  }
};

const deleteFromMarc = async (args) => {
  let { index, customer } = args;

  if (!customer) {
    logger.error('Customer required');
    process.exit(1);
  }

  customer = await getCustomer(customer);

  const { name } = customer;

  if (!index) {
    index = `ezhlm-${new Date().getFullYear()}`;
  }

  const client = elastic.connection();

  const matchDel = /(Del)/i;

  const customerDir = path.resolve(downloadDir, name);
  let files = await fs.readdir(customerDir);
  files = files.filter((file) => file.split('.')[1] === 'xml');

  const del = files.filter((file) => matchDel.exec(file));

  for await (const filename of del) {
    const filePath = path.resolve(downloadDir, name, filename);
    const idsFromXML = await marc.getIDFromXML(filePath, name, index, 'delete');
    await elastic.bulk(client, idsFromXML, 'delete');
  }
};

const mergeMarcIndex = async (args) => {
  let { index, customer } = args;

  if (!customer) {
    logger.error('Customer required');
    process.exit(1);
  }

  customer = await getCustomer(customer);

  const { name } = customer;

  if (!index) {
    index = `ezhlm-${new Date().getFullYear()}`;
  }

  const indexMarc = `${name}-marc`.toLowerCase();

  const client = elastic.connection();
  const marcs = await elastic.getAll(client, indexMarc);
  const results = [];
  for (let i = 0; i < marcs.length; i += 1) {
    const result = marcs[i];
    results.push({ index: { _index: index, _id: result?.index._id } });
    results.push(result);
  }
  results.slice();
  await elastic.bulk(client, results, 'index');
};

module.exports = {
  initEnrich,
  updateSnapshot,
  downloadMarc,
  fillTmpSnapshot,
  update,
  deleteFromMarc,
  mergeMarcIndex,
};
