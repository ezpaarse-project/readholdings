const { connection } = require('../../lib/client');
const logger = require('../../lib/logger');

/**
 * Count number of documents in index
 * @param {String} name name of index
 * @param {Object} client elastic client
 * @returns {Int} number of documents
 */
const countDocuments = async (name, client) => {
  let data;
  try {
    data = await client.count({
      index: name,
    });
  } catch (err) {
    logger.error(`countDocuments: ${err}`);
  }
  return data.body.count ? data.body.count : 0;
};

/**
 * Count number of documents for one institute
 * @param {String} name name of index
 * @param {Object} client elastic client
 * @returns {Int} number of documents
 * @returns number of documents for one institute
 */
const countInstitutes = async (name, institute, client) => {
  let data;
  const query = {
    bool: {
      filter: [{
        term: {
          BibCNRS: institute,
        },
      }],
    },
  };
  try {
    data = await client.count({
      index: name,
      body: {
        query,
      },
    });
  } catch (err) {
    logger.error(`countInstitute: ${err}`);
  }
  return data.body.count ? data.body.count : 0;
};

/**
 * display informations on terminal
 * @param {Object} args object from commander
 */
const info = async (args) => {
  const client = await connection(args.use);
  const documents = await countDocuments('ezhlm', client);
  const IN2P3 = await countInstitutes('ezhlm', 'IN2P3', client);
  const INC = await countInstitutes('ezhlm', 'INC', client);
  const INEE = await countInstitutes('ezhlm', 'INEE', client);
  const INP = await countInstitutes('ezhlm', 'INP', client);
  const INS2I = await countInstitutes('ezhlm', 'INS2I', client);
  const INSB = await countInstitutes('ezhlm', 'INSB', client);
  const INSHS = await countInstitutes('ezhlm', 'INSHS', client);
  const INSIS = await countInstitutes('ezhlm', 'INSIS', client);
  const INSMI = await countInstitutes('ezhlm', 'INSMI', client);
  const INSU = await countInstitutes('ezhlm', 'INSU', client);

  logger.info(`Number total documents in index ezhlm: ${documents}`);
  logger.info(`IN2P3: ${IN2P3}`);
  logger.info(`INC: ${INC}`);
  logger.info(`INEE: ${INEE}`);
  logger.info(`INP: ${INP}`);
  logger.info(`INS2I: ${INS2I}`);
  logger.info(`INSB: ${INSB}`);
  logger.info(`INSHS: ${INSHS}`);
  logger.info(`INSIS: ${INSIS}`);
  logger.info(`INSMI: ${INSMI}`);
  logger.info(`INSU: ${INSU}`);
};

module.exports = {
  info,
};
