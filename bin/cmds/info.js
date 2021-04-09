const { connection } = require('../../lib/client');
const logger = require('../../lib/logger');

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

const info = async (args) => {
  const client = await connection(args.use);
  const documents = await countDocuments('etatcollhlm', client);
  const IN2P3 = await countInstitutes('etatcollhlm', 'IN2P3', client);
  const INC = await countInstitutes('etatcollhlm', 'INC', client);
  const INEE = await countInstitutes('etatcollhlm', 'INEE', client);
  const INP = await countInstitutes('etatcollhlm', 'INP', client);
  const INS2I = await countInstitutes('etatcollhlm', 'INS2I', client);
  const INSB = await countInstitutes('etatcollhlm', 'INSB', client);
  const INSHS = await countInstitutes('etatcollhlm', 'INSHS', client);
  const INSIS = await countInstitutes('etatcollhlm', 'INSIS', client);
  const INSMI = await countInstitutes('etatcollhlm', 'INSMI', client);
  const INSU = await countInstitutes('etatcollhlm', 'INSU', client);

  logger.info(`Number total documents in index etatcollhlm: ${documents}`);
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
