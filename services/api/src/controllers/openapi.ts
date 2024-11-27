import type { FastifyRequest, FastifyReply } from 'fastify';
import fs from 'fs';
import path from 'path';

/**
 * Controller to get OpenAPI file.
 *
 * @param _request
 * @param reply
 */
export default async function getOpenAPIController(
  _request: FastifyRequest,
  reply: FastifyReply,
):Promise<void> {
  const filePath = path.resolve(__dirname, '..', '..', 'openapi.yml');
  let fileContent;
  try {
    fileContent = fs.readFileSync(filePath, 'utf8');
    reply.type('text/yaml');
  } catch (err) {
    console.log(err);
    reply.code(500).send();
  }
  reply.code(200).send(fileContent);
}
