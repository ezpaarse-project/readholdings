const Client = require('ftp');

const { getConfig } = require('./config');

const connection = async () => {
  const config = await getConfig();

  const client = new Client();

  const {
    host,
    username,
    password,
  } = config?.ftp;

  const ftpConfig = {
    host,
    user: username,
    password,
    secure: true,
    secureOptions: { rejectUnauthorized: false },
  };

  client.connect(ftpConfig);
  return client;
};

module.exports = connection;
