const logger = require('../logger');

const { client } = require('../sequelize/client');

const { args } = require('../../bin/utils');

async function bulk(model, data) {
  let holdings;

  args.push('rhID');

  try {
    holdings = await model.bulkCreate(data, { logging: false, updateOnDuplicate: args });
  } catch (err) {
    logger.error('Cannot bulk on database');
    logger.error(err);
  }

  return holdings?.length;
}

async function upsert(model, data) {
  let holdings;
  try {
    holdings = await model.upsert(data, { logging: false });
  } catch (err) {
    logger.error('Cannot upsert on database');
    logger.error(err);
  }
  return holdings[0]?.dataValues;
}

async function diffID(oldTable, currentTable) {
  let ids;

  const sql = `SELECT "rhID" FROM "${oldTable}" AS o WHERE NOT EXISTS (SELECT "rhID" from "${currentTable}" WHERE "rhID" = o."rhID")`;

  try {
    ids = await client.query(sql);
  } catch (err) {
    logger.error(`Cannot query get difference ID between tables [${oldTable}] and [${currentTable}]`);
  }

  return ids[0];
}

async function selecByID(model, id) {
  let holding;
  try {
    holding = await model.findByPk(id, { logging: false });
  } catch (err) {
    logger.error(err);
    return false;
  }
  return holding?.dataValues;
}

async function selectAll(model) {
  let holdings;
  try {
    holdings = await model.findAll({ logging: false });
  } catch (err) {
    logger.error(err);
    return false;
  }
  return holdings.map((e) => e.dataValues);
}

async function selectByPage(model, limit, offset) {
  let holdings;
  try {
    holdings = await model.findAll({ limit, offset, logging: false });
  } catch (err) {
    logger.error(err);
    return false;
  }
  return holdings.map((e) => e.dataValues);
}

async function count(model) {
  let length;
  try {
    length = await model.count();
  } catch (err) {
    logger.error(err);
    return false;
  }
  return length;
}

async function flush(model) {
  try {
    await model.destroy({
      where: {},
      truncate: true,
      logging: false,
    });
    return true;
  } catch (err) {
    logger.error(err);
    return false;
  }
}

async function renameTable(table, newTable) {
  try {
    await client.query(
      `ALTER TABLE "${table}"
       RENAME TO "${newTable}"`,
      {
        raw: true,
        logging: false,
      },
    );
    return true;
  } catch (err) {
    logger.error(err);
    return false;
  }
}

async function selectFirst(table) {
  try {
    await client.query(`SELECT "rhID" FROM "${table}" LIMIT 1`);
  } catch (err) {
    logger.error(`Cannot SELECT FIRST on table [${table}]`);
    logger.error(err);
    return false;
  }
  return true;
}

async function swapTableName(table1, table2) {
  try {
    await renameTable(table1, 'tmps');
  } catch (err) {
    logger.error(`Cannot RENAME [${table1}] on [tmps]`);
    logger.error(err);
    return false;
  }

  try {
    await renameTable(table2, table1);
  } catch (err) {
    logger.error(`Cannot RENAME [${table2}] on [${table1}]`);
    logger.error(err);
    return false;
  }

  try {
    await renameTable('tmps', table2);
  } catch (err) {
    logger.error(`Cannot RENAME [tmps] on [${table2}]`);
    logger.error(err);
    return false;
  }

  return true;
}

module.exports = {
  bulk,
  upsert,
  diffID,
  selectByPage,
  selectAll,
  selectFirst,
  selecByID,
  count,
  flush,
  renameTable,
  swapTableName,
};
