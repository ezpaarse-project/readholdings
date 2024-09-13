import axios from 'axios';
import config from 'config';

import appLogger from '../logger/appLogger';
import { transformGetHoldings, transformGetVendorsPackages, transformGetVendorsPackagesTitles } from '~/lib/holdingsIQ/transform';

const holdingsIQ = axios.create({
  baseURL: config.holdingsIQ.baseURL,
  timeout: 20000,
});

export async function getExports(conf) {
  const { apiKey, custid } = conf;

  let res;

  try {
    res = await holdingsIQ({
      method: 'GET',
      url: `/${custid}/exports`,
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
    });
  } catch (err) {
    appLogger.error(`[holdingsIQ]: Cannot GET /${custid}/exports`);
  }

  return res?.data;
}

export async function getExportByID(conf, id) {
  const { apiKey, custid } = conf;

  let res;

  try {
    res = await holdingsIQ({
      method: 'GET',
      url: `/${custid}/exports/${id}`,
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
    });
  } catch (err) {
    appLogger.error(`[holdingsIQ]: Cannot GET /${custid}/exports/${id}`);
  }

  return res?.data;
}

export async function generateExport(conf, portal, type) {
  const { apiKey, custid } = conf;

  let res;

  const data = {
    type,
    format: 'csv',
  };

  try {
    res = await holdingsIQ({
      method: 'POST',
      url: `/${custid}/exports`,
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      data,
    });
  } catch (err) {
    appLogger.error(`[holdingsIQ]: Cannot POST /${custid}/exports`);
    throw err;
  }

  return res?.data;
}

export async function deleteExportByID(conf, id) {
  const { apiKey, custid } = conf;

  let res;

  try {
    res = await holdingsIQ({
      method: 'DELETE',
      url: `/${custid}/exports/${id}`,
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
    });
  } catch (err) {
    appLogger.error(`[holdingsIQ]: Cannot DELETE /${custid}/exports/${id}`);
  }

  appLogger.info(`[holdingsIQ]: export [${id}] is deleted`);

  return res?.data;
}

/**
 * Reload snapshot on holdings.
 *
 * @param conf Config on institute (name, apikey, custid).
 *
 * @returns number of data.
 */
export async function POSTHoldings(conf) {
  const { apikey, custid } = conf;

  let res;

  try {
    res = await holdingsIQ({
      method: 'POST',
      url: `/${custid}/holdings`,
      headers: {
        'x-api-key': apikey,
        'Content-Type': 'application/json',
      },
    });
  } catch (err) {
    appLogger.error(`[holdingsIQ]: Cannot POST /${custid}/holdings`);
  }

  return res?.data?.totalCount;
}

/**
 * Det number of data of custid
 *
 * @param conf Config on institute (name, apikey, custid)
 *
 * @returns Number of data.
 */
export async function getHoldingsStatus(conf) {
  const { apikey, custid } = conf;

  let res;

  try {
    res = await holdingsIQ({
      method: 'get',
      url: `/${custid}/holdings/status`,
      headers: {
        'x-api-key': apikey,
        'Content-Type': 'application/json',
      },
    });
  } catch (err) {
    appLogger.error(`[holdingsIQ]: Cannot get /${custid}/holdings/status`);
  }

  return res?.data;
}

/**
 * getHoldings for enrich initialization.
 *
 * @param conf Config on institute (name, apikey, custid).
 * @param count Number of documents to recover.
 * @param offset page.
 * @param index Index where the values will be inserted.
 * @param Type of bulk, if true: update bulk, else create.
 *
 * @returns Data ready to be inserted in elastic.
 */
export async function getHoldings(conf, count, offset, index) {
  const {
    apikey,
    custid,
    name,
  } = conf;

  let res;

  try {
    res = await holdingsIQ({
      method: 'get',
      url: `/${custid}/holdings`,
      params: { count, offset, format: 'kbart2' },
      headers: {
        'x-api-key': apikey,
        'Content-Type': 'application/json',
      },
    });
  } catch (err) {
    appLogger.error(`[holdingsIQ]: Cannot get /${custid}/holdings`);
    throw err;
  }

  const result = transformGetHoldings(res?.data?.holdings, name, index);
  return result;
}

/**
 * getVendorsPackages for unit enrich update
 *
 * @param conf Config on institute (apikey, custid)
 * @param vendorID VendorID
 * @param packageID PackageID
 *
 * @returns Data ready to be inserted in elastic
 */
export async function getVendorsPackages(conf, vendorID, packageID) {
  const { apikey, custid } = conf;

  let res;

  try {
    res = await holdingsIQ({
      method: 'get',
      url: `/${custid}/vendors/${vendorID}/packages/${packageID}`,
      headers: {
        'x-api-key': apikey,
        'Content-Type': 'application/json',
      },
    });
  } catch (err) {
    appLogger.error(`[holdingsIQ]: Cannot get /${custid}/vendors/${vendorID}/packages/${packageID}`);
    throw err;
  }
  const result = transformGetVendorsPackages(res?.data);
  return result;
}

/**
 * getVendorsPackagesTitles for unit enrich update
 * @param {Object} conf - config on institute (, apikey, custid)
 * @param {*} vendorID - vendorID
 * @param {*} packageID - packageID
 * @param {*} kbID - kbID
 * @returns {Object} Data ready to be inserted in elastic
 */
export async function getVendorsPackagesTitles(conf, vendorID, packageID, kbID) {
  const { apikey, custid } = conf;

  let res;

  try {
    res = await holdingsIQ({
      method: 'get',
      url: `/${custid}/vendors/${vendorID}/packages/${packageID}/titles/${kbID}`,
      headers: {
        'x-api-key': apikey,
        'Content-Type': 'application/json',
      },
    });
  } catch (err) {
    appLogger.error(`[holdingsIQ]: Cannot get /${custid}/vendors/${vendorID}/packages/${packageID}/titles/${kbID}`);
    throw err;
  }

  const result = transformGetVendorsPackagesTitles(res?.data);
  return result;
}
