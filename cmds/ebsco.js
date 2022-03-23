const holdingsAPI = require('../lib/holdingsiq');
const { getConfig } = require('./config');
const elastic = require('../lib/elastic');
const getIDFromXML = require('../lib/marcupdate');
const ezhlmMapping = require('../mapping/ezhlm.json');
const logger = require('../lib/logger');

const enrichFromHoldings = async (args) => {
  let {
    index,
  } = args;

  if (!index) {
    index = `ezhlm-${new Date().getFullYear()}`;
  }

  const client = elastic.connection();
  const config = await getConfig();
  const { institutes } = config?.holdingsiq;

  for await (const institute of institutes) {
    const count = await holdingsAPI.getHoldingsStatus(institute);
    const page = Math.ceil(count / 2000);
    logger.info(`${institute.name}: ${count} lines from holdings`);
    logger.info(`estimate API call ${page}`);
    let holdings;
    let i = 1;
    do {
      logger.info(`${i} API call: ${(i - 1) * 2000} to ${(i) * 2000}`);
      holdings = await holdingsAPI.getHoldings(institute, 2000, i, index);
      await elastic.bulk(client, holdings);
      i += 1;
    } while (holdings.length >= 2000);
  }
};

const updateFromHoldings = async (args) => {
  let {
    index,
    file,
  } = args;

  if (!index) {
    index = `ezhlm-${new Date().getFullYear()}`;
  }

  if (!file) {
    logger.error('file expected');
    process.exit(1);
  }

  const client = elastic.connection();
  const config = await getConfig();
  const { institutes } = config?.holdingsiq;

  for await (const institute of institutes) {
    const {
      name,
      apikey,
      custid,
    } = institute;

    // TODO get files from marc

    // const ids = await getIDFromXML(file, name, index);
    // TODO delete documents in ezhlm index

    await elastic.createIndex(client, 'tmp', ezhlmMapping);
    const idsFromXML = await getIDFromXML(file, name, 'tmp');
    // TODO sort ids

    await elastic.bulk(client, idsFromXML, 'update');
    await elastic.refresh(client, 'tmp');
    const count = await elastic.countDocuments(client, 'tmp');
    const scroll = Math.ceil(count / 5000);
    for (let i = 1; i <= scroll; i += 1) {
      const ezhlmids = await elastic.getDocumentsFromIndex(client, 'tmp', i, 5000);
      for await (let ezhlmid of ezhlmids) {
        ezhlmid = ezhlmid['_id'];
        const id = ezhlmid.split('-');
        const vendorID = id[1];
        const packageID = id[2];
        const kbID = id[3];

        const holdings1 = await holdingsAPI.getVendorsPackagesTitles(institute, vendorID, packageID, kbID, 'tmp');
        console.log(holdings1);
        await elastic.update(client, 'tmp', ezhlmid, holdings1);

        const holdings2 = await holdingsAPI.getVendorsPackages(institute, vendorID, packageID, 'tmp');
        await elastic.update(client, 'tmp', ezhlmid, holdings2);
      }
    }
    // await elastic.deleteIndex(client, 'tmp');
  }
};

module.exports = {
  enrichFromHoldings,
  updateFromHoldings,
};
