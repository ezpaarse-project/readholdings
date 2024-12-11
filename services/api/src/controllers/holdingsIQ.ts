import type { FastifyRequest, FastifyReply } from 'fastify';

import { portals } from 'config';

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

  const portalsAvailable = Object.keys(portals);
  const { portal, forceDownload } = request.query;
  if (!portalsAvailable.includes(portal)) {
    reply.code(404);
  }

  update(portal, forceDownload);

  // TODO return ID;
  reply.code(202);
}
