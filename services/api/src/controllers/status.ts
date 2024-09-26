import type { FastifyRequest, FastifyReply } from 'fastify';

import { getWorkInProgress, setWorkInProgress } from '~/lib/status';

/**
 * Controller to get config without secrets.
 *
 * @param _request
 * @param reply
 */
export async function getStatusController(
  _request: FastifyRequest,
  reply: FastifyReply,
):Promise<void> {
  const wip = await getWorkInProgress();
  reply.code(200).send(wip);
}

/**
 * Controller to get config without secrets.
 *
 * @param _request
 * @param reply
 */
export async function setStatusController(
  request: FastifyRequest,
  reply: FastifyReply,
):Promise<void> {
  const status = request.body;
  setWorkInProgress(status);
  reply.code(200).send(status);
}
