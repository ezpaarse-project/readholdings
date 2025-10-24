import type { FastifyRequest, FastifyReply, FastifyPluginAsync } from 'fastify';

import fs from 'fs';
import path from 'path';

import all from '~/plugins/all';

const router: FastifyPluginAsync = async (fastify) => {
  /**
   * Route to give openapi.
   */
  fastify.route({
    method: 'GET',
    url: '/openapi.yml',
    schema: {},
    preHandler: all,
    handler: async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const filePath = path.resolve(__dirname, '..', '..', 'openapi.yml');
      let fileContent;
      try {
        fileContent = fs.readFileSync(filePath, 'utf8');
        reply.type('text/yaml');
      } catch (err) {
        reply.code(500).send();
      }
      reply.code(200).send(fileContent);
    }
  });
};

export default router;
