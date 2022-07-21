const router = require('express').Router();
const joi = require('joi');
const uuid = require('uuid');
const fs = require('fs-extra');
const path = require('path');
const { format } = require('date-fns');

const initiate = require('../bin/job/setup');
const saveSnapshot = require('../bin/job/snapshot');
const update = require('../bin/job/update');

const uploadDir = path.resolve(__dirname, '..', 'out', 'upload');

router.post('/job/:custid/setup', async (req, res, next) => {
  const { custid } = req.params;
  let { index, date } = req.query;

  const checkParams = joi.string().trim().required().validate(custid);
  if (checkParams?.error) return next('custid are required');

  const checkQuery = joi.object({
    index: joi.string().trim().default(`${new Date().getFullYear()}-holdings`),
    date: joi.string().trim().default(format(new Date(), 'yyyy-MM-dd')),
  }).validate(req.query);

  if (checkQuery?.error) return next('index must be a string');

  index = checkQuery.value.index;
  date = checkQuery.value.date;

  if (!await fs.pathExists(path.resolve(uploadDir, `${custid}.csv`))) {
    return next(`[${`${custid}.csv`}] file not found`);
  }

  const id = uuid.v4();
  initiate(custid, index, date);
  return res.status(200).json({ id });
});

router.post('/job/:custid/snapshot', async (req, res, next) => {
  const { custid } = req.params;
  let { index, date } = req.query;

  const checkParams = joi.string().trim().required().validate(custid);
  if (checkParams?.error) return next('custid are required');

  const checkQuery = joi.object({
    index: joi.string().trim().default(`${new Date().getFullYear()}-holdings`),
    date: joi.string().trim().default(format(new Date(), 'yyyy-MM-dd')),
  }).validate(req.query);

  if (checkQuery?.error) return next('index must be a string');

  index = checkQuery.value.index;
  date = checkQuery.value.date;

  const id = uuid.v4();
  saveSnapshot(custid, index, date);
  return res.status(200).json({ id });
});

router.post('/job/:custid/update', async (req, res, next) => {
  const { custid } = req.params;
  let { index, date } = req.query;

  const checkParams = joi.string().trim().required().validate(custid);
  if (checkParams?.error) return next('custid are required');

  const checkQuery = joi.object({
    index: joi.string().trim().default(`${new Date().getFullYear()}-holdings`),
    date: joi.string().trim().default(format(new Date(), 'yyyy-MM-dd')),
  }).validate(req.query);

  if (checkQuery?.error) return next('index must be a string');

  index = checkQuery.value.index;
  date = checkQuery.value.date;

  const id = uuid.v4();
  update(custid, index, date);
  return res.status(200).json({ id });
});

router.post('/job/:custid/reset', async (req, res, next) => {
  const id = uuid.v4();
  // TODO reset
  return res.status(200).json({ id });
});

module.exports = router;
