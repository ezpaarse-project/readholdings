import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';

import {
  ping as pingElastic,
  initClient as initElasticClient,
  getReadHoldingsIndices,
  checkIndex,
  removeIndex,
  getIndexMapping,
} from '~/lib/elastic';

import { config } from '~/lib/config';
const { elasticsearch } = config;

import admin from '~/plugins/admin';
import all from '~/plugins/all';

const router: FastifyPluginAsync = async (fastify) => {
  /**
   * Route to ping elastic.
   */
  fastify.route({
    method: 'GET',
    url: '/ping',
    schema: {},
    preHandler: all,
    handler: async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      await pingElastic();
      const endTime = Date.now();
      const responseTime = endTime - request.startTime;
    
      return reply.code(200)
        .send({ message: 'Pong', responseTime, nodes: elasticsearch.nodes })
        .headers({ 'x-response-time': responseTime });
    },
    });

  /**
   * Route to connect elastic client to elastic.
   * Admin only.
   */
  fastify.route({
    method: 'POST',
    url: '/connect',
    schema: {},
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '1 minute',
      },
    },
    preHandler: admin,
    handler: async (_request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      await initElasticClient();
      return reply.code(200).send();
    }
  });

  /**
   * Route to get indices.
   * Admin only.
   */
  fastify.route({
    method: 'GET',
    url: '/indices',
    schema: {},
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '1 minute',
      },
    },
    preHandler: admin,
    handler: async (_request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const indices = await getReadHoldingsIndices();
      return reply.code(200).send(indices);
    }
  });

  /**
   * Route to get index mapping
   * Admin only.
   */
  fastify.route({
    method: 'GET',
    url: '/indices/:indexName',
    schema: {},
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '1 minute',
      },
    },
    preHandler: admin,
    handler: async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const { indexName } = request.params;
      const mapping = await getIndexMapping(indexName);
      return reply.code(200).send(mapping);
    }
  });

  /**
   * Route to delete index.
   * Admin only.
   */
  fastify.route({
    method: 'DELETE',
    url: '/indices/:indexName',
    schema: {},
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '1 minute',
      },
    },
    preHandler: admin,
    handler: async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const { indexName } = request.params;

      const isExist: boolean = await checkIndex(indexName);
    
      if (!isExist) {
        return reply.code(404).send();
      }
    
      await removeIndex(indexName);
      return reply.code(204).send();
    }
  });
};

export default router;
