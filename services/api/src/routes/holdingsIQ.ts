import type { FastifyRequest, FastifyReply, FastifyPluginAsync } from 'fastify';

import update from '~/lib/update';

import { adminRoute } from '~/routes/helper';
import { getWorkInProgress } from '~/lib/status';

import { config } from '~/lib/config';
const { portals } = config;

const router: FastifyPluginAsync = async (fastify) => {
  fastify.route(adminRoute({
    method: 'POST',
    url: '/update',
    schema: {
      tags: ['update'],
      summary: 'Start job to update holdingsIQ index',
      description: 'Start job to update holdingsIQ index',
      querystring: {
        type: 'object',
        properties: {
          portal: { type: 'string' },
          forceDownload: { type: 'boolean' },
        },
      },
      response: {
        202: {
          description: 'Accepted',
          type: 'null',
        },
      }
    },
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '1 minute',
      },
    },
    handler: async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const wip = getWorkInProgress();
      if (wip) {
        reply.code(409);
        return;
      }
    
      const portalsAvailable = Object.keys(portals);
      const { portal, forceDownload } = request.query;
      if (!portalsAvailable.includes(portal)) {
        reply.code(404);
      }
    
      update(portal, forceDownload);
    
      // TODO return ID;
      reply.code(202);
    }
  }));
};

export default router;
