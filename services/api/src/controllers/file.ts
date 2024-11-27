import type { FastifyRequest, FastifyReply } from 'fastify';

import path from 'path';
import fs from 'fs';
import fsp from 'fs/promises';
import { paths } from 'config';
import { getMostRecentFile, deleteFile } from '~/lib/file';

/**
 * Controller to get files installed on readholdings.
 *
 * @param request
 * @param reply
 */
export async function getFilesController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { latest } = request.query;

  if (latest) {
    let files;
    try {
      files = await getMostRecentFile(paths.data.holdingsIQDir);
    } catch (err) {
      return reply.code(404);
    }
    return reply.code(200).send(files?.filename);
  }

  const files = await fsp.readdir(paths.data.holdingsIQDir);

  return reply.code(200).send(files);
}

export async function deleteFileController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { filename } = request.params;

  if (!await fs.existsSync(path.resolve(paths.data.holdingsIQDir, filename))) {
    return reply.code(404).send({ message: `File [${filename}] not found` });
  }

  try {
    await deleteFile(path.resolve(paths.data.holdingsIQDir, filename));
  } catch (err) {
    return reply.code(500).send();
  }

  return reply.code(204).send();
}
