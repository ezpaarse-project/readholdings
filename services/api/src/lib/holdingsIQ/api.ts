import axios from 'axios';

import { config } from '~/lib/config';
import appLogger from '~/lib/logger/appLogger';

const holdingsIQ = axios.create({
  baseURL: config.holdingsIQ.baseURL,
  timeout: 20000,
});

type ApiAuth = {
  apiKey: string,
  custid: string,
};

export async function getExports(conf: ApiAuth) {
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

export async function getExportByID(conf: ApiAuth, id: string) {
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

export async function generateExport(conf: ApiAuth, type: string) {
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

export async function deleteExportByID(conf: ApiAuth, id: string) {
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
