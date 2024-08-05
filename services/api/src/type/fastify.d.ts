// fastify.d.ts
import 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    data: any,
    startTime: number
    endTime: number
    responseTime: number
  }
}
