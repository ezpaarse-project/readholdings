import type { FastifyRequest, FastifyReply } from 'fastify';

import { getWorkInProgress } from '~/lib/status';

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
  const wip = getWorkInProgress();
  if (wip) {
    reply.code(409);
    return;
  }
  update();

  // TODO return ID;
  reply.code(202);
}
