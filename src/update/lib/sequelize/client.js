const { Sequelize } = require('sequelize');
const { database } = require('config');

const client = new Sequelize(database.database, database.user, database.password, {
  host: 'database',
  dialect: 'postgres',
  dialectOptions: {
    charset: 'utf-8',
  },
});

async function ping() {
  try {
    await client.authenticate({ logging: false });
    return true;
  } catch (err) {
    return false;
  }
}

module.exports = {
  client,
  ping,
};
