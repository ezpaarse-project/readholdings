import path from 'path';
import fs from 'fs';

import { getReport, getReports } from '~/lib/report';

import all from '~/plugins/all';
import { jobUpdateState } from '~/routes/responses';

import type { FastifyRequest, FastifyReply, FastifyPluginAsync } from 'fastify';

import { config } from '~/lib/config';
const { paths } = config;

const router: FastifyPluginAsync = async (fastify) => {
  fastify.route({
    method: 'GET',
    url: '/reports',
    schema: {
      tags: ['report'],
      summary: 'Get all filename of reports',
      description: 'Get all filename of reports',
      querystring: {
        type: 'object',
        properties: {
          latest: { type: 'boolean' },
        },
      },
      response: {
        200: {
          description: 'OK',
          type: 'array',
          items: {
            type: 'string',
            example: '[1999-05-22-json, 1999-08-22-json]'
          },
        }
      }
    },
    preHandler: all,
    handler: async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const { latest } = request.query;
      let reports = await getReports();
    
      if (latest) {
        [reports] = reports;
      }
      reply.code(200).send(reports);
    }
  });

  fastify.route({
    method: 'GET',
    url: '/reports/:filename',
    schema: {
      tags: ['report'],
      summary: 'Get the content of report by filename',
      description: 'Get the content of report by filename on JSON format',
      params: {
        type: 'object',
        properties: {
          filename: { type: 'string' },
        },
      },
      response: {
        200: {
          ...jobUpdateState
        }
      }
    },
    preHandler: all,
    handler: async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const { filename } = request.params;

      try {
        await fs.existsSync(path.resolve(paths.data.reportDir, filename));
      } catch (err) {
        return reply.code(404).send({ message: `Report [${filename}] not found` });
      }
    
      const report = await getReport(filename);
      reply.code(200).send(report);
    }
  });
};

export default router;
