/* eslint-disable no-loop-func */
/* eslint-disable no-unreachable-loop */
/* eslint-disable array-callback-return */
/* eslint-disable consistent-return */

const HttpsProxyAgent = require('https-proxy-agent');
const axios = require('axios');
const { holdings } = require('config');

const { sleep } = require('../../bin/utils');
const logger = require('../logger');

const { args } = require('../../bin/utils');

const httpsAgent = process.env.https_proxy && new HttpsProxyAgent(process.env.https_proxy);

const holdingsAPI = axios.create({
  baseURL: holdings.baseURL,
  timeout: 20000,
  httpsAgent: (holdings.baseURL.startsWith('https') && httpsAgent) ? httpsAgent : undefined,
  proxy: (holdings.baseURL.startsWith('https') && httpsAgent) ? false : undefined,
});

const format = 'kbart2';

/**
 * reload snapshot on holdings
 * @param {Object} conf - config on institute (name, apikey, custid)
 * @returns {Integer} number of data
 */
const postHoldings = async (custid, apikey) => {
  let res;

  let i = 1;

  for (i; i < 5; i += 1) {
    try {
      res = await holdingsAPI({
        method: 'post',
        url: `/${custid}/holdings`,
        headers: {
          'x-api-key': apikey,
          'Content-Type': 'application/json',
        },
      });
    } catch (err) {
      logger.errorRequest(err);
      logger.error(`POST /${custid}/holdings - Fail ${i} times - HTTP code: ${err.response.status}`);
      logger.error(`${i} try, wait ${2 ** i} seconds for the next try`);
      await sleep(1000 * 2 ** i);
      i += 1;
    }

    if (res) return { nbRequest: i, data: res?.data?.totalCount };
  }

  logger.error(`Cannot request POST /${custid}/holdings - Fail 4 times`);
  return false;
};

/**
 * get number of data of custid
 * @returns {Integer} number of data
 */
const getHoldingsStatus = async (custid, apikey) => {
  let res;

  let i = 1;

  for (i; i < 5; i += 1) {
    try {
      res = await holdingsAPI({
        method: 'get',
        url: `/${custid}/holdings/status`,
        headers: {
          'x-api-key': apikey,
          'Content-Type': 'application/json',
        },
      });
    } catch (err) {
      logger.errorRequest(err);
      logger.error(`GET /${custid}/holdings/status - Fail ${i} times - HTTP code: ${err.response.status}`);
      logger.error(`${i} try, wait ${2 ** i} seconds for the next try`);
      await sleep(1000 * 2 ** i);
    }
    if (res) return { nbRequest: i, data: res?.data };
  }

  logger.error(`Cannot request GET /${custid}/holdings/status - Fail 4 times`);
  return false;
};

/**
 * getHoldings for enrich initialization
 * @param {Object} conf - config on institute (name, apikey, custid)
 * @param {*} count - number of documents to recover
 * @param {*} offset - page
 * @returns {Object} Data ready to be inserted in elastic
 */
