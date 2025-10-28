import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import fastifyCors from '@fastify/cors';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { mkdir } from 'fs/promises';
import { resolve } from 'path';

import appLogger from '~/lib/logger/appLogger';
import accessLogger from '~/lib/logger/access';

import {
  initClient as initElasticClient,
  ping as pingElastic,
} from '~/lib/elastic';
import {
  initClient as initRedisClient,
} from './lib/redis';

import rateLimiter from '~/plugins/rateLimit';

import openapiPlugin from '~/plugins/openapi';

import healthcheckRouter from '~/routes/healthcheck';
import pingRouter from '~/routes/ping';
import adminRouter from '~/routes/admin';
import configRouter from '~/routes/config';
import elasticRouter from '~/routes/elastic';
import holdingsIQRouter from '~/routes/holdingsIQ';
import reportRouter from '~/routes/report';
import stateRouter from '~/routes/state';
import statusRouter from '~/routes/status';
import filesRouter from '~/routes/file';
import extractRouter from '~/routes/extract';

import cleanFileCron from '~/cron/cleanFile';
import updateDataCron from '~/cron/updateData';

import { logConfig, config } from '~/lib/config';

const { paths } = config;

const start = async () => {
  // create data directories
  await mkdir(resolve(paths.data.holdingsIQDir), { recursive: true });
  await mkdir(resolve(paths.data.reportDir), { recursive: true });
  await mkdir(resolve(paths.data.extractDir), { recursive: true });
  await mkdir(resolve(paths.data.extractParamsDir), { recursive: true });

  const fastify = Fastify();

  // Register the multipart plugin
  fastify.register(multipart, {
    addToBody: true,
    limits: {
      fileSize: 1000 * 1024 * 1024, // 1000 MB
    },
  });

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
      responseTime: request.responseTime.toString() ? `${request.responseTime}ms` : '-',
    });
  });

  // rate limit
  await fastify.register(rateLimiter);

  // routes
  fastify.register(openapiPlugin)
  await fastify.register(healthcheckRouter, { prefix: '/' });
  await fastify.register(pingRouter, { prefix: '/' });
  await fastify.register(adminRouter, { prefix: '/' });
  await fastify.register(configRouter, { prefix: '/' });
  await fastify.register(elasticRouter, { prefix: '/elastic' });
  await fastify.register(holdingsIQRouter, { prefix: '/holdingsIQ' });
  await fastify.register(reportRouter, { prefix: '/' });
  await fastify.register(stateRouter, { prefix: '/' });
  await fastify.register(statusRouter, { prefix: '/' });
  await fastify.register(filesRouter, { prefix: '/' });
  await fastify.register(extractRouter, { prefix: '/' });

  const address = await fastify.listen({ port: 3000, host: '::' });
  appLogger.info(`[fastify]: listening at [${address}]`);

  // show config
  logConfig();

  // ping
  try {
    await initElasticClient();
    await pingElastic();
  } catch (err) {
    appLogger.error('[fastify]: Cannot initiate elastic client');
  }

  try {
    initRedisClient();
  } catch (err) {
    appLogger.error('[fastify]: Cannot initiate redis client');
  }

  if (cleanFileCron.active) {
    cleanFileCron.start();
  }

  if (updateDataCron.active) {
    updateDataCron.start();
  }
};

start();
