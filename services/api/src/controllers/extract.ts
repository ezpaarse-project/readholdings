import { join, resolve } from 'node:path';
import { createReadStream } from 'node:fs';

import type { FastifyRequest, FastifyReply } from 'fastify';

import { config } from '~/lib/config';
import { deleteFile, orderRecentFiles } from '~/lib/file';
import appLogger from '~/lib/logger/appLogger';

import { extractToCSV, type ExtractionParams } from '~/lib/extract';

const { extractDir } = config.paths.data;

// #region State

type ExtractStatus =
  | 'idle'
  | 'running'
  | 'error'
  | 'stopped';

const state = {
  status: 'idle' as ExtractStatus,
  progress: 0,
  error: null as Error | null,
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
  state.status = 'idle';
  state.progress = 0;
  state.error = null;

  // Setup abort controller
  const abort = new AbortController();
  state.abortController = abort;

  // Get filename
  let filename = new Date().toISOString();
  if (params.name) {
    filename += `.${params.name}`;
  }
  const filepath = resolve(config.paths.data.extractDir, `${filename}.csv`);

  let lastProgress = 0;

  // Starts extraction
  // Don't await as process will be handled in the background
  extractToCSV({
    ...params,
    filepath,
    signal: abort.signal,

    onProgress: (total, current) => {
      // Update state with progress
      state.progress = current / total;

      // Log progress every 10% (+ first line written)
      if (current === 0 || state.progress - lastProgress >= 0.1) {
        const percent = state.progress.toLocaleString(undefined, { style: 'percent' });
        appLogger.verbose(`[extract] Extraction to [${filepath}] still going... Found [${total}] records, written [${current}] (${percent})`);
        lastProgress = state.progress;
      }
    },
  })
    .then(() => {
      // Mark state as complete
      state.status = 'idle';
      state.progress = 1;

      appLogger.info(`[extract] Extraction of data to [${filepath}] complete !`);
    })
    .catch((err) => {
      // Mark state as error
      state.status = 'error';
      state.error = err;

      appLogger.error('[extract] Error happened while extracting', err);
    }).finally(() => {
      // Remove abort controller reference
      state.abortController = null;
    });

  // Update state
  state.status = 'running';
  appLogger.info(`[extract] Extracting data to [${filepath}]...`);

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
    // TODO: make it looks like an error
    return reply.code(409).send({});
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
    // TODO: make it looks like an error
    return reply.code(409).send({});
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

  // TODO: catch errors that aren't not found
  await deleteFile(join(extractDir, filename));

  return reply.code(204).send();
}

// #endregion
