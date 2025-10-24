import type { FastifyRequest, FastifyReply, FastifyPluginAsync } from 'fastify';

import { getState } from '~/lib/state';

import all from '~/plugins/all';

const router: FastifyPluginAsync = async (fastify) => {
  fastify.route({
    method: 'GET',
    url: '/',
    schema: {},
    preHandler: all,
    handler: async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const state = await getState();
      reply.code(200).send(state);
    }
  });
};

export default router;
