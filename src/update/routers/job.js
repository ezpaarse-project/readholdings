const router = require('express').Router();
const joi = require('joi');
const uuid = require('uuid');
const fs = require('fs-extra');
const path = require('path');
const { format } = require('date-fns');

const initiate = require('../bin/job/setup');
const update = require('../bin/job/update');

const createModelHoldings = require('../lib/sequelize/model');

const { flush } = require('../lib/service/database');

const uploadDir = path.resolve(__dirname, '..', 'out', 'upload');

router.post('/job/setup/:customerName', async (req, res, next) => {
  let { customerName } = req.params;

  const checkParams = joi.string().trim().required().validate(customerName);
  if (checkParams?.error) return next('customerName are required');

  customerName = checkParams.value;

  const checkQuery = joi.object({
    index: joi.string().trim().default(`${new Date().getFullYear()}-holdings`),
    date: joi.string().trim().default(format(new Date(), 'yyyy-MM-dd')),
  }).validate(req.query);

  if (checkQuery?.error) return next('index must be a string');

  const { index, date } = checkQuery.value;

  if (!await fs.pathExists(path.resolve(uploadDir, `${customerName}.csv`))) {
    return next(`[${`${customerName}.csv`}] file not found`);
  }

  const id = uuid.v4();
  initiate(customerName, index, date);
  return res.status(200).json({ id });
});

router.post('/job/update/:customerName', async (req, res, next) => {
  let { customerName } = req.params;

  const checkParams = joi.string().trim().required().validate(customerName);
  if (checkParams?.error) return next('customerName are required');

  customerName = checkParams.value;

  const checkQuery = joi.object({
    index: joi.string().trim().default(`${new Date().getFullYear()}-holdings`),
  }).validate(req.query);

  if (checkQuery?.error) return next('index must be a string');

  const { index } = checkQuery.value;

  const id = uuid.v4();
  update(customerName.toLowerCase(), index);
  return res.status(200).json({ id });
});

router.post('/job/reset/:customerName', async (req, res, next) => {
  let { customerName } = req.params;

  const checkParams = joi.string().trim().required().validate(customerName);
  if (checkParams?.error) return next('customerName are required');

  customerName = checkParams.value;

  const CacheModel = await createModelHoldings(`${customerName}-caches`);
  const HoldingsModel = await createModelHoldings(`${customerName}-holdings`);
  const saveholdingsModel = await createModelHoldings(`${customerName}-saveholdings`);

  flush(CacheModel);
  flush(HoldingsModel);
  flush(saveholdingsModel);

  return res.status(200).json(true);
});

module.exports = router;
