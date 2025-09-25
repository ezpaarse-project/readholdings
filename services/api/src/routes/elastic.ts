import type { FastifyPluginAsync } from 'fastify';

import {
  getIndicesController,
  pingElasticController,
  startConnectionElasticController,
  getIndexMappingController,
  deleteIndexController,
} from '~/controllers/elastic';

import admin from '~/plugins/admin';
import all from '~/plugins/all';

const router: FastifyPluginAsync = async (fastify) => {
  /**
   * Route to ping elastic.
   */
  fastify.route({
    method: 'GET',
    url: '/ping',
    schema: {},
    preHandler: all,
    handler: pingElasticController,
  });

  /**
   * Route to connect elastic client to elastic.
   * Admin only.
   */
  fastify.route({
    method: 'POST',
    url: '/connect',
    schema: {},
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '1 minute',
      },
    },
    preHandler: admin,
    handler: startConnectionElasticController,
  });

  /**
   * Route to get indices.
   * Admin only.
   */
  fastify.route({
    method: 'GET',
    url: '/indices',
    schema: {},
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '1 minute',
      },
    },
    preHandler: admin,
    handler: getIndicesController,
  });

  /**
   * Route to get index mapping
   * Admin only.
   */
  fastify.route({
    method: 'GET',
    url: '/indices/:indexName',
    schema: {},
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '1 minute',
      },
    },
    preHandler: admin,
    handler: getIndexMappingController,
  });

  /**
   * Route to delete index.
   * Admin only.
   */
  fastify.route({
    method: 'DELETE',
    url: '/indices/:indexName',
    schema: {},
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '1 minute',
      },
    },
    preHandler: admin,
    handler: deleteIndexController,
  });
};

export default router;
