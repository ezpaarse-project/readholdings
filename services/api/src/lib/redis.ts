import { createClient } from 'redis';

import util from 'util';

import { config } from '~/lib/config';
import appLogger from '~/lib/logger/appLogger';

const { redis } = config;

let redisClient = createClient({
  legacyMode: true,
  socket: {
    host: redis.host,
    port: redis.port,
  },
  password: redis.password,
});

export function getClient() {
  return redisClient;
}

export function initClient() {
  try {
    redisClient = createClient({
      legacyMode: true,
      socket: {
        host: redis.host,
        port: redis.port,
      },
      password: redis.password,
    });
    appLogger.info('[redis]: Client is created');
  } catch (err) {
    appLogger.error(`[redis]: Cannot create redis client - ${err}`);
    throw err;
  }

  redisClient.on('connect', () => {
    appLogger.info('[redis]: Status [connect]');
  });

  redisClient.on('ready', () => {
    appLogger.info('[redis]: Status [ready]');
  });

  redisClient.on('error', (err) => {
    appLogger.error(`[redis]: Status [error] [${err}]`);
  });

  redisClient.on('reconnecting', () => {
    appLogger.error('[redis]: Status [reconnecting]');
  });

  redisClient.get = util.promisify(redisClient.get);
  redisClient.del = util.promisify(redisClient.del);
  redisClient.ping = util.promisify(redisClient.ping);
  redisClient.set = util.promisify(redisClient.set);
  redisClient.keys = util.promisify(redisClient.keys);
  redisClient.flushAll = util.promisify(redisClient.flushAll);
}

/**
 * Load the dev apiKeys on redis from apikey-dev.json.
 * Using for test.
 *
 * @returns ping
 */
export async function pingRedis(): Promise<boolean> {
  try {
    await redisClient.ping();
  } catch (err) {
    appLogger.error(`[redis]: Cannot ping ${redis.host}:${redis.port}`, err);
    return false;
  }
  return true;
}

export async function startConnectionRedis() {
  try {
    await redisClient.connect();
  } catch (err) {
    appLogger.error(`[redis]: Cannot start connection to ${redis.host}:${redis.port}`, err);
    return false;
  }
  appLogger.info(`[redis]: Successfully connected to ${redis.host}:${redis.port}`);
  return true;
}
