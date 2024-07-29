import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { paths } from 'config';

const formatter = (info: winston.Logform.TransformableInfo) => `${info.timestamp}${info.label ? ` [${info.label}]` : ''} ${info.level}: ${info.message} ${(info instanceof Error ? `\n\n${info.stack}\n` : '')}`;

const baseLogger: winston.LoggerOptions = {
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV !== 'production' ? 'debug' : 'info'),
  exitOnError: false,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(formatter),
  ),
};

winston.loggers.add('app', {
  ...baseLogger,
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        winston.format.label({ label: 'app' }),
        winston.format.printf(formatter),
      ),
    }),
    new DailyRotateFile({
      filename: `${paths.log.applicationDir}/%DATE%-application.log`,
      datePattern: 'YYYY-MM-DD',
    }),
  ],
});

const appLogger = winston.loggers.get('app');
appLogger.on('error', (err) => appLogger.error(`[winston] ${err.toString()}`));

export default appLogger;
