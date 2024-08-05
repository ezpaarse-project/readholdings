import type { FastifyReply, FastifyRequest } from 'fastify';
import { getWorkInProgress } from '~/lib/status';

export default async function workInProgress(
  _request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const wip = getWorkInProgress();
  if (wip) {
    reply.code(409).send({ error: 'There is already work in progress' });
  }
}
