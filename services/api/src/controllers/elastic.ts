import type { FastifyReply, FastifyRequest } from 'fastify';
import { elasticsearch } from 'config';

import {
  ping as pingElastic,
  initClient as initElasticClient,
  getReadHoldingsIndices,
  checkIndex,
  removeIndex,
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
    .send({ message: 'Pong', responseTime, nodes: elasticsearch.nodes })
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

/**
 * Controller to get indices.
 *
 * @param request
 * @param reply
 */
export async function getIndicesController(
  _request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const indices = await getReadHoldingsIndices();
  reply.code(200).send(indices);
}

/**
 * Controller to delete Index.
 *
 * @param request
 * @param reply
 */
export async function deleteIndexController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { indexName } = request.params;
  const isExist: boolean = await checkIndex(indexName);
  if (!isExist) {
    reply.code(404).send();
  } else {
    await removeIndex(indexName);
    reply.code(204).send();
  }
}
