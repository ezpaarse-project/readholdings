import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { mkdir } from 'fs/promises';
import { resolve } from 'path';

import appLogger from '~/lib/logger/appLogger';
import accessLogger from '~/lib/logger/access';

import {
  initClient as initClientElastic,
  ping as pingElastic,
} from '~/lib/elastic';

import rateLimiter from '~/plugins/rateLimit';

import healthcheckRouter from '~/routes/healthcheck';
import pingRouter from '~/routes/ping';
import adminRouter from '~/routes/admin';
import configRouter from '~/routes/config';
import elasticRouter from '~/routes/elastic';

import cleanLogFileCron from '~/cron/cleanLogFile';

import { logConfig, config } from '~/lib/config';

const { paths } = config;

const start = async () => {
  // create log directory
  await mkdir(resolve(paths.log.applicationDir), { recursive: true });
  await mkdir(resolve(paths.log.accessDir), { recursive: true });
  await mkdir(resolve(paths.log.healthCheckDir), { recursive: true });

  const fastify = Fastify();

  // Register cors
  await fastify.register(
    fastifyCors,
    { origin: '*' },
  );

  // Measure response time and add default data
  fastify.addHook('onRequest', async (
    request: FastifyRequest,
  ): Promise<void> => {
    request.data = {};
    request.startTime = Date.now();
  });

  // access logger and add endTime
  fastify.addHook('onResponse', async (
    request: FastifyRequest,
    reply: FastifyReply,
  ):Promise<void> => {
    request.endTime = Date.now();
    request.responseTime = request.endTime - request.startTime;

    if (request.url === '/healthcheck') {
      return;
    }

    accessLogger.info({
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      contentLength: reply.getHeader('content-length') || 0,
      userAgent: request.headers['user-agent'] || '-',
      responseTime: request.responseTime,
    });
  });

  // rate limit
  await fastify.register(rateLimiter);

  // routes
  await fastify.register(healthcheckRouter, { prefix: '/' });
  await fastify.register(pingRouter, { prefix: '/' });
  await fastify.register(adminRouter, { prefix: '/login' });
  await fastify.register(configRouter, { prefix: '/config' });
  await fastify.register(elasticRouter, { prefix: '/elastic' });

  const address = await fastify.listen({ port: 3000, host: '::' });
  appLogger.info(`[fastify]: listening at [${address}]`);

  // show config
  logConfig();

  // ping

  try {
    await initClientElastic();
    await pingElastic();
  } catch (err) {
    appLogger.error('[fastify]: Cannot initiate elastic client');
  }

  if (cleanLogFileCron.active) {
    cleanLogFileCron.start();
  }
};

start();
