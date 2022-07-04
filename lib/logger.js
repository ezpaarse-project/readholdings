const {
  createLogger,
  transports,
  format,
} = require('winston');

const {
  combine,
  timestamp,
  // label,
  printf,
  colorize,
} = format;

function devFormat() {
  const formatMessage = (info) => `${info.timestamp} ${info.level}: ${info.message}`;
  const formatError = (info) => `${info.timestamp} ${info.level}: ${info.message}\n\n${info.stack}\n`;
  const form = (info) => (info instanceof Error ? formatError(info) : formatMessage(info));
  return combine(colorize(), timestamp(), printf(form));
}

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  exitOnError: false,
  transports: [
    new (transports.Console)(),
  ],
  format: devFormat(),
});

const errorRequest = (err) => {
  const url = `${err.config.baseURL}${err.config.url}`;
  if (!err.response) {
    logger.error(`Cannot ${err.config?.method} ${url} - No response`);
    return;
  }
  logger.error(`Cannot ${err.config?.method} ${url} - ${err?.response?.status}`);
};

logger.errorRequest = errorRequest;

module.exports = logger;
