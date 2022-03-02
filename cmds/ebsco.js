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
    const page = Math.ceil(count / 5000);

    for (let i = 1; i <= page; i += 1) {
      const holdings = await holdingsAPI.getHoldings(institute, 5000, i, index);
      await elastic.bulk(client, holdings);
    }
  }
};

const updateFromHoldings = async (args) => {
  let {
    index,
    file
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
    await elastic.bulk(client, idsFromXML);
    const count = elastic.countDocuments(client, 'tmp');
    const scroll = Math.ceil(count / 5000);
    // FIXME
    for (let i = 1; i <= scroll; i += 1) {
      const ezhlmids = await elastic.getDocumentsFromIndex(client, 'tmp', i, 5000);
      for await (const ezhlmid of ezhlmids) {
        const ids = ezhlmid.split('-');
        const vendorID = ids[1];
        const packageID = ids[2];
        const kbID = ids[3];

        const holdings1 = await holdingsAPI.getVendorsPackagesTitles(institute, vendorID, packageID, kbID, 'tmp');
        await elastic.update(holdings1);
        const holdings2 = await holdingsAPI.getVendorsPackages(institute, vendorID, packageID, 'tmp');
        await elastic.update(holdings2);
      }
    }
    // TODO update ezhlm index with tmp index
    await elastic.deleteIndex('tmp');
  }
};

module.exports = {
  enrichFromHoldings,
  updateFromHoldings,
};
