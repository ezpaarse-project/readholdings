import type { FastifyRequest, FastifyReply, FastifyPluginAsync } from 'fastify';

import path from 'path';
import fs from 'fs';
import fsp from 'fs/promises';

import { getMostRecentFile, deleteFile } from '~/lib/file';

import admin from '~/plugins/admin';

import { config } from '~/lib/config';
const { paths } = config;

const router: FastifyPluginAsync = async (fastify) => {
  /**
   * Route to get list of file installed on readholdings
   * Admin only.
   */
  fastify.route({
    method: 'GET',
    url: '/',
    schema: {},
    preHandler: admin,
    handler: async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const { latest } = request.query;

      if (latest) {
        let files;
        try {
          files = await getMostRecentFile(paths.data.holdingsIQDir);
        } catch (err) {
          return reply.code(404);
        }
        return reply.code(200).send(files?.filename);
      }
    
      const files = await fsp.readdir(paths.data.holdingsIQDir);
    
      return reply.code(200).send(files);
    },
  });

  /**
   * Route to delete file installed on readholdings
   * Admin only.
   */
  fastify.route({
    method: 'DELETE',
    url: '/:filename',
    schema: {},
    preHandler: admin,
    handler: async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const { filename } = request.params;

      if (!await fs.existsSync(path.resolve(paths.data.holdingsIQDir, filename))) {
        return reply.code(404).send({ message: `File [${filename}] not found` });
      }
    
      try {
        await deleteFile(path.resolve(paths.data.holdingsIQDir, filename));
      } catch (err) {
        return reply.code(500).send();
      }
    
      return reply.code(204).send();
    }
  });
};

export default router;
