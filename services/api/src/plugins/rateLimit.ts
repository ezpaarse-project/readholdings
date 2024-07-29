import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';

async function rateLimitPlugin(fastify: FastifyInstance) {
  fastify.register(rateLimit, {
    global: false,
    max: 60,
    timeWindow: '1 minute',
  });
}

export default fp(rateLimitPlugin);
