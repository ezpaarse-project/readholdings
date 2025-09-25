import { join, resolve } from 'node:path';
import { createReadStream } from 'node:fs';

import type { FastifyRequest, FastifyReply } from 'fastify';

import { config } from '~/lib/config';
import { deleteFile, orderRecentFiles } from '~/lib/file';
import appLogger from '~/lib/logger/appLogger';

import {
  extractToCSV,
  readSavedParamsAsJSON,
  writeSavedParamsAsJSON,
  type ExtractionParams,
  type SavedExtractionParams,
} from '~/lib/extract';

const { extractDir, extractParamsDir } = config.paths.data;

// #region State

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
const getState = () => ({
  ...state,
  // Omit abort controller
  abortController: undefined,
});

/**
 * Starts an extraction in the background
 *
 * ! Override any pending extraction
 *
 * @param params Params for the extraction
 *
 * @returns The new extraction state
 */
function startExtraction(params: ExtractionParams) {
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
  const filepath = resolve(config.paths.data.extractDir, state.filename);

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
function stopExtraction() {
  if (state.abortController) {
    state.status = 'stopped';
    state.abortController.abort();
    appLogger.warn('[extract] Aborting extraction !');
  }

  return getState();
}

// #endregion

// #region Route controllers

export async function getExtractStatusController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const files = await orderRecentFiles(extractDir);

  return reply.code(200).send({
    state: getState(),
    files,
  });
}

export async function startExtractionController(
  request: FastifyRequest<{ Body: ExtractionParams }>,
  reply: FastifyReply,
): Promise<void> {
  if (state.status === 'running') {
    return reply.code(409).send({ message: 'Extraction is already running' });
  }

  return reply.code(200).send({
    state: startExtraction(request.body),
  });
}

export async function stopExtractionController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  if (state.status !== 'running') {
    return reply.code(409).send({ message: 'Extraction is not running' });
  }

  return reply.code(200).send({
    state: stopExtraction(),
  });
}

export async function getExtractionController(
  request: FastifyRequest<{ Params: { filename: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const { filename } = request.params;

  const stream = createReadStream(join(extractDir, filename));

  return reply.code(200).send(stream);
}

export async function deleteExtractionController(
  request: FastifyRequest<{ Params: { filename: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const { filename } = request.params;

  await deleteFile(join(extractDir, filename));

  return reply.code(204).send();
}

export async function getExtractionSavedParamsController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const files = await orderRecentFiles(extractParamsDir);

  const savedParamsList = await Promise.all(
    files.map(async ({ filename }) => {
      const filepath = resolve(extractParamsDir, filename);
      try {
        return await readSavedParamsAsJSON(filepath);
      } catch (err) {
        appLogger.warn(`[extraction][saved-params] Unable to read saved params [${filepath}]`, err);
        return undefined;
      }
    }),
  );

  return reply.code(200).send(
    savedParamsList
      .filter((params) => !!params)
      .sort((paramsA, paramsB) => paramsA.name.localeCompare(paramsB.name)),
  );
}

export async function updateExtractionSavedParamsController(
  request: FastifyRequest<{ Params: { name: string }, Body: ExtractionParams }>,
  reply: FastifyReply,
): Promise<void> {
  const { name } = request.params;

  const filename = name.toLowerCase().replace(/\s/g, '-');
  const filepath = resolve(extractParamsDir, `${filename}.json`);

  let savedParams: SavedExtractionParams;
  try {
    savedParams = await writeSavedParamsAsJSON({ ...request.body, name }, filepath);
    appLogger.info(`[extraction][saved-params] Saved params wrote to [${filepath}]`);
  } catch (err) {
    appLogger.error(`[extraction][saved-params] Unable to write saved params [${filepath}]`, err);
    throw err;
  }

  return reply.status(200).send(savedParams);
}

export async function deleteExtractionSavedParamsController(
  request: FastifyRequest<{ Params: { name: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const { name } = request.params;

  const filename = name.toLowerCase().replace(/\s/g, '-');
  const filepath = resolve(extractParamsDir, `${filename}.json`);

  await deleteFile(filepath);

  return reply.code(204).send();
}

// #endregion
