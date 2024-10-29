const path = require('path');
const fs = require('fs-extra');

const logger = require('../../lib/logger');

const { getIDFromXML } = require('../../bin/marc');
const holdingsAPI = require('../../services/holdings');

const { checkArgs } = require('../../bin/utils');
const elastic = require('../../services/elastic');

const ezhlmMapping = require('../../mapping/ezhlm.json');

const downloadDir = path.resolve(__dirname, '..', '..', 'download');

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

  const customerDir = path.resolve(downloadDir, name);
  let files = await fs.readdir(customerDir);
  files = files.filter((file) => file.split('.')[1] === 'xml');

  let upsert = files.filter((file) => matchUpsert.exec(file));

  const match1 = /(Add-|Chg-)/i;
  const match2 = /(Addm|Chgm)/i;

  const t1 = upsert.filter((file) => match1.exec(file));
  const t2 = upsert.filter((file) => match2.exec(file));

  upsert = t1.concat(t2);

  const indexSnapshot = `${name}-snapshot`.toLowerCase();
  const indexMarc = `${name}-marc`.toLowerCase();

  await elastic.createIndex(client, indexMarc, ezhlmMapping);

  let lengthIds = 0;

  for await (const filename of upsert) {
    const filePath = path.resolve(downloadDir, name, filename);

    logger.info(`[${filename}]: Counting id`);
    const idsFromXML = await getIDFromXML(filePath, name, indexMarc, 'upsert');
    lengthIds += idsFromXML.length;
  }

  logger.info(`total : ${lengthIds} ezhlmid`);

  if (state) {
    state.ezhlmid += lengthIds;
  }

  for await (const filename of upsert) {
    const filePath = path.resolve(downloadDir, name, filename);

    logger.info(`[${filename}]: reading this file`);

    let idsFromXML = await getIDFromXML(filePath, name, indexMarc, 'upsert');

    const idBulk = [];

    idsFromXML = idsFromXML.sort((a, b) => {
      if (a < b) { return -1; }
      if (a > b) { return 1; }
      return 0;
    });

    idsFromXML.forEach((id) => {
      idBulk.push({ index: { _index: indexMarc, _id: id } });
      idBulk.push({ id });
    });

    await elastic.bulk(client, idBulk);

    let holdings2;
    let vendorIDCache;
    let packageIDCache;

    for (let i = 0; i < idsFromXML.length; i += 1) {
      const ezhlmid = idsFromXML[i];

      if (state) step.ezhlmids.push({ id: ezhlmid, file: filename });

      const id = ezhlmid.split('-');
      const vendorID = id[1];
      const packageID = id[2];
      const kbID = id[3];

      const snapshot = await elastic.search(client, indexSnapshot, ezhlmid);

      if (snapshot) {
        await elastic.update(client, indexMarc, ezhlmid, snapshot);
      }

      const holdings1 = await elastic.search(client, indexSnapshot, ezhlmid);
      if (holdings1) {
        holdings1.updatedAt = new Date();
        await elastic.update(client, indexMarc, ezhlmid, holdings1);
      }

      if (vendorID !== vendorIDCache || packageID !== packageIDCache) {
        holdings2 = await holdingsAPI
          .getVendorsPackages(customer, vendorID, packageID, indexMarc);
        if (state) {
          state.increment('request', holdings2?.request);
          step.request += holdings2?.request;
        }
        vendorIDCache = vendorID;
        packageIDCache = packageID;
      }
      await elastic.update(client, indexMarc, ezhlmid, holdings2?.result);

      const holdings3 = await holdingsAPI
        .getVendorsPackagesTitles(customer, vendorID, packageID, kbID, indexMarc);

      if (state) {
        state.increment('request', holdings2?.request);
        step.request += holdings3?.request;
      }

      await elastic.update(client, indexMarc, ezhlmid, holdings3?.result);
    }
    logger.info(`[${filename}] - ${idsFromXML.length} id on delta snapshot`);
  }

  if (state) {
    step.endAt = new Date();
    step.status = 'success';
    state.setLatestStep(step);
  }
}

module.exports = update;
