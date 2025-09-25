import type { FastifyReply, FastifyRequest } from 'fastify';

import { config } from '~/lib/config';

import {
  ping as pingElastic,
  initClient as initElasticClient,
  getReadHoldingsIndices,
  checkIndex,
  removeIndex,
  getIndexMapping,
} from '~/lib/elastic';

const { elasticsearch } = config;

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

  return reply.code(200)
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

  return reply.code(200).send();
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

  return reply.code(200).send(indices);
}

/**
 * Controller to get Index mapping.
 *
 * @param request
 * @param reply
 */
export async function getIndexMappingController(
  request: FastifyRequest<{ Params: { indexName: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const { indexName } = request.params;
  const mapping = await getIndexMapping(indexName);

  return reply.code(200).send(mapping);
}

/**
 * Controller to delete Index.
 *
 * @param request
 * @param reply
 */
export async function deleteIndexController(
  request: FastifyRequest<{ Params: { indexName: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const { indexName } = request.params;

  const isExist: boolean = await checkIndex(indexName);

  if (!isExist) {
    return reply.code(404).send();
  }

  await removeIndex(indexName);
  return reply.code(204).send();
}
