const { Sequelize } = require('sequelize');
const { database } = require('config');

const client = new Sequelize(database.database, database.user, database.password, {
  host: 'database',
  dialect: 'postgres',
});

async function ping() {
  try {
    await client.authenticate();
    return true;
  } catch (err) {
    return false;
  }
}

module.exports = {
  client,
  ping,
};
