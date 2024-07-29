import type { FastifyPluginAsync } from 'fastify';

import {
  pingElasticController,
  startConnectionElasticController,
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
};

export default router;
