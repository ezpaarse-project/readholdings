import axios from 'axios';
import config from 'config';

import appLogger from '../logger/appLogger';

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
    throw err;
  }

  appLogger.info(`[holdingsIQ]: export [${id}] is deleted`);

  return res?.data;
}
