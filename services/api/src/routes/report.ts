import type { FastifyPluginAsync } from 'fastify';

import { getReportsController, getReportByFilenameController } from '~/controllers/report';
import all from '~/plugins/all';

const router: FastifyPluginAsync = async (fastify) => {
  fastify.route({
    method: 'GET',
    url: '/',
    schema: {},
    preHandler: all,
    handler: getReportsController,
  });

  fastify.route({
    method: 'GET',
    url: '/:filename',
    schema: {},
    preHandler: all,
    handler: getReportByFilenameController,
  });
};

export default router;
