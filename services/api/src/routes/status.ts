import type { FastifyPluginAsync } from 'fastify';

import { getStatusController, setStatusController } from '~/controllers/status';
import all from '~/plugins/all';

const router: FastifyPluginAsync = async (fastify) => {
  fastify.route({
    method: 'GET',
    url: '/',
    schema: {},
    preHandler: all,
    handler: getStatusController,
  });

  fastify.route({
    method: 'POST',
    url: '/',
    schema: {},
    preHandler: all,
    handler: setStatusController,
  });
};

export default router;
