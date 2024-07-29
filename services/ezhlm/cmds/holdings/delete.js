const fs = require('fs-extra');
const path = require('path');

const elastic = require('../../services/elastic');

const { checkArgs } = require('../../bin/utils');

const { getIDFromXML } = require('../../bin/marc');
const logger = require('../../lib/logger');

const downloadDir = path.resolve(__dirname, '..', '..', 'download');

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
    const idsFromXML = await getIDFromXML(filePath, name);

    const idBulk = [];

    idsFromXML.forEach((id) => {
      idBulk.push({ delete: { _index: index, _id: id } });
    });

    await elastic.bulk(client, idBulk);

    if (state) {
      step.linesDeleted += idsFromXML.length;
    }
    logger.info(`${[filename]} - ${idsFromXML.length} id deleted`);
  }

  if (state) {
    step.endAt = new Date();
    step.status = 'success';
    state.setLatestStep(step);
  }
}

module.exports = deleteFromMarc;
