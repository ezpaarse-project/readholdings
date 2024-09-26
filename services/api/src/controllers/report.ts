import path from 'path';
import fs from 'fs';
import fsp from 'fs/promises';
import { paths } from 'config';

import type { FastifyRequest, FastifyReply } from 'fastify';

import { getReport, getReports } from '~/lib/report';

/**
 * Controller to get report.
 *
 * @param request
 * @param reply
 */
export async function getReportByFilenameController(
  request: FastifyRequest,
  reply: FastifyReply,
):Promise<void> {
  const { filename } = request.params;

  try {
    await fs.existsSync(path.resolve(paths.data.reportDir, filename));
  } catch (err) {
    return reply.code(404).send({ message: `Report [${filename}] not found` });
  }

  const report = await getReport(filename);
  reply.code(200).send(report);
}

/**
 * Controller to get report.
 *
 * @param request
 * @param reply
 */
export async function getReportsController(
  request: FastifyRequest,
  reply: FastifyReply,
):Promise<void> {
  const { latest } = request.query;
  let reports = await getReports();

  if (latest) {
    [reports] = reports;
  }
  reply.code(200).send(reports);
}
