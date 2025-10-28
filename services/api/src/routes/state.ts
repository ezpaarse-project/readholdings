import type { FastifyRequest, FastifyReply, FastifyPluginAsync } from 'fastify';

import { getState } from '~/lib/state';

import all from '~/plugins/all';

import { jobUpdateState } from '~/routes/responses';

const router: FastifyPluginAsync = async (fastify) => {
  fastify.route({
    method: 'GET',
    url: '/state',
    schema: {
      tags: ['update'],
      summary: 'Get state of current job',
      description: 'Get state of current job',
      response: {
        200: {
          ...jobUpdateState
        }
      }
    },
    preHandler: all,
    handler: async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const state = await getState();
      reply.code(200).send(state);
    }
  });
};

export default router;
