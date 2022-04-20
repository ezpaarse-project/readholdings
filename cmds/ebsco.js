const path = require('path');
const fs = require('fs-extra');

const getSnapshot = require('../bin/snapshot');
const holdingsAPI = require('../lib/holdingsiq');
const { getCustomer } = require('../lib/config');
const elastic = require('../lib/elastic');
const marc = require('../lib/marc');
const ezhlmMapping = require('../mapping/ezhlm.json');
const logger = require('../lib/logger');

const downloadDir = path.resolve(__dirname, '..', 'download');

function sleep(waitTimeInMs) { return new Promise((resolve) => setTimeout(resolve, waitTimeInMs)); }

async function checkArgs(args) {
  let { index, customer } = args;

  if (!customer) {
    logger.error('Customer required');
    process.exit(1);
  }

  customer = await getCustomer(customer);

  if (!index) {
    index = `ezhlm-${new Date().getFullYear()}`;
  }

  return {
    index, customer,
  };
}

async function initEnrich(args) {
  const { index, customer } = await checkArgs(args);
  await getSnapshot(customer, index, true);
}

async function updateSnapshot(args) {
  const { customer } = await checkArgs(args);

  const { state } = args;

  let step;

  if (state) {
    state.addStepUpdateSnapshot();
    step = state.getLatestStep();
  }

  holdingsAPI.postHoldings(customer);

  let res;

  do {
    res = await holdingsAPI.getHoldingsStatus(customer);
    await sleep(120 * 1000);
  } while (res.status.toLowerCase() !== 'completed');

  if (state) {
    step.endAt = new Date();
    step.totalLine = res.totalCount;
    step.status = 'success';
    state.setLatestStep(step);
  }

  logger.info(`[${customer?.name}] snapshot updated`);
}

async function downloadMarc(args) {
  const { customer } = await checkArgs(args);
  const { name } = customer;

  const { state } = args;

  let step;

  if (state) {
    state.addStepDownloadMarc();
    step = state.getLatestStep();
  }

  logger.info(`[${name}] Download files on Marc service`);

  try {
    await marc.getMarcFiles(customer);
  } catch (err) {
    logger.error(err);
    if (state) state.fail();
  }

  const files = await fs.readdir(path.resolve(downloadDir, name));
  logger.info(`[${name}] Unzip marc files`);
  for await (const file of files) {
    try {
      logger.info(`[${name}] file [${file}]`);
      await marc.unzipMarcFile(name, path.resolve(downloadDir, name, file));
      step.files.push(file);
    } catch (err) {
      if (state) state.fail();
      logger.error(err);
      process.exit(1);
    }
  }

  if (state) {
    step.endAt = new Date();
    step.status = 'success';
    state.setLatestStep(step);
  }
}

async function fillTmpSnapshot(args) {
  const { customer } = await checkArgs(args);
  const { name } = customer;

  const { state } = args;

  let step;

  if (state) {
    state.addStepSnapshotIndex();
    step = state.getLatestStep();
  }

  const client = elastic.connection();
  const indexSnapshot = `${name}-snapshot`.toLowerCase();

  await elastic.createIndex(client, indexSnapshot, ezhlmMapping);
  await getSnapshot(customer, indexSnapshot);

  if (state) {
    step.endAt = new Date();
    step.status = 'success';
    state.setLatestStep(step);
  }
}

async function update(args) {
  const { customer } = await checkArgs(args);
  const { name } = customer;

  const { state } = args;

  let step;

  if (state) {
    state.addStepMarcIndex();
    step = state.getLatestStep();
  }

  const client = elastic.connection();

  const matchUpsert = /(Add|Chg)/i;
  const matchCreate = /(Add)/i;
  const matchUpdate = /(Chg)/i;

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

    if (matchCreate.test(path)) step.linesCreated += idsFromXML.length;
    if (matchUpdate.test(path)) step.linesUpdated += idsFromXML.length;

    // TODO sort ids
    await elastic.bulk(client, idsFromXML, 'update');
    await elastic.refresh(client, indexMarc);

    const count = await elastic.countDocuments(client, indexMarc);

    const scroll = Math.ceil(count / 5000);
    for (let i = 1; i <= scroll; i += 1) {
      const ezhlmids = await elastic.getDocumentsFromIndex(client, indexMarc, i, 5000);
      for await (let ezhlmid of ezhlmids) {
        step.ezhlmids.push({ id: ezhlmid, file: filename });
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

  if (state) {
    step.endAt = new Date();
    step.status = 'success';
    state.setLatestStep(step);
  }
}

async function deleteFromMarc(args) {
  const { index, customer } = await checkArgs(args);
  const { name } = customer;
  const { state } = args;

  let step;

  if (state) {
    state.addStepDelete();
    step = state.getLatestStep();
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
    if (state) {
      step.linesDeleted += idsFromXML.length;
    }
  }

  if (state) {
    step.endAt = new Date();
    step.status = 'success';
    state.setLatestStep(step);
  }
}

async function mergeMarcIndex(args) {
  const { index, customer } = await checkArgs(args);
  const { name } = customer;
  const { state } = args;

  let step;

  if (state) {
    state.addStepMerge();
    step = state.getLatestStep();
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

  if (state) {
    step.endAt = new Date();
    step.status = 'success';
    state.setLatestStep(step);
  }
}

module.exports = {
  initEnrich,
  updateSnapshot,
  downloadMarc,
  fillTmpSnapshot,
  update,
  deleteFromMarc,
  mergeMarcIndex,
};
