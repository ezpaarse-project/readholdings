import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { paths, nodeEnv } from 'config';

const apacheFormat = winston.format.printf((info: winston.Logform.TransformableInfo) => {
  const {
    method,
    url,
    statusCode,
    contentLength,
    userAgent,
    responseTime,
  } = info.message;
  return `${info.timestamp} ${method} ${url} ${statusCode} ${contentLength} ${userAgent} ${responseTime}ms`;
});

export default winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    apacheFormat,
  ),
  transports: [
    nodeEnv === 'development' ? new winston.transports.Console() : null,
    new DailyRotateFile({
      filename: `${paths.log.accessDir}/%DATE%-access.log`,
      datePattern: 'YYYY-MM-DD',
    }),
  ],
});
