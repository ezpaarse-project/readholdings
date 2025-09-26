import type { FastifyPluginAsync } from 'fastify';

import admin from '~/plugins/admin';

import {
  getExtractionController,
  getExtractStatusController,
  startExtractionController,
  stopExtractionController,
  deleteExtractionController,
  getExtractionSavedParamsController,
  updateExtractionSavedParamsController,
  deleteExtractionSavedParamsController,
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

  /**
   * Route to get extraction saved params
   * Admin only.
   */
  fastify.route({
    method: 'GET',
    url: '/saved-params',
    schema: {},
    preHandler: admin,
    handler: getExtractionSavedParamsController,
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
    handler: updateExtractionSavedParamsController,
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
    handler: deleteExtractionSavedParamsController,
  });
};

export default router;
