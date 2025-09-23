import { PassThrough } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createWriteStream } from 'node:fs';
// import { unlink } from 'node:fs/promises';

import { stringify } from 'csv-stringify';

import type { Holding } from '~/models/holding';

import {
  count,
  scrollSearch,
  filtersToESQuery,
  type ESFilter,
} from '~/lib/elastic';
// import appLogger from '~/lib/logger/appLogger';

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
  const total = await count(params.index, { query }, params.signal);

  const transformer = stringify({
    header: true,
    delimiter: params.delimiter || ',',
    escape: params.escape || '"',
  });

  let current = -1; // Starts with -1 cause the first line is the CSV headers
  const notifier = new PassThrough();
  notifier.on('data', () => {
    current += 1;
    params.onProgress(total, current);
  });

  // const file = createWriteStream(params.filepath, params.encoding?.toLowerCase() || 'utf8');
  // // Delete file and throw error if aborted
  // params.signal?.addEventListener('abort', async () => {
  //   try {
  //     await unlink(params.filepath);
  //   } catch (err) {
  //     appLogger.warn(`[extract] Unable to delete [${params.filepath}] after aborting extract`);
  //   }

  //   throw new Error(params.signal?.reason ?? 'Aborted');
  // });

  // Initialize scroller
  const scroller = scrollSearch<Holding>(params.index, {
    _source: (params.fields?.length ?? 0) > 0 ? params.fields : undefined,
    query,
  }, params.signal);

  // Transform data from scroller into csv lines, notify to update the state then writes it
  return pipeline(
    scroller,
    transformer,
    notifier,
    createWriteStream(params.filepath, params.encoding || 'utf8'),
    { signal: params.signal },
  );
}
