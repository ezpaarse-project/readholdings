import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import admin from '~/plugins/admin';

import { getConfig } from '~/lib/config';

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
    handler: async (_request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const config = await getConfig();
      reply.code(200).send(config);
    }
  });
};

export default router;
