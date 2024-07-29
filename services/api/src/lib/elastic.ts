import {
  Client,
  type ClientOptions,
  type estypes as ES,
  type ApiResponse,
} from '@elastic/elasticsearch';

import { resolve } from 'path';
import { readFileSync } from 'fs';

import { nodeEnv, elasticsearch } from 'config';

import appLogger from '~/lib/logger/appLogger';

const isProd: boolean = (nodeEnv === 'production');

const elasticNodes: string[] = elasticsearch.nodes.split(',');

let ssl: ClientOptions['ssl'] | undefined;
if (isProd) {
  let ca: string | undefined;
  const caPath = resolve(__dirname, '..', '..', 'certs', 'ca.crt');
  try {
    ca = readFileSync(caPath, 'utf8');
  } catch (err) {
    appLogger.error(`[elastic]: Cannot read elastic certificate file in [${caPath}]`, err);
  }
  ssl = {
    ca,
    rejectUnauthorized: true,
  };
}

let elasticClient: Client | undefined;

/**
 * Init elastic client.
 */
export async function initClient(): Promise<void> {
  try {
    elasticClient = new Client({
      nodes: elasticNodes,
      auth: {
        username: elasticsearch.username,
        password: elasticsearch.password,
      },
      ssl,
      requestTimeout: 5000,
    });
    appLogger.info('[elastic]: client is created');
  } catch (err) {
    appLogger.error('[elastic]: Cannot create elastic client');
  }
}

/**
 * Ping elastic service.
 *
 * @returns ping
 */
export async function ping(): Promise<boolean> {
  if (!elasticClient) {
    throw new Error('[elastic]: Elastic client is not initialized');
  }

  let elasticStatus: ApiResponse<ES.PingResponse> | undefined;

  try {
    elasticStatus = await elasticClient.ping();
  } catch (err) {
    appLogger.error(`[elastic]: Cannot ping ${elasticsearch.nodes.split(',')}`, err);
    return false;
  }

  if (elasticStatus?.statusCode !== 200) {
    appLogger.error(`[elastic]: Cannot ping ${elasticsearch.nodes.split(',')} - ${elasticStatus?.statusCode}`);
    return false;
  }

  appLogger.info(`[elastic]: Success ping to ${elasticsearch.nodes.split(',')}`);
  return true;
}

/**
 * Search labs document in elastic by ID.
 *
 * @param indexName Index name.
 * @param size Size of elements requested.
 * @param body Config of elastic request.
 *
 * @returns Elastic response
 */
export async function search(indexName: string, size: number, body: ES.SearchRequest['body']) {
  if (!elasticClient) {
    throw new Error('[elastic]: Elastic client is not initialized');
  }

  let res: any | undefined;
  try {
    res = await elasticClient.search({
      index: indexName,
      size,
      body,
    });
  } catch (err) {
    appLogger.error(`[elastic]: Cannot request elastic in index [${indexName}]`, err);
    throw err;
  }
  // eslint-disable-next-line no-underscore-dangle
  return res.body.hits.hits.map((hit) => hit._source);
}
