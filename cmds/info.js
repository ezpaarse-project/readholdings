const elastic = require('../services/elastic');
const logger = require('../lib/logger');

/**
 * Count number of documents for one institute
 * @param {String} name name of index
 * @param {Object} client elastic client
 * @returns {Int} number of documents
 * @returns number of documents for one institute
 */
const countInstitutes = async (client, index, institute) => {
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
      index,
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
  const client = await elastic.connection();
  const documents = await elastic.countDocuments(client, 'ezhlm');
  const IN2P3 = await countInstitutes(client, 'ezhlm', 'IN2P3');
  const INC = await countInstitutes(client, 'ezhlm', 'INC');
  const INEE = await countInstitutes(client, 'ezhlm', 'INEE');
  const INP = await countInstitutes(client, 'ezhlm', 'INP');
  const INS2I = await countInstitutes(client, 'ezhlm', 'INS2I');
  const INSB = await countInstitutes(client, 'ezhlm', 'INSB');
  const INSHS = await countInstitutes(client, 'ezhlm', 'INSHS');
  const INSIS = await countInstitutes(client, 'ezhlm', 'INSIS');
  const INSMI = await countInstitutes(client, 'ezhlm', 'INSMI');
  const INSU = await countInstitutes(client, 'ezhlm', 'INSU');

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
