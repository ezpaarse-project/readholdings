import type { FastifyPluginAsync } from 'fastify';
import admin from '~/plugins/admin';

const router: FastifyPluginAsync = async (fastify) => {
  /**
   * Route to check if you are admin.
   * Admin only.
   */
  fastify.route({
    method: 'POST',
    url: '/',
    schema: {},
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '1 minute',
      },
    },
    handler: admin,
  });
};

export default router;
