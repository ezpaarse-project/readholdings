import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';

import all from '~/plugins/all';

import healthcheckLogger from '~/lib/logger/healthcheck';

const router: FastifyPluginAsync = async (fastify) => {
  /**
   * Route use for healthcheck.
   */
  fastify.route({
    method: 'GET',
    url: '/healthcheck',
    schema: {},
    preHandler: [
      all,
      (request: FastifyRequest, reply: FastifyReply, done: (err?: Error) => void) => {
        // healthcheck logger
        healthcheckLogger.info({
          method: request.method,
          url: request.url,
          statusCode: reply.statusCode,
          contentLength: reply.getHeader('content-length') || 0,
          userAgent: request.headers['user-agent'] || '-',
          responseTime: `${Date.now() - request.startTime}ms`,
        });
        done();
      }],
    handler: (_request: FastifyRequest, reply: FastifyReply): void => {
      reply.code(204);
    },
  });
};

export default router;
