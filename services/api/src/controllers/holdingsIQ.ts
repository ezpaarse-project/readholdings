import type { FastifyRequest, FastifyReply } from 'fastify';

import update from '~/lib/update';

/**
 * Controller to upload HLM files.
 *
 * @param _request
 * @param reply
 */
export default async function updateController(
  request: FastifyRequest,
  reply: FastifyReply,
):Promise<void> {
  update();

  // TODO return ID;
  reply.code(202);
}
