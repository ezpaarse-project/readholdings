const router = require('express').Router();
const joi = require('joi');
const config = require('config');
const { format } = require('date-fns');

const createModelHoldings = require('../lib/sequelize/model');
const { flush, swapTableName } = require('../lib/service/database');
const saveSnapshot = require('../bin/job/snapshot');
const { updateCache, mergeCache } = require('../bin/update/cache');

router.post('/step/snapshot/:customerName', async (req, res, next) => {
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

  try {
    await saveSnapshot(customerName, index, date);
  } catch (err) {
    return next(err);
  }

  return res.status(200).json(true);
});

router.post('/step/cache/update/:customerName', async (req, res, next) => {
  let { customerName } = req.params;

  const checkParams = joi.string().trim().required().validate(customerName);
  if (checkParams?.error) return next('customerName are required');

  customerName = checkParams.value;

  const { custid, apikey } = config.get(`holdings.${customerName}`);

  try {
    await updateCache(custid, customerName, apikey);
  } catch (err) {
    return next(err);
  }

  return res.status(200).json(true);
});

router.post('/step/cache/merge/:customerName', async (req, res, next) => {
  let { customerName } = req.params;

  const checkParams = joi.string().trim().required().validate(customerName);
  if (checkParams?.error) return next('customerName are required');

  customerName = checkParams.value;

  const checkQuery = joi.object({
    index: joi.string().trim().default(`${new Date().getFullYear()}-holdings`),
    date: joi.string().trim().default(format(new Date(), 'yyyy-MM-dd')),
  }).validate(req.query);

  if (checkQuery?.error) return next('index must be a string');

  const { index } = checkQuery.value;

  try {
    await mergeCache(customerName, index);
  } catch (err) {
    return next(err);
  }

  return res.status(200).json(true);
});

router.post('/step/table/interchange/:customerName', async (req, res, next) => {
  let { customerName } = req.params;

  const checkParams = joi.string().trim().required().validate(customerName);
  if (checkParams?.error) return next('customerName are required');

  customerName = checkParams.value;

  try {
    await swapTableName('holdings', 'saveholdings');
  } catch (err) {
    return next(err);
  }

  return res.status(200).json(true);
});

router.post('/step/cache/flush/:customerName', async (req, res, next) => {
  let { customerName } = req.params;

  const checkParams = joi.string().trim().required().validate(customerName);
  if (checkParams?.error) return next('customerName are required');

  customerName = checkParams.value;

  const CacheModel = await createModelHoldings(`${customerName}-caches`);

  try {
    await flush(CacheModel);
  } catch (err) {
    return next(err);
  }

  return res.status(200).json(true);
});

router.post('/step/clear/:customerName', async (req, res, next) => {
  let { customerName } = req.params;

  const checkParams = joi.string().trim().required().validate(customerName);
  if (checkParams?.error) return next('customerName are required');

  customerName = checkParams.value;

  const HoldingsModel = await createModelHoldings(`${customerName}-holdings`);
  const CacheModel = await createModelHoldings(`${customerName}-caches`);

  try {
    await flush(HoldingsModel);
  } catch (err) {
    return next(err);
  }

  try {
    await flush(CacheModel);
  } catch (err) {
    return next(err);
  }

  return res.status(200).json(true);
});

module.exports = router;
