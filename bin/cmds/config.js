const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const logger = require('../../lib/logger');

/**
 * create local config at $HOME/.config/.ezhlmrc
 */
const setConfig = async () => {
  const pathConfig = path.resolve(os.homedir(), '.config', '.ezhlmrc');
  const config = {
    url: 'http://localhost',
    port: 8080,
    user: 'elastic',
    password: 'changeme',
    institutes: '{}',
  };
  try {
    await fs.writeFile(pathConfig, JSON.stringify(config, null, 2), 'utf8');
  } catch (err) {
    logger.error(err);
  }
  logger.info(`configuration has been initialized in ${pathConfig}`);
  logger.info(JSON.stringify(config, null, 2));
};

/**
 * update the local config at $HOME/.config/.ezhlmrc
 * @param {Object} args object from commander
 */
const config = async (args) => {
  if (args.list) {
    logger.info('--url <url> elastic url');
    logger.info('--port <port> elastic port');
    logger.info('--user <user> elastic user');
    logger.info('--password <password> elastic password');
    process.exit(0);
  }
  const configPath = path.resolve(os.homedir(), '.config', '.ezhlmrc');
  if (!await fs.pathExists(configPath)) {
    await setConfig();
  }
  if (args.set) {
    await setConfig();
    process.exit(0);
  }

  const conf = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  if (args.get) {
    logger.info(JSON.stringify(conf, null, 2));
    logger.info(`from ${configPath}`);
    process.exit(0);
  }

  // update config
  if (args.url) {
    const regexURL = /^(ftp|http|https):\/\/[^ "]+$/;
    const valideURL = regexURL.test(args.url);
    if (valideURL) {
      conf.url = args.url;
    } else {
      logger.error(`'${args.url}' is not a valide URL`);
      process.exit(1);
    }
  }
  if (args.port) {
    if (Number.isNaN(args.port)) {
      logger.error(`${args.port} is not a number`);
      process.exit(1);
    }
    conf.port = args.port;
  }
  if (args.user) {
    conf.user = args.user;
  }
  if (args.password) {
    conf.password = args.password;
  }
  if (args.institutes) {
    try {
      JSON.parse(args.institutes);
    } catch (err) {
      logger.error(`${args.institutes} invalid JSON : ${err}`);
    }
    conf.institutes = args.institutes;
  }

  try {
    await fs.writeFile(configPath, JSON.stringify(conf, null, 2), 'utf8');
  } catch (err) {
    logger.error(err);
  }
  logger.info(JSON.stringify(conf, null, 2));
  logger.info(`from ${configPath}`);
  process.exit(0);
};

module.exports = {
  config,
};
