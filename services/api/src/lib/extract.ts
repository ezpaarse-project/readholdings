import { PassThrough } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createWriteStream } from 'node:fs';
import { unlink } from 'node:fs/promises';

import type { estypes as ES } from '@elastic/elasticsearch';
import { stringify } from 'csv-stringify';

import type { Holding } from '~/models/holding';

import appLogger from '~/lib/logger/appLogger';
import {
  count,
  scrollSearch,
  filtersToESQuery,
  type ESFilter,
} from '~/lib/elastic';

export type ExtractionParams = {
  // Extraction specific
  /** Name of the extraction */
  name?: string,
  /** Encoding of the output file */
  encoding?: BufferEncoding,

  // Elastic query
  /** Index used to query elastic */
  index: string,
  /** Fields to query, if not present all fields are queried */
  fields?: string[],
  /** Filters to apply on query */
  filters?: ESFilter[],

  // CSV result
  /** Delimiter between CSV fields */
  delimiter?: string,
  /** Character to use when needing to escape a field */
  escape?: string,
};

/**
 * Flat deep object into a record of 1 level
 *
 * @param object The object to Flat
 *
 * @return The flat object
 */
function flatObject(object: object): Record<string, unknown> {
  const entries = Object.entries(object);

  const res: [string, unknown][] = [];

  // eslint-disable-next-line no-restricted-syntax
  for (const [key, value] of entries) {
    if (value == null) {
      // eslint-disable-next-line no-continue
      continue;
    }

    if (Array.isArray(value)) {
      // throw new Error(`${key} is an array, which is unsupported`);
      // eslint-disable-next-line no-continue
      continue;
    }

    switch (typeof value) {
      case 'function':
      case 'symbol':
        throw new Error(`${key} is a ${typeof value}, which is unsupported`);

      case 'object':
        res.push(
          ...Object.entries(flatObject(value))
            .map(([subkey, subvalue]): [string, unknown] => [`${key}.${subkey}`, subvalue]),
        );
        break;

      default:
        res.push([key, value]);
        break;
    }
  }

  return Object.fromEntries(res);
}

/**
 * Transform ES hits into flat objects
 *
 * @param iterable ES hits iterable
 */
async function* holdingFlattener(
  iterable: AsyncIterable<ES.SearchHit<Holding | undefined>>,
): AsyncIterable<Record<string, unknown>> {
  // eslint-disable-next-line no-restricted-syntax
  for await (const document of iterable) {
    if (document._source) {
      yield flatObject(document._source);
    }
  }
}

/**
 * Extract data from elastic index into a CSV
 *
 * @param params Params needed to extract data
 *
 * @returns Promise that resolve when extraction is ended
 */
export async function extractToCSV(params: ExtractionParams & {
  /** Callback called when a document is processed, just before a line is added */
  onProgress: (total: number, current: number) => void,
  /** Abort signal */
  signal?: AbortSignal,
  /** Path to the CSV file */
  filepath: string,
}): Promise<void> {
  // If the signal is already aborted, immediately throw in order to reject the promise.
  // No need to listen to it at this point, as async function will handle it
  if (params.signal?.aborted) {
    throw new Error(params.signal?.reason);
  }

  // Transform filters objects into something for elastic
  const query = filtersToESQuery(params.filters ?? []);

  // Get total of document we need to extract
  const total = await count(params.index, { query });
  appLogger.info(`[extract] Found [${total}] records to extract`);

  const csvTransformer = stringify({
    header: true,
    delimiter: params.delimiter || ',',
    escape: params.escape || '"',
  });

  // Setup progress notifier
  let current = -1; // Starts with -1 cause the first line is the CSV headers
  const notifier = new PassThrough();
  notifier.on('data', () => {
    current += 1;
    params.onProgress(total, current);
  });

  // Delete file if an error occur
  const file = createWriteStream(params.filepath, params.encoding || 'utf8');
  file.on('error', async () => {
    try {
      await unlink(params.filepath);
    } catch (err) {
      appLogger.warn(`[extract] Unable to delete [${params.filepath}] after extract error`);
    }
  });

  // Initialize scroller
  const scroller = scrollSearch<Holding>(
    params.index,
    {
      _source: (params.fields?.length ?? 0) > 0 ? params.fields : undefined,
      query,
    },
    params.signal,
  );

  // Transform data from scroller into csv lines, notify to update the state then writes it
  return pipeline(
    scroller,
    holdingFlattener,
    csvTransformer,
    notifier,
    file,
    { signal: params.signal },
  );
}
