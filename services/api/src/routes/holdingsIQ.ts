import type { FastifyPluginAsync } from 'fastify';
import admin from '~/plugins/admin';
import updateController from '~/controllers/holdingsIQ';

const router: FastifyPluginAsync = async (fastify) => {
  /**
   * Route to upload HLM Files
   * Admin only.
   */
  fastify.route({
    method: 'POST',
    url: '/update',
    schema: {},
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '1 minute',
      },
    },
    preHandler: admin,
    handler: updateController,
  });
};

export default router;
