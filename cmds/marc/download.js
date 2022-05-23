const fs = require('fs-extra');
const path = require('path');

const { checkArgs } = require('../../bin/utils');
const logger = require('../../lib/logger');
const marc = require('../../services/marc');

const downloadDir = path.resolve(__dirname, '..', '..', 'download');

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
      if (state) step.files.push(file);
    } catch (err) {
      logger.error(err);
      if (state) state.fail();
    }
  }

  if (state) {
    step.endAt = new Date();
    step.status = 'success';
    state.setLatestStep(step);
  }
}

module.exports = downloadMarc;
