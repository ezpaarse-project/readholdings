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
  startConnectionRedis,
} from './lib/redis';

import rateLimiter from '~/plugins/rateLimit';

import healthcheckRouter from '~/routes/healthcheck';
import pingRouter from '~/routes/ping';
import adminRouter from '~/routes/admin';
import configRouter from '~/routes/config';
import elasticRouter from '~/routes/elastic';
import HLMRouter from '~/routes/hlm';
import holdingsIQRouter from '~/routes/holdingsIQ';
import reportRouter from '~/routes/report';
import stateRouter from '~/routes/state';
import statusRouter from '~/routes/status';
import filesRouter from '~/routes/file';
import openAPIRouter from '~/routes/openapi';

import cleanFileCron from '~/cron/cleanFile';
import updateDataCron from '~/cron/updateData';

import { logConfig, config } from '~/lib/config';

const { paths } = config;

const start = async () => {
  // create data directories
  await mkdir(resolve(paths.data.HLMDir), { recursive: true });
  await mkdir(resolve(paths.data.holdingsIQDir), { recursive: true });
  await mkdir(resolve(paths.data.reportDir), { recursive: true });

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
  await fastify.register(healthcheckRouter, { prefix: '/' });
  await fastify.register(pingRouter, { prefix: '/' });
  await fastify.register(adminRouter, { prefix: '/login' });
  await fastify.register(configRouter, { prefix: '/config' });
  await fastify.register(elasticRouter, { prefix: '/elastic' });
  await fastify.register(HLMRouter, { prefix: '/hlm' });
  await fastify.register(holdingsIQRouter, { prefix: '/holdingsIQ' });
  await fastify.register(reportRouter, { prefix: '/reports' });
  await fastify.register(stateRouter, { prefix: '/state' });
  await fastify.register(statusRouter, { prefix: '/status' });
  await fastify.register(filesRouter, { prefix: '/files' });
  await fastify.register(openAPIRouter, { prefix: '/' });

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
    await startConnectionRedis();
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
