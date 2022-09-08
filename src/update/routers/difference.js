const router = require('express').Router();
const joi = require('joi');
const logger = require('../lib/logger');
const { diffID, diffChg, selectFirst } = require('../lib/service/database');

router.get('/difference/id', async (req, res, next) => {
  let { table1, table2 } = req.query;

  const checkQuery = joi.object({
    table1: joi.string().trim(),
    table2: joi.string().trim(),
  }).validate(req.query);

  if (checkQuery?.error) return next('table must be a string');

  table1 = checkQuery.value.table1;
  table2 = checkQuery.value.table2;

  let t1;
  let t2;

  try {
    t1 = await selectFirst(table1);
  } catch (err) {
    next(err);
  }

  if (!t1) return res.status(404).json({ message: `Table [${table1}] not found` });

  try {
    t2 = await selectFirst(table2);
  } catch (err) {
    next(err);
  }

  if (!t2) return res.status(404).json({ message: `Table [${table2}] not found` });

  const ids = await diffID(table1, table2);

  logger.info(`id length difference between tables [${table1}] and [${table2}] : ${ids.length}`);

  return res.status(200).json({ id: ids });
});

module.exports = router;
