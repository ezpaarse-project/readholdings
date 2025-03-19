import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { paths } from 'config';
import { format } from 'date-fns';

const apacheFormat = winston.format.printf((info) => {
  const {
    method,
    ip,
    url,
    statusCode,
    userAgent,
    responseTime,
  } = info.message;

  const timestamp = format(new Date(info.timestamp), 'dd/MMM/yyyy:HH:mm:ss xxx');

  return `${ip || '-'} "-" [${timestamp}] "${method} ${url} HTTP/1.1" ${statusCode} - "-" "${responseTime}" "${userAgent || '-'}"`;
});

const transports = [];

if (process.env.NODE_ENV === 'test') {
  transports.push(new winston.transports.Console());
} else if (process.env.NODE_ENV === 'development') {
  transports.push(new winston.transports.Console());
  transports.push(
    new DailyRotateFile({
      filename: `${paths.log.accessDir}/%DATE%-access.log`,
      datePattern: 'YYYY-MM-DD',
    }),
  );
} else {
  transports.push(
    new DailyRotateFile({
      filename: `${paths.log.accessDir}/%DATE%-access.log`,
      datePattern: 'YYYY-MM-DD',
    }),
  );
}

const accessLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    apacheFormat,
  ),
  transports,
});

export default accessLogger;
