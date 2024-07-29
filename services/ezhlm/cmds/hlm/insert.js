const { format } = require('date-fns');

const logger = require('../../lib/logger');

const insertFile = require('../../bin/hlm');

/**
 * insert the content of file into elastic (ez-meta)
 * @param {Object} args object from commander
 */
async function insertFromHLM(args) {
  const { file } = args;

  let {
    index,
    date,
  } = args;

  if (!index) {
    index = `ezhlm-${new Date().getFullYear()}`;
  }

  if (!date) {
    date = format(new Date(), 'yyyy-MM-dd');
  }

  if (!args.file || args.file === '') {
    logger.error('file expected');
    process.exit(1);
  }

  await insertFile(file, index, date);
}

module.exports = insertFromHLM;
