import type { FastifyRequest, FastifyReply, FastifyPluginAsync } from 'fastify';

import update from '~/lib/update';

import admin from '~/plugins/admin';
import { getWorkInProgress } from '~/lib/status';

import { config } from '~/lib/config';
const { portals } = config;

const router: FastifyPluginAsync = async (fastify) => {
  fastify.route({
    method: 'POST',
    url: '/update',
    schema: {},
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '1 minute',
      },
    },
    preHandler: admin,
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
  });
};

export default router;
