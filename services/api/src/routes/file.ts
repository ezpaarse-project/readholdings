import type { FastifyPluginAsync } from 'fastify';
import admin from '~/plugins/admin';
import { getFilesController, deleteFileController } from '~/controllers/file';

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
    handler: getFilesController,
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
    handler: deleteFileController,
  });
};

export default router;
