const router = require('express').Router();
const path = require('path');
const fs = require('fs-extra');
const joi = require('joi');

const {
  getMostRecentFile,
} = require('../bin/utils');

const {
  getReports,
  getReportByFilename,
} = require('../bin/update/report');

const reportsDir = path.resolve(__dirname, '..', 'out', 'report');

router.get('/reports/customerName/:customerName', async (req, res, next) => {
  let { customerName } = req.params;
  const checkParams = joi.string().trim().required().validate(customerName);
  if (checkParams?.error) return next('customerName are required');
  customerName = checkParams.value;

  let { latest } = req.params;
  const checkQuery = joi.boolean().default(false).validate(latest);
  if (checkQuery?.error) return next('customerName are required');
  latest = checkQuery.value;

  let reports;

  if (customerName) {
    try {
      reports = await getReports(customerName, latest);
    } catch (err) {
      return next(err);
    }
    return res.status(200).json(reports);
  }

  if (latest) {
    let latestFile;
    try {
      latestFile = await getMostRecentFile(reportsDir);
    } catch (err) {
      return next(err);
    }

    if (!latestFile) {
      // 404
      return next(!latestFile);
    }

    try {
      reports = await getReportByFilename(latestFile?.filename);
    } catch (err) {
      return next(err);
    }

    return res.status(200).json(reports);
  }

  reports = await fs.readdir(reportsDir);
  return res.status(200).json(reports);
});

router.get('/reports/customerName/:customerName/filename/:filename', async (req, res, next) => {
  const { error, value } = joi.object({
    customerName: joi.string(),
    filename: joi.string(),
  }).validate(req.params);

  // TODO 400
  if (error) return next(error);

  const { customerName, filename } = value;

  try {
    await fs.stat(path.resolve(reportsDir, customerName, filename));
  } catch (err) {
    // TODO 404
    return next(err);
  }

  let report;
  try {
    report = await getReportByFilename(customerName, filename);
  } catch (err) {
    return next(err);
  }
  return res.status(200).json(report);
});

module.exports = router;
