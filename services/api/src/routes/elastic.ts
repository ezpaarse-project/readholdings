import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { adminRoute } from '~/routes/helper';

import {
  ping as pingElastic,
  initClient as initElasticClient,
  getReadHoldingsIndices,
  checkIndex,
  removeIndex,
  getIndexMapping,
} from '~/lib/elastic';

import { notFound } from '~/routes/responses';

import holdingMapping from '~/../mapping/holding.json';

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
    schema: {
      tags: ['elastic'],
      summary: 'Ping elastic',
      description: 'Ping elastic',
      response: {
        200: {
          description: 'Successful connection',
          type: 'null',
        },
        500: {
          description: 'Connection error with Elastic',
          type: 'string',
        },
      },
    },
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
  fastify.route(adminRoute({
    method: 'POST',
    url: '/connect',
    schema: {
      tags: ['elastic'],
      summary: 'Connect elastic client to elastic',
      description: 'Connect elastic client to elastic',
      response: {
        200: {
          description: 'Elastic client is connected',
          type: 'null',
        },
      },
    },
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '1 minute',
      },
    },
    handler: async (_request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      await initElasticClient();
      return reply.code(200).send();
    }
  }));

  /**
   * Route to get indices.
   * Admin only.
   */
  fastify.route(adminRoute({
    method: 'GET',
    url: '/indices',
    schema: {
      tags: ['elastic'],
      summary: 'Get all indices',
      description: 'Get all indices',
      response: {
        200: {
          description: 'Array of indices',
          type: 'array',
          items: {
            type: 'string',
            example: 'holdings-2025-10-27'
          },
        },
      },
    },
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '1 minute',
      },
    },
    handler: async (_request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const indices = await getReadHoldingsIndices();
      return reply.code(200).send(indices);
    }
  }));

  /**
   * Route to get index mapping
   * Admin only.
   */
  fastify.route(adminRoute({
    method: 'GET',
    url: '/indices/:indexName',
    schema: {
      tags: ['elastic'],
      summary: 'Get index mapping',
      description: 'Get index mapping',
      params: {
        type: 'object',
        properties: {
          indexName: {
            type: 'string',
            description: 'Index Names',
            examples: ['holdings-1999-08-22'],
          },
        },
        required: ['indexName'],
      },
      response: {
        200: {
          description: 'Mapping of indice',
          type: 'object',
          example: holdingMapping
        },
        404: notFound(['Index <indexName> not found'])
      },
    },
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '1 minute',
      },
    },
    handler: async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const { indexName } = request.params;
  
      const isExist: boolean = await checkIndex(indexName);

      if (!isExist) {
        return reply.code(404).send(`Index ${indexName} not found`);
      }
  
      const mapping = await getIndexMapping(indexName);
      return reply.code(200).send(mapping);
    }
  }));

  /**
   * Route to delete index.
   * Admin only.
   */
  fastify.route(adminRoute({
    method: 'DELETE',
    url: '/indices/:indexName',
    schema: {
      tags: ['elastic'],
      summary: 'Delete index by indexName',
      description: 'Delete index by indexName',
      params: {
        type: 'object',
        properties: {
          indexName: {
            type: 'string',
            description: 'Index Names',
            examples: ['holdings-1999-08-22'],
          },
        },
        required: ['indexName'],
      },
      response: {
        204: {
          description: 'Delete index started',
          type: 'null',
        },
        404: notFound(['Index <indexName>not found'])
      },
    },
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '1 minute',
      },
    },
    handler: async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const { indexName } = request.params;

      const isExist: boolean = await checkIndex(indexName);
    
      if (!isExist) {
        return reply.code(404).send(`Index ${indexName} not found`);
      }
    
      await removeIndex(indexName);
      return reply.code(204).send();
    }
  }));
};

export default router;
