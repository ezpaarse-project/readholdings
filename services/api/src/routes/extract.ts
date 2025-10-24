import path from 'path';
import fs from 'fs';

import type { FastifyRequest, FastifyReply, FastifyPluginAsync } from 'fastify';

import { deleteFile, orderRecentFiles } from '~/lib/file';
import appLogger from '~/lib/logger/appLogger';

import {
  getState,
  readSavedParamsAsJSON,
  writeSavedParamsAsJSON,
  startExtraction,
  stopExtraction
} from '~/lib/extract';

import type { SavedExtractionParams } from '~/lib/extract';

import admin from '~/plugins/admin';

import { config } from '~/lib/config';
const { extractDir, extractParamsDir } = config.paths.data;

const router: FastifyPluginAsync = async (fastify) => {
  /**
   * Route to get status of extraction
   * Admin only.
   */
  fastify.route({
    method: 'GET',
    url: '/',
    schema: {},
    preHandler: admin,
    handler: async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const files = await orderRecentFiles(extractDir);

      return reply.code(200).send({
        state: getState(),
        files,
      });
    }
  });

  /**
   * Route to start extraction
   * Admin only.
   */
  fastify.route({
    method: 'POST',
    url: '/_start',
    schema: {},
    preHandler: admin,
    handler: async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const state = getState();
    
      if (state.status === 'running') {
        return reply.code(409).send({ message: 'Extraction is already running' });
      }

      let tt

      try {
        tt = startExtraction(request.body);
      } catch (err) {
        console.log(err);
      }

      return reply.code(200).send(tt);
    }
  });

  /**
   * Route to cancel extraction
   * Admin only.
   */
  fastify.route({
    method: 'POST',
    url: '/_stop',
    schema: {},
    preHandler: admin,
    handler: async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const state = getState();
  
      if (state.status !== 'running') {
        return reply.code(409).send({ message: 'Extraction is not running' });
      }

      return reply.code(200).send({
        state: stopExtraction(),
      });
    }
  });

  /**
   * Route to get extraction result
   * Admin only.
   */
  fastify.route({
    method: 'GET',
    url: '/files/:filename',
    schema: {},
    preHandler: admin,
    handler: async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const { filename } = request.params;

      const stream = fs.createReadStream(path.join(extractDir, filename));

      return reply.code(200).send(stream);
    }
  });

  /**
   * Route to delete extraction result
   * Admin only.
   */
  fastify.route({
    method: 'DELETE',
    url: '/files/:filename',
    schema: {},
    preHandler: admin,
    handler: async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const { filename } = request.params;

      await deleteFile(path.join(extractDir, filename));

      return reply.code(204).send();
    }
  });

  /**
   * Route to get extraction saved params
   * Admin only.
   */
  fastify.route({
    method: 'GET',
    url: '/saved-params',
    schema: {},
    preHandler: admin,
    handler: async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const files = await orderRecentFiles(extractParamsDir);

      const savedParamsList = await Promise.all(
        files.map(async ({ filename }) => {
          const filepath = path.resolve(extractParamsDir, filename);
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
  });

  /**
   * Route to save extraction params
   * Admin only.
   */
  fastify.route({
    method: 'PUT',
    url: '/saved-params/:name',
    schema: {},
    preHandler: admin,
    handler: async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const { name } = request.params;

      const filename = name.toLowerCase().replace(/\s/g, '-');
      const filepath = path.resolve(extractParamsDir, `${filename}.json`);

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
  });

  /**
   * Route to delete extraction saved params
   * Admin only.
   */
  fastify.route({
    method: 'DELETE',
    url: '/saved-params/:name',
    schema: {},
    preHandler: admin,
    handler: async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const { name } = request.params;

      const filename = name.toLowerCase().replace(/\s/g, '-');
      const filepath = path.resolve(extractParamsDir, `${filename}.json`);

      await deleteFile(filepath);

      return reply.code(204).send();
    }
  });
};

export default router;
