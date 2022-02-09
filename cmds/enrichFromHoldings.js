const { getHoldingsStatus, getHoldings } = require('../lib/holdingsiq');
const { elasticClient } = require('../lib/client');
const { getConfig } = require('./config');
const logger = require('../lib/logger');

/**
 * insert by packet of 1000, parsed data to elastic (ez-meta)
 * @param {Object} client elastic client
 * @param {Array} data array of HLM datas
 */
const updateInElastic = async (client, data) => {
  let res;
  try {
    res = await client.bulk({ body: data });
  } catch (err) {
    logger.error(`updateInElastic: ${err}`);
    console.log(err?.body?.error);
    return;
  }
  const errors = [];
  const items = Array.isArray(res?.body?.items) ? res?.body?.items : [];

  items.forEach((i) => {
    if (i?.update?.result === 'created') {
      return;
    }
    if (i?.update?.result === 'updated') {
      return;
    }

    if (i?.update?.error !== undefined) {
      console.error(i?.update?.error);
    }
  });
  return res.body.items.length;
};

const enrichFromHoldings = async (args) => {
  let {
    index,
  } = args;

  if (!index) {
    index = `ezhlm-${new Date().getFullYear()}`;
  }

  const client = elasticClient();
  const config = await getConfig();
  const { institutes } = config?.holdingsiq;

  for await (const institute of institutes) {
    const {
      name,
      apikey,
      custid,
    } = institute;

    const count = await getHoldingsStatus(apikey, custid);
    const page = Math.ceil(count / 5000);

    for (let i = 1; i <= page; i += 1) {
      const holdings = await getHoldings(apikey, custid, 5000, i, name, index);
      await updateInElastic(client, holdings);
    }
  }
  // await insertInElastic(client, data);
};

module.exports = enrichFromHoldings;
