import {
  Client,
  ApiError,
  type ClientOptions,
  type estypes as ES,
  type ApiResponse,
} from '@elastic/elasticsearch';

import { resolve } from 'path';
import { readFileSync } from 'fs';

import appLogger from '~/lib/logger/appLogger';
import { config } from '~/lib/config';

const { nodeEnv, elasticsearch } = config;

const isProd: boolean = (nodeEnv === 'production');

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
      nodes: elasticsearch.nodes.split(','),
      auth: {
        username: elasticsearch.username,
        password: elasticsearch.password,
      },
      ssl,
      requestTimeout: elasticsearch.timeout,
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
export async function search<T = any>(
  indexName: string,
  size: number,
  body: ES.SearchRequest['body'],
) {
  if (!elasticClient) {
    throw new Error('[elastic]: Elastic client is not initialized');
  }

  let res;
  try {
    res = await elasticClient.search<ES.SearchResponse<T>>({
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
 *
 */
export async function count(
  indexName: string,
  body: ES.CountRequest['body'],
  signal?: AbortSignal,
): Promise<number> {
  if (!elasticClient) {
    throw new Error('[elastic]: Elastic client is not initialized');
  }

  // If the signal is already aborted, immediately throw in order to reject the promise.
  if (signal?.aborted) {
    throw new Error(signal?.reason);
  }

  try {
    const request = elasticClient.count<ES.CountResponse>({
      index: indexName,
      body,
    });

    // Stop request and throw error if aborted
    signal?.addEventListener('abort', () => {
      request.abort();
      throw new Error(signal.reason);
    });

    return (await request).body.count;
  } catch (err) {
    appLogger.error(`[elastic]: Cannot request elastic in index [${indexName}]`, err);
    throw err;
  }
}

/**
 * Search labs document using a scoll
 *
 * @param indexName Index name.
 * @param body Config of elastic request
 *
 * @returns Iterable over documents
 */
export async function* scrollSearch<T = unknown>(
  indexName: string,
  body: ES.SearchRequest['body'],
  signal?: AbortSignal,
): AsyncIterable<ES.SearchHit<T | undefined>> {
  if (!elasticClient) {
    throw new Error('[elastic]: Elastic client is not initialized');
  }

  // If the signal is already aborted, immediately throw in order to reject the promise.
  if (signal?.aborted) {
    throw new Error(signal?.reason);
  }

  try {
    const results = elasticClient.helpers.scrollSearch<T, ES.SearchResponse<T>>({
      index: indexName,
      body,
    });

    // Throw error if aborted
    signal?.addEventListener('abort', () => {
      throw new Error(signal.reason);
    });

    // eslint-disable-next-line no-restricted-syntax
    for await (const res of results) {
      // eslint-disable-next-line no-underscore-dangle
      yield* res.body.hits.hits;
    }
  } catch (err) {
    appLogger.error(`[elastic]: Cannot request elastic in index [${indexName}]`, err);
    throw err;
  }
}

/**
 * create, update, delete in bulk in elastic
 *
 * @param data
 */
export async function bulk<T extends Record<string, unknown> = Record<string, unknown>>(
  data: Exclude<ES.BulkRequest<T>['body'], undefined>,
) {
  if (!elasticClient) {
    throw new Error('[elastic]: Elastic client is not initialized');
  }

  let res;

  try {
    res = await elasticClient.bulk<ES.BulkResponse>({ body: data });
  } catch (err) {
    appLogger.error('[elastic]: Cannot bulk');

    const apiError = err as ApiError;
    if ('meta' in apiError) {
      appLogger.error(JSON.stringify(apiError.meta?.body?.error, null, 2));
    }
  }

  const items = Array.isArray(res?.body?.items) ? res?.body?.items : [];

  if (res?.body?.errors) {
    appLogger.error('[elastic]: Error in bulk');
  }

  const errors: ES.ErrorCause[] = [];

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
    }
  });

  items.forEach((i) => {
    if (i?.index?.status !== 200 && i?.index?.status !== 201) {
      if (i?.delete === undefined) {
        appLogger.error(JSON.stringify(i?.index, null, 2));
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
 * create, update, delete in bulk in elastic
 *
 * @param data
 */
export async function updateBulk<T extends Record<string, any> = Record<string, any>>(
  data: Exclude<ES.BulkRequest<T>['body'], undefined>,
) {
  if (!elasticClient) {
    throw new Error('[elastic]: Elastic client is not initialized');
  }

  let res;

  try {
    res = await elasticClient.bulk<ES.BulkResponse>({ body: data });
  } catch (err) {
    appLogger.error(`[elastic]: Cannot bulk - ${err instanceof Error ? err.message : err}`);
    const apiError = err as ApiError;
    if ('meta' in apiError) {
      appLogger.error(JSON.stringify(apiError.meta?.body?.error, null, 2));
    }
    throw new Error(JSON.stringify(apiError, null, 2));
  }

  const items = Array.isArray(res?.body?.items) ? res?.body?.items : [];

  if (res?.body?.errors) {
    appLogger.error('[elastic]: Error in bulk');
  }

  let updatedDocs = 0;

  items.forEach((i) => {
    if (i?.update?.status === 200) {
      updatedDocs += 1;
    }
  });

  return updatedDocs;
}

/**
 * Refresh the index in elastic.
 *
 * @param indexName name of index
 */
export async function refresh(indexName: string): Promise<void> {
  if (!elasticClient) {
    throw new Error('[elastic]: Elastic client is not initialized');
  }

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
  if (!elasticClient) {
    throw new Error('[elastic]: Elastic client is not initialized');
  }

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
  if (!elasticClient) {
    throw new Error('[elastic]: Elastic client is not initialized');
  }

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
export async function createIndex(indexName: string, mapping: any): Promise<void> {
  if (!elasticClient) {
    throw new Error('[elastic]: Elastic client is not initialized');
  }

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

export async function getIndexSettings(index: string) {
  if (!elasticClient) {
    throw new Error('[elastic]: Elastic client is not initialized');
  }

  try {
    const { body } = await elasticClient.indices.getSettings<ES.IndicesGetSettingsResponse>({
      index,
    });
    return body[index];
  } catch (err) {
    appLogger.error(`[elastic]: Cannot request settings of index [${index}]`, err);
    throw err;
  }
}

/**
 * Get indices on elastic.
 *
 */
export async function getReadHoldingsIndices() {
  if (!elasticClient) {
    throw new Error('[elastic]: Elastic client is not initialized');
  }

  const res = await elasticClient.cat.indices<ES.CatIndicesResponse>({ format: 'json', index: 'holdings*,-.*' });
  return res.body;
}

export type ESFilter = {
  name: string,
  isNot: boolean,
} & ({
  field: string,
  value?: string | string[],
} | { raw: Record<string, Record<string, unknown>> });

function filterToES(filter: ESFilter): ES.QueryDslQueryContainer {
  if ('raw' in filter) {
    return filter.raw;
  }

  if (!filter.value) {
    return { exists: { field: filter.field } };
  }

  return {
    bool: {
      filter: [{
        terms: {
          [filter.field]: Array.isArray(filter.value) ? filter.value : [filter.value],
        },
      }],
    },
  };
}

export function filtersToESQuery(filters: ESFilter[]): ES.QueryDslQueryContainer {
  const must: ES.QueryDslQueryContainer[] = [];
  const mustNot: ES.QueryDslQueryContainer[] = [];

  // eslint-disable-next-line no-restricted-syntax
  for (const filter of filters) {
    const item = filterToES(filter);
    if (filter.isNot) {
      mustNot.push(item);
    } else {
      must.push(item);
    }
  }

  return {
    bool: {
      filter: must,
      must_not: mustNot,
    },
  };
}
