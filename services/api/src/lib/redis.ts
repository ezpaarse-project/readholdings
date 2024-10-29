import { createClient } from 'redis';

import util from 'util';
import { redis } from 'config';
import appLogger from './logger/appLogger';

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
  redisClient.flushall = util.promisify(redisClient.flushall);
}

/**
 * Load the dev apiKeys on redis from apikey-dev.json.
 * Using for test.
 *
 * @returns {Promise<boolean>} ping
 */
export async function pingRedis() {
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
