import type { FastifyRequest, FastifyReply, FastifyPluginAsync } from 'fastify';

import { getWorkInProgress, setWorkInProgress } from '~/lib/status';

import all from '~/plugins/all';

import { adminRoute } from '~/routes/helper';

const router: FastifyPluginAsync = async (fastify) => {
  fastify.route({
    method: 'GET',
    url: '/status',
    schema: {
      tags: ['update'],
      summary: 'Get information if update job is running',
      description: 'Get information if update job is running',
      response: {
        200: {
          type: 'boolean',
        },
      }
    },
    preHandler: all,
    handler: async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const wip = await getWorkInProgress();
      reply.code(200).send(wip);
    }
  });

  fastify.route(adminRoute({
    method: 'POST',
    url: '/status',
    schema: {
      tags: ['update'],
      summary: 'Update the status of update job',
      description: 'Update the status of update job',
      body: {
        type: 'object',
        properties: {
          status: { type: 'boolean' },
        },
      },
      response: {
        200: {
          description: 'OK',
          type: 'object',
          properties: {
            status: { type: 'boolean' },
          },
        },
      }
    },
    handler: async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const status = request.body;
      setWorkInProgress(status);
      reply.code(200).send(status);
    }
  }));
};

export default router;
