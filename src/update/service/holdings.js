/* eslint-disable array-callback-return */
/* eslint-disable consistent-return */

const HttpsProxyAgent = require('https-proxy-agent');
const axios = require('axios');
const { holdings } = require('config');

const sleep = require('../bin/utils');
const logger = require('../lib/logger');

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
      logger.error(`POST /${custid}/holdings - Fail ${i} times`);
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
      logger.error(`GET /${custid}/holdings/status - Fail ${i} times`);
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

  for (i; i < 5; i += 1) {
    try {
      res = await holdingsAPI({
        method: 'get',
        url: `/${custid}/holdings`,
        params: { count, offset, format },
        headers: {
          'x-api-key': apikey,
          'Content-Type': 'application/json',
        },
      });
    } catch (err) {
      logger.errorRequest(err);
      logger.error(`GET /${custid}/holdings - Fail ${i} times`);
      logger.error(`${i} try, wait ${2 ** i} seconds for the next try`);
      await sleep(1000 * 2 ** i);
    }
    if (res) {
      return { nbRequest: i, data: res?.data?.holdings };
    }
  }

  logger.error(`Cannot request GET /${custid}/holdings - Fail 4 times`);
  return false;
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
        url: `GET /${custid}/vendors/${vendorID}/packages/${packageID}/titles/${kbID}`,
        headers: {
          'x-api-key': apikey,
          'Content-Type': 'application/json',
        },
      });
    } catch (err) {
      logger.errorRequest(err);
      logger.error(err?.response?.data?.Errors[0]?.Message);
      logger.error(`GET /${custid}/vendors/${vendorID}/packages/${packageID}/titles/${kbID} - Fail ${i} times`);
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
        url: `GET /${custid}/vendors/${vendorID}/packages/${packageID}`,
        headers: {
          'x-api-key': apikey,
          'Content-Type': 'application/json',
        },
      });
    } catch (err) {
      logger.errorRequest(err);
      logger.error(`GET /${custid}/vendors/${vendorID}/packages/${packageID} - Fail ${i} times`);
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
