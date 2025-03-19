import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

import { paths } from 'config';

const apacheFormat = winston.format.printf((info) => {
  const {
    method,
    url,
    statusCode,
    userAgent,
    responseTime,
  } = info.message;
  return `${info.timestamp} ${method} ${url} ${statusCode} ${userAgent} ${responseTime}`;
});

const transports = [];

if (process.env.NODE_ENV === 'test') {
  transports.push(new winston.transports.Console());
} else {
  transports.push(
    new DailyRotateFile({
      filename: `${paths.log.healthcheckDir}/%DATE%-healthcheck.log`,
      datePattern: 'YYYY-MM-DD',
    }),
  );
}

const healthcheckLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    apacheFormat,
  ),
  transports,
});

export default healthcheckLogger;
