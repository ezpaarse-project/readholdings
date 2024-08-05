import type { FastifyPluginAsync } from 'fastify';
import admin from '~/plugins/admin';
import {
  uploadHLMFilesController,
  insertHLMFilesController,
  uploadAndInsertHLMFilesController,
} from '~/controllers/hlm';

const router: FastifyPluginAsync = async (fastify) => {
  /**
   * Route to upload HLM Files
   * Admin only.
   */
  fastify.route({
    method: 'POST',
    url: '/upload',
    schema: {},
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '1 minute',
      },
    },
    preHandler: admin,
    handler: uploadHLMFilesController,
  });

  /**
   * Route to insert HLM Files installed on API
   * Admin only.
   */
  fastify.route({
    method: 'POST',
    url: '/insert',
    schema: {},
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '1 minute',
      },
    },
    preHandler: admin,
    handler: insertHLMFilesController,
  });

  /**
   * Route to import the content of file in elastic
   * Admin only.
   */
  // TODO Check if csv file
  fastify.route({
    method: 'POST',
    url: '/import',
    schema: {},
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '1 minute',
      },
    },
    preHandler: admin,
    handler: uploadAndInsertHLMFilesController,
  });
};

export default router;
