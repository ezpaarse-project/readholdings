import type { FastifyRequest, FastifyReply, FastifyPluginAsync } from 'fastify';

import { getWorkInProgress, setWorkInProgress } from '~/lib/status';

import all from '~/plugins/all';
import admin from '~/plugins/admin';

const router: FastifyPluginAsync = async (fastify) => {
  fastify.route({
    method: 'GET',
    url: '/',
    schema: {},
    preHandler: all,
    handler: async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const wip = await getWorkInProgress();
      reply.code(200).send(wip);
    }
  });

  fastify.route({
    method: 'POST',
    url: '/',
    schema: {},
    preHandler: admin,
    handler: async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const status = request.body;
      setWorkInProgress(status);
      reply.code(200).send(status);
    }
  });
};

export default router;
