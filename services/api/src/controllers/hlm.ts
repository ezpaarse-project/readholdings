import type { MultipartValue } from '@fastify/multipart';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { uploadFile } from '~/lib/file';
import insertCSVInElastic from '~/lib/insert';

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
  const parts = request.files();

  // eslint-disable-next-line no-restricted-syntax
  for await (const file of parts) {
    await uploadFile(file);
  }

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

  insertCSVInElastic();

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
    data.push({ filename: file.filename, portal: (file.fields[`portal-${i}`] as MultipartValue).value });
    i += 1;
  }

  insertCSVInElastic(data);

  reply.code(202);
}
