import type { FastifyRequest, FastifyReply, FastifyPluginAsync } from 'fastify';
import path from 'path';
import fs from 'fs';
import fsp from 'fs/promises';
import { adminRoute } from '~/routes/helper';
import { notFound } from '~/routes/responses';

import { getMostRecentFile, deleteFile } from '~/lib/file';

import { config } from '~/lib/config';
const { paths } = config;

const router: FastifyPluginAsync = async (fastify) => {
  /**
   * Route to get list of file installed on readholdings
   * Admin only.
   */
  fastify.route(adminRoute({
    method: 'GET',
    url: '/files',
    schema: {
      tags: ['file'],
      summary: 'Get list of file installed on readholdings',
      description: 'Get list of file installed on readholdings',
      querystring: {
        type: 'object',
        properties: {
          latest: { type: 'boolean' },
        },
      },
      response: {
        200: {
          description: 'List of file installed on readholdings',
          type: 'array',
          items: {
            type: 'string',
          },
          example: [
            'INC-1999-08-22-STANDARD.csv',
            'INC-1999-08-22-KBART2.csv',
            'INS-1999-08-22-STANDARD.csv'
          ],
        }
      }
    },
    handler: async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const { latest } = request.query;

      if (latest) {
        let files;
        try {
          files = await getMostRecentFile(paths.data.holdingsIQDir);
        } catch (err) {
          return reply.code(500).send();
        }
        return reply.code(200).send(files?.filename);
      }
    
      const files = await fsp.readdir(paths.data.holdingsIQDir);
    
      return reply.code(200).send(files);
    },
  }));

  /**
   * Route to delete file installed on readholdings
   * Admin only.
   */
  fastify.route(adminRoute({
    method: 'DELETE',
    url: '/files/:filename',
    schema: {
      tags: ['file'],
      summary: 'Delete file installed on readholdings',
      description: 'Delete file installed on readholdings',
      response: {
        204: {
          description: 'Delete file installed on readholdings started',
          type: 'null',
        },
        404: notFound(['File [<filename>] not found'])
      }
    },
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
  }));
};

export default router;
