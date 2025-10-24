import path from 'node:path';
import { PassThrough } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import fs from 'node:fs';
import { unlink, readFile, writeFile } from 'node:fs/promises';

import { config } from '~/lib/config';

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

type ExtractStatus =
  | 'idle'
  | 'running'
  | 'error'
  | 'stopped';

const state = {
  status: 'idle' as ExtractStatus,
  progress: {
    percent: 0,
    current: 0,
    total: 0,
    speed: 0,
  },
  error: null as Error | null,
  filename: null as string | null,
  startedAt: null as Date | null,
  endedAt: null as Date | null,
  abortController: null as AbortController | null,
};

/**
 * Get current extraction state
 *
 * @returns The extraction state
 */
export function getState () {
  return {
    ...state,
    // Omit abort controller
    abortController: undefined,
  };
};

export type ExtractionParams = {
  // Extraction specific
  /** Comment about the extraction */
  comment?: string,
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

export type SavedExtractionParams = Omit<ExtractionParams, 'index'> & {
  /** Name of the extraction */
  name: string,
  /** Last update of the params */
  updatedAt: Date,
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
  const file = fs.createWriteStream(params.filepath, params.encoding || 'utf8');
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


/**
 * Starts an extraction in the background
 *
 * ! Override any pending extraction
 *
 * @param params Params for the extraction
 *
 * @returns The new extraction state
 */
export function startExtraction(params: ExtractionParams) {
  // Reset state
  state.error = null;
  state.endedAt = null;
  state.progress = {
    percent: 0,
    speed: 0,
    current: 0,
    total: 0,
  };
  // Update state
  state.status = 'running';
  state.startedAt = new Date();

  // Setup abort controller
  const abort = new AbortController();
  state.abortController = abort;

  // Get filename
  let filename = state.startedAt.toISOString();
  if (params.comment) {
    filename += `.${params.comment}`;
  }
  state.filename = `${filename}.csv`;
  const filepath = path.resolve(config.paths.data.extractDir, state.filename);

  let lastProgress = 0;
  appLogger.info(`[extract] Extracting data to [${filepath}]...`);

  // Starts extraction
  // Don't await as process will be handled in the background
  extractToCSV({
    ...params,
    filepath,
    signal: abort.signal,

    onProgress: (total, current) => {
      // Update state with progress
      state.progress = {
        current,
        total,
        speed: current / (new Date().getTime() - (state.startedAt?.getTime() ?? 0)),
        percent: current / total,
      };

      // Log progress every 10%
      if (state.progress.percent - lastProgress >= 0.1) {
        const percent = state.progress.percent.toLocaleString(undefined, { style: 'percent' });
        appLogger.verbose(`[extract] Extraction to [${filepath}] still going... Found [${total}] records, written [${current}] (${percent})`);
        lastProgress = state.progress.percent;
      }
    },
  })
    .then(() => {
      // Mark state as complete
      state.status = 'idle';
      state.progress.current = state.progress.total;
      state.progress.percent = 1;

      appLogger.info(`[extract] Extraction of data to [${filepath}] complete !`);
    })
    .catch((err) => {
      // Don't mark start as error if we're aborting
      if (err.name === 'AbortError') {
        return;
      }

      // Mark state as error
      state.status = 'error';
      state.error = JSON.parse(JSON.stringify(err, Object.getOwnPropertyNames(err)));

      appLogger.error('[extract] Error happened while extracting', err);
    }).finally(() => {
      // Remove abort controller reference
      state.abortController = null;
      // Update date
      state.endedAt = new Date();
    });

  return getState();
}

/**
 * Stops any extraction, if there is one
 *
 * @returns The new extraction state
 */
export function stopExtraction() {
  if (state.abortController) {
    state.status = 'stopped';
    state.abortController.abort();
    appLogger.warn('[extract] Aborting extraction !');
  }

  return getState();
}


/**
 * Read file and parse it as extraction params
 *
 * @param filepath Path to the file
 *
 * @returns Extraction params present in the file, index is omitted as index is daily
 */
export async function readSavedParamsAsJSON(
  filepath: string,
): Promise<SavedExtractionParams> {
  const file = await readFile(filepath, 'utf-8');
  const content = JSON.parse(file);

  return {
    // Default parameters
    encoding: 'utf-8',
    delimiter: ';',
    escape: '"',
    // Content of the params
    ...content,
  };
}

/**
 * Write extraction params as a file
 *
 * @param params Extraction params, index is omitted as index is daily
 * @param filepath Path to the file
 */
export async function writeSavedParamsAsJSON(
  params: ExtractionParams & { name: string },
  filepath: string,
): Promise<SavedExtractionParams> {
  const savedParams = {
    ...params,
    updatedAt: new Date(),
    index: undefined,
  };

  const content = JSON.stringify(savedParams);
  await writeFile(filepath, content, 'utf-8');

  return savedParams;
};
