import type { FastifyPluginAsync } from 'fastify';

import admin from '~/plugins/admin';

import {
  getExtractionController,
  getExtractStatusController,
  startExtractionController,
  stopExtractionController,
  deleteExtractionController,
} from '~/controllers/extract';

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
    handler: getExtractStatusController,
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
    handler: startExtractionController,
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
    handler: stopExtractionController,
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
    handler: getExtractionController,
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
    handler: deleteExtractionController,
  });
};

export default router;
