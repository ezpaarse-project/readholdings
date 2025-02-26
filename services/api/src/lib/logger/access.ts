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
  return `${info.timestamp} ${method} ${url} ${statusCode} ${contentLength} ${userAgent} ${responseTime}`;
});

const transports = nodeEnv === 'development'
  ? [
    new winston.transports.Console(),
    new DailyRotateFile({
      filename: `${paths.log.accessDir}/%DATE%-access.log`,
      datePattern: 'YYYY-MM-DD',
    }),
  ]
  : [
    new DailyRotateFile({
      filename: `${paths.log.accessDir}/%DATE%-access.log`,
      datePattern: 'YYYY-MM-DD',
    }),
  ];

export default winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    apacheFormat,
  ),
  transports,
});
