import path from 'path';
import fs from 'fs';

import type { FastifyRequest, FastifyReply, FastifyPluginAsync } from 'fastify';
import { adminRoute } from '~/routes/helper';

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
  fastify.route(adminRoute({
    method: 'GET',
    url: '/extract',
    schema: {
      tags: ['extract'],
      summary: 'Get status of elastic extraction',
      description: 'Get status of elastic extraction',
    },
    handler: async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const files = await orderRecentFiles(extractDir);

      return reply.code(200).send({
        state: getState(),
        files,
      });
    }
  }));

  /**
   * Route to start extraction
   * Admin only.
   */
  fastify.route(adminRoute({
    method: 'POST',
    url: '/extract/_start',
    schema: {
      tags: ['extract'],
      summary: 'Start elastic extraction',
      description: 'Start elastic extraction',
    },
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
  }));

  /**
   * Route to cancel extraction
   * Admin only.
   */
  fastify.route(adminRoute({
    method: 'POST',
    url: '/extract/_stop',
    schema: {
      tags: ['extract'],
      summary: 'Stop elastic extraction',
      description: 'Stop elastic extraction',
    },
    handler: async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const state = getState();
  
      if (state.status !== 'running') {
        return reply.code(409).send({ message: 'Extraction is not running' });
      }

      return reply.code(200).send({
        state: stopExtraction(),
      });
    }
  }));

  /**
   * Route to get extraction result
   * Admin only.
   */
  fastify.route(adminRoute({
    method: 'GET',
    url: '/extract/files/:filename',
    schema: {
      tags: ['extract'],
      summary: 'Get extraction result',
      description: 'Get extraction result',
    },
    handler: async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const { filename } = request.params;

      const stream = fs.createReadStream(path.join(extractDir, filename));

      return reply.code(200).send(stream);
    }
  }));

  /**
   * Route to delete extraction result
   * Admin only.
   */
  fastify.route(adminRoute({
    method: 'DELETE',
    url: '/extract/files/:filename',
    schema: {
      tags: ['extract'],
      summary: 'Delete extraction result',
      description: 'Delete extraction result',
    },
    handler: async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const { filename } = request.params;

      await deleteFile(path.join(extractDir, filename));

      return reply.code(204).send();
    }
  }));

  /**
   * Route to get extraction saved params
   * Admin only.
   */
  fastify.route(adminRoute({
    method: 'GET',
    url: '/extract/saved-params',
    schema: {
      tags: ['extract'],
      summary: 'Get extraction saved params',
      description: 'Get extraction saved params',
    },
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
  }));

  /**
   * Route to save extraction params
   * Admin only.
   */
  fastify.route(adminRoute({
    method: 'PUT',
    url: '/extract/saved-params/:name',
    schema: {
      tags: ['extract'],
      summary: 'Save extraction params',
      description: 'Save extraction params',
    },
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
  }));

  /**
   * Route to delete extraction saved params
   * Admin only.
   */
  fastify.route(adminRoute({
    method: 'DELETE',
    url: '/extract/saved-params/:name',
    schema: {
      tags: ['extract'],
      summary: 'Delete extraction saved params',
      description: 'Delete extraction saved params',
    },
    handler: async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const { name } = request.params;

      const filename = name.toLowerCase().replace(/\s/g, '-');
      const filepath = path.resolve(extractParamsDir, `${filename}.json`);

      await deleteFile(filepath);

      return reply.code(204).send();
    }
  }));
};

export default router;
