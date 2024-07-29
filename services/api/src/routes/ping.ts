import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';

import all from '~/plugins/all';

const router: FastifyPluginAsync = async (fastify) => {
  fastify.route({
    method: 'GET',
    url: '/',
    schema: {},
    preHandler: all,
    handler: async (_request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      reply.code(200).send('readholdings api service');
    },
  });

  fastify.route({
    method: 'GET',
    url: '/ping',
    schema: {},
    preHandler: all,
    handler: async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const endTime = Date.now();
      const responseTime = endTime - request.startTime;
      reply.code(200)
        .send({ message: 'Pong', responseTime })
        .headers({ 'x-response-time': responseTime });
    },
  });
};

export default router;
