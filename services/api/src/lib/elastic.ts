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

/**
 * create, update, delete in bulk in elastic
 *
 * @param data
 */
export async function bulk(data) {
  let res;

  try {
    res = await elasticClient.bulk({ body: data });
  } catch (err) {
    appLogger.error('[elastic]: Cannot bulk');
    appLogger.error(JSON.stringify(err?.meta?.body?.error, null, 2));
    process.exit(1);
  }

  const items = Array.isArray(res?.body?.items) ? res?.body?.items : [];

  if (res?.body?.errors) {
    appLogger.error('[elastic]: Error in bulk');
  }

  const errors = [];

  let insertedDocs = 0;
  let updatedDocs = 0;
  let deletedDocs = 0;

  items.forEach((i) => {
    if (i?.index?.result === 'created') {
      insertedDocs += 1;
      return;
    }
    if (i?.index?.result === 'updated') {
      updatedDocs += 1;
      return;
    }
    if (i?.index?.result === 'deleted') {
      deletedDocs += 1;
      return;
    }

    if (i?.index?.error !== undefined) {
      errors.push(i?.index?.error);
      appLogger.error(JSON.stringify(i?.index?.error, null, 2));
      process.exit(1);
    }
  });

  items.forEach((i) => {
    if (i?.index?.status !== 200 && i?.index?.status !== 201) {
      if (i?.delete === undefined) {
        appLogger.error(JSON.stringify(i?.index, null, 2));
        process.exit(1);
      }
    }
  });

  return {
    insertedDocs,
    updatedDocs,
    deletedDocs,
    errors,
  };
}

/**
 * Refresh the index in elastic.
 *
 * @param indexName name of index
 */
export async function refresh(indexName: string): Promise<void> {
  try {
    await elasticClient.indices.refresh({ index: indexName }, { requestTimeout: '60s' });
  } catch (err) {
    appLogger.error(`[elastic]: Cannot refresh index [${indexName}]`);
    throw err;
  }
  appLogger.info(`[elastic]: Index [${indexName}] is refreshed`);
}

/**
 * Check if index exit.
 *
 * @param indexName Name of index
 *
 * @returns is exist
 */
export async function checkIndex(indexName: string): Promise<boolean> {
  let res;
  try {
    res = await elasticClient.indices.exists({
      index: indexName,
    });
  } catch (err) {
    appLogger.error(`[elastic]: Cannot checkIndex if index [${indexName}]`);
    throw err;
  }
  return res.body;
}

/**
 * delete index if it exist
 *
 * @param indexName Name of index
 */
export async function removeIndex(indexName: string): Promise<void> {
  const exist = await checkIndex(indexName);
  if (exist) {
    try {
      await elasticClient.indices.delete({
        index: indexName,
      });
    } catch (err) {
      appLogger.error(`[elastic]: Cannot delete index [${indexName}]`);
      throw err;
    }
    appLogger.info(`[elastic]: Index [${indexName}] is deleted`);
  }
}

/**
 * Create index if it doesn't exist.
 *
 * @param indexName Name of index
 * @param mapping mapping in JSON format
 *
 */
export async function createIndex(indexName: string, mapping): Promise<void> {
  const exist = await checkIndex(indexName);
  if (!exist) {
    try {
      await elasticClient.indices.create({
        index: indexName,
        body: mapping,
      });
    } catch (err) {
      appLogger.error(`[elastic]: Cannot create index [${indexName}]`);
      throw err;
    }
    appLogger.info(`[elastic]: Index [${indexName}] is created`);
  }
}

/**
 * Get indices on elastic.
 *
 */
export async function getIndices() {
  const res = await elasticClient.cat.indices({ format: 'json' });
  let indices = res.body;
  indices = indices.filter((index) => index.index.charAt(0) !== '.' && index.index.includes('holding'));
  return indices;
}
