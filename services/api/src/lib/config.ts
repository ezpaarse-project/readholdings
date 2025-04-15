import nodeConfig from 'config';

import appLogger from '~/lib/logger/appLogger';

import defaultConfig from '~/../config/default.json';

type Config = typeof defaultConfig;

export const config = nodeConfig as unknown as Config;

const appConfig: Config = JSON.parse(JSON.stringify(config));

/**
 * Hides sensitive value on config.
 *
 * @param conf App config.
 *
 * @returns Config with hidden sensitive values.
 */
function hideSecret(conf: Config): Config {
  const copyConfig = { ...conf };
  copyConfig.elasticsearch.password = '********';
  copyConfig.apikey = '********';
  const portalsName = Object.keys(copyConfig.portals) as (keyof Config['portals'])[];
  for (let i = 0; i < portalsName.length; i += 1) {
    copyConfig.portals[portalsName[i]].apiKey = '********';
  }

  return copyConfig;
}

/**
 * Log config on stdout.
 */
export function logConfig(): void {
  if (appConfig.elasticsearch.password === defaultConfig.elasticsearch.password) {
    appLogger.warn('[config]: Elasticsearch password has the default value');
  }

  const portalsName = Object.keys(appConfig.portals) as (keyof Config['portals'])[];

  for (let i = 0; i < portalsName.length; i += 1) {
    if (appConfig.portals[portalsName[i]].apiKey === defaultConfig.portals[portalsName[i]].apiKey) {
      appLogger.warn(`[config]: ${portalsName[i]} API key has the default value`);
    }
  }

  const appConfigFiltered = hideSecret(appConfig);

  appLogger.info(JSON.stringify(appConfigFiltered, null, 2));
}

/**
 * Get config without secret
 *
 * @returns Config without secret
 */
export function getConfig(): Config {
  return hideSecret(appConfig);
}
