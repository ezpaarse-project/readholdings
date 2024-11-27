import type { FastifyPluginAsync } from 'fastify';
import getOpenAPIController from '~/controllers/openapi';
import all from '~/plugins/all';

const router: FastifyPluginAsync = async (fastify) => {
  /**
   * Route to give openapi.
   *
   */
  fastify.route({
    method: 'GET',
    url: '/openapi.yml',
    schema: {},
    preHandler: all,
    handler: getOpenAPIController,
  });
};

export default router;
