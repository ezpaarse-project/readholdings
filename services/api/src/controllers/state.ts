import type { FastifyRequest, FastifyReply } from 'fastify';

import { getState } from '~/lib/state';

/**
 * Controller to get config without secrets.
 *
 * @param _request
 * @param reply
 */
export default async function getStateController(
  _request: FastifyRequest,
  reply: FastifyReply,
):Promise<void> {
  const state = await getState();
  reply.code(200).send(state);
}
