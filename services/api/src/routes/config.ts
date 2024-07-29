import type { FastifyPluginAsync } from 'fastify';
import admin from '~/plugins/admin';

import getConfigController from '~/controllers/config';

const router: FastifyPluginAsync = async (fastify) => {
  fastify.route({
    method: 'GET',
    url: '/',
    schema: {},
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '1 minute',
      },
    },
    preHandler: admin,
    handler: getConfigController,
  });
};

export default router;
