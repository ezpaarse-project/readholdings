const logger = require('../lib/logger');

const { client } = require('../lib/sequelize/client');

async function bulk(model, data) {
  let holdings;

  const args = [
    'rhID',
    'access_type',
    'coverage_depth',
    'date_first_issue_online',
    'date_last_issue_online',
    'date_monograph_published_online',
    'date_monograph_published_print',
    'embargo_info',
    'first_author',
    'first_editor',
    'monograph_edition',
    'monograph_volume',
    'notes',
    'num_first_issue_online',
    'num_first_vol_online',
    'num_last_issue_online',
    'num_last_vol_online',
    'online_identifier',
    'package_content_type',
    'package_id',
    'package_name',
    'parent_publication_title_id',
    'preceeding_publication_title_id',
    'print_identifier',
    'publication_title',
    'publication_type',
    'publisher_name',
    'resource_type',
    'title_id',
    'title_url',
    'vendor_id',
    'vendor_name',
  ];

  try {
    holdings = await model.bulkCreate(data, { logging: false, updateOnDuplicate: args });
  } catch (err) {
    logger.error('Cannot bulk on database');
    logger.error(err);
    console.log(err);
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

async function diffID(table1, table2) {
  let ids;

  const sql = `SELECT "rhID" FROM "${table1}" AS n
  FULL OUTER JOIN "${table2}" AS o USING ("rhID") WHERE n."rhID" IS NULL OR o."rhID" IS NULL`;

  try {
    ids = await client.query(sql);
  } catch (err) {
    logger.error(`Cannot query get difference ID between tables [${table1}] and [${table2}]`);
    console.log(err);
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

async function selectAll(table) {
  try {
    await client.query(`SELECT * FROM "${table}"`);
  } catch (err) {
    logger.error(err);
    return false;
  }
  return true;
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

module.exports = {
  bulk,
  upsert,
  diffID,
  selectAll,
  selectFirst,
  selecByID,
};
