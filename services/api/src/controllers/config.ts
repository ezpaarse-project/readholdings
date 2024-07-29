import type { FastifyRequest, FastifyReply } from 'fastify';

import { getConfig } from '~/lib/config';

/**
 * Controller to get config without secrets.
 *
 * @param _request
 * @param reply
 */
export default async function getConfigController(
  _request: FastifyRequest,
  reply: FastifyReply,
):Promise<void> {
  const config = await getConfig();
  reply.code(200).send(config);
}