const getHoldings = async (custid, apikey, count, offset) => {
  let res;

  let i = 1;

  const idsSave = new Set();
  const badlyFormatted = new Set();

  const filtered = [];

  let nbRequest = 0;

  do {
    try {
      res = await holdingsAPI({
        method: 'get',
        url: `/${custid}/holdings`,
        params: { count, offset, format },
        headers: {
          'x-api-key': apikey,
          'Content-Type': 'application/json; charset=utf-8',
        },
      });
    } catch (err) {
      logger.errorRequest(err);
      logger.error(`GET /${custid}/holdings - Fail ${i} times - HTTP code: ${err?.response?.status}`);
      logger.error(`${i} try, wait ${2 ** i} seconds for the next try`);
      i += 1;
      nbRequest += 1;
      await sleep(1000 * 2 ** i);
    }
    if (res) {
      if (badlyFormatted.size !== 0) {
        const idsBadlyFormatted = [...badlyFormatted];
        idsBadlyFormatted.forEach((id) => {
          const [packageId, vendorId, titleId] = id.split('-');

          const newHolding = res?.data?.holdings?.find((e) => e.package_id === packageId
            && e.vendor_id === vendorId && e.title_id === titleId);

          const hasInvalidArg = args.some((arg) => newHolding[arg]?.includes('�'));

          if (!hasInvalidArg) {
            filtered.push(newHolding);
            badlyFormatted.delete(id);
          }
        });
      } else {
        res?.data?.holdings?.forEach((holding) => {
          // create id to save holding in interne cache
          const id = `${holding.package_id}-${holding.vendor_id}-${holding.title_id}`;

          if (idsSave.has(id)) {
            return;
          }

          idsSave.add(id);

          const hasInvalidArg = args.some((arg) => holding[arg]?.includes('�'));

          if (hasInvalidArg) {
            badlyFormatted.add(id);
          } else {
            filtered.push(holding);
          }
        });

        if (badlyFormatted.size !== 0) {
          logger.info(`${badlyFormatted.size} data are not formatted correctly, retry a other time`);
        }
        nbRequest += 1;
      }
    }
  } while (badlyFormatted.size !== 0);

  if (i === 4) {
    logger.error(`Cannot request GET /${custid}/holdings - Fail 4 times`);
    return false;
  }

  return { nbRequest, data: filtered };
};

/**
 * getVendorsPackagesTitles for unit enrich update
 * @param {Object} conf - config on institute (, apikey, custid)
 * @param {*} vendorID - vendorID
 * @param {*} packageID - packageID
 * @param {*} kbID - kbID
 * @returns {Object} Data ready to be inserted in elastic
 */
const getVendorsPackagesTitles = async (custid, apikey, vendorID, packageID, kbID) => {
  let res;

  let i = 1;

  for (i; i < 5; i += 1) {
    try {
      res = await holdingsAPI({
        method: 'get',
        url: `/${custid}/vendors/${vendorID}/packages/${packageID}/titles/${kbID}`,
        headers: {
          'x-api-key': apikey,
          'Content-Type': 'application/json',
        },
      });
    } catch (err) {
      logger.errorRequest(err);
      logger.error(err?.response?.data?.Errors[0]?.Message);
      logger.error(`GET /${custid}/vendors/${vendorID}/packages/${packageID}/titles/${kbID} - Fail ${i} times - HTTP code: ${err.response.status}`);
      logger.error(`${i} try, wait ${2 ** i} seconds for the next try`);
      await sleep(1000 * 2 ** i);
    }

    if (res) {
      return { nbRequest: i, data: res?.data };
    }
  }

  if (i >= 4) {
    logger.error(`Cannot request GET /${custid}/vendors/${vendorID}/packages/${packageID}/titles/${kbID} - Fail 4 times`);
    return false;
  }
};

/**
 * getVendorsPackages for unit enrich update
 * @param {Object} conf - config on institute (apikey, custid)
 * @param {Integer} vendorID - vendorID
 * @param {Integer} packageID - packageID
 * @returns {Object} Data ready to be inserted in elastic
 */
const getVendorsPackages = async (custid, apikey, vendorID, packageID) => {
  let res;

  let i = 1;

  for (i; i < 5; i += 1) {
    try {
      res = await holdingsAPI({
        method: 'get',
        url: `/${custid}/vendors/${vendorID}/packages/${packageID}`,
        headers: {
          'x-api-key': apikey,
          'Content-Type': 'application/json',
        },
      });
    } catch (err) {
      logger.errorRequest(err);
      logger.error(`GET /${custid}/vendors/${vendorID}/packages/${packageID} - Fail ${i} times - HTTP code: ${err.response.status}`);
      logger.error(`${i} try, wait ${2 ** i} seconds for the next try`);
      await sleep(1000 * 2 ** i);
    }
    if (res) {
      return { nbRequest: i, data: res?.data };
    }
  }
  logger.error(`Cannot request GET /${custid}/vendors/${vendorID}/packages/${packageID} - Fail 4 times`);
  return false;
};

module.exports = {
  getHoldingsStatus,
  getHoldings,
  getVendorsPackages,
  getVendorsPackagesTitles,
  postHoldings,
};
