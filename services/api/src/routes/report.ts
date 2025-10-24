import path from 'path';
import fs from 'fs';

import { getReport, getReports } from '~/lib/report';

import all from '~/plugins/all';

import type { FastifyRequest, FastifyReply, FastifyPluginAsync } from 'fastify';

import { config } from '~/lib/config';
const { paths } = config;

const router: FastifyPluginAsync = async (fastify) => {
  fastify.route({
    method: 'GET',
    url: '/',
    schema: {},
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
    url: '/:filename',
    schema: {},
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
