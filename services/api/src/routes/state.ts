import type { FastifyPluginAsync } from 'fastify';

import stateController from '~/controllers/state';
import all from '~/plugins/all';

const router: FastifyPluginAsync = async (fastify) => {
  fastify.route({
    method: 'GET',
    url: '/',
    schema: {},
    preHandler: all,
    handler: stateController,
  });
};

export default router;
