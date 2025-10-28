import type { FastifyPluginAsync } from 'fastify';
import { adminRoute } from '~/routes/helper';
import admin from '~/plugins/admin';

const router: FastifyPluginAsync = async (fastify) => {
  /**
   * Route to check if you are admin.
   * Admin only.
   */
  fastify.route(adminRoute({
    method: 'POST',
    url: '/login',
    schema: {
      tags: ['admin'],
      summary: 'Check if you are admin',
      description: 'Check if you are admin with x-api-key header',
    },
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '1 minute',
      },
    },
    handler: admin,
  }));
};

export default router;
