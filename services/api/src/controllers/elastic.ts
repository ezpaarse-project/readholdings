import type { FastifyReply, FastifyRequest } from 'fastify';

import {
  ping as pingElastic,
  initClient as initElasticClient,
} from '~/lib/elastic';

/**
 * Controller to ping elastic.
 *
 * @param request
 * @param reply
 */
export async function pingElasticController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  await pingElastic();
  const endTime = Date.now();
  const responseTime = endTime - request.startTime;
  reply.code(200)
    .send({ message: 'Pong', responseTime })
    .headers({ 'x-response-time': responseTime });
}

/**
 * Controller to connect elastic client to elastic.
 *
 * @param request
 * @param reply
 */
export async function startConnectionElasticController(
  _request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  await initElasticClient();
  reply.code(200).send();
}
