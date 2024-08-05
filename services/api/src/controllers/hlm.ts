import type { FastifyRequest, FastifyReply } from 'fastify';
import type { fastifyMultipart } from '@fastify/multipart';
import { uploadFile } from '~/lib/file';
import readAndInsertCSVInElastic from '~/lib/csv';

/**
 * Controller to upload HLM files.
 *
 * @param _request
 * @param reply
 */
export async function uploadHLMFilesController(
  request: FastifyRequest,
  reply: FastifyReply,
):Promise<void> {
  const parts = request.parts();

  uploadFile(parts);

  // TODO return ID;
  reply.code(202);
}

/**
 * Controller to upload HLM files.
 *
 * @param _request
 * @param reply
 */
export async function insertHLMFilesController(
  request: FastifyRequest,
  reply: FastifyReply,
):Promise<void> {
  // TODO get config

  readAndInsertCSVInElastic();

  // TODO return ID;
  reply.code(202);
}

/**
 * Controller to upload HLM files.
 *
 * @param _request
 * @param reply
 */
export async function uploadAndInsertHLMFilesController(
  request: FastifyRequest,
  reply: FastifyReply,
):Promise<void> {
  // TODO get config

  const files = request.files();

  const data = [];

  let i = 0;

  // eslint-disable-next-line no-restricted-syntax
  for await (const file of files) {
    await uploadFile(file);
    data.push({ filename: file.filename, portal: file.fields[`portal-${i}`].value });
    i += 1;
  }

  readAndInsertCSVInElastic(data);

  reply.code(202);
}
