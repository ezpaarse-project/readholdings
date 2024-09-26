const path = require('path');
const fs = require('fs-extra');
const { format } = require('date-fns');
const logger = require('../../lib/logger');
const { getFilesByCustomer } = require('../utils');

const reportDir = path.resolve(__dirname, '..', '..', 'out', 'report');

/**
 * create report on the folder "out/report" on behalf of the date of treatment
 * @param {String}  - state filename
 */
async function createReport(customerName, state) {
  const pathfile = path.resolve(reportDir, customerName, `${format(new Date(), 'yyyy-MM-dd-HH-mm')}.json`);
  try {
    await fs.writeFile(pathfile, JSON.stringify(state, null, 2));
  } catch (err) {
    logger.error(`Cannot write ${JSON.stringify(state, null, 2)} in ${pathfile}`);
    logger.error(err);
  }
}

/**-
 * get report by customerName and filename
 * @param {String} filename - report filename
 * @param {String} customerName - name of costumer
 * @returns {Object} report at JSON format
 */
async function getReportByFilename(customerName, filename) {
  let report;

  try {
    report = await fs.readFile(path.resolve(reportDir, customerName, filename));
  } catch (err) {
    logger.error(`Cannot read ${path.resolve(reportDir, customerName, filename)}`);
    logger.error(err);
    return undefined;
  }
  try {
    report = JSON.parse(report);
  } catch (err) {
    logger.error(`Cannot parse "${report}" at json format`);
    logger.error(err);
    return undefined;
  }
  return report;
}

/**
 * Get reports from the folder "out/report" with 2 params
 * @param {String} customerName - name of costumer
 * @param {Boolean} latest - report filename
 * @returns {Object<Report> || Array<String>} report of list of report
 */
async function getReports(customerName, latest) {
  let reports;

  const reportCustomerDir = path.resolve(__dirname, '..', '..', 'out', 'report', customerName);

  if (customerName) {
    const filenames = await getFilesByCustomer(reportCustomerDir);

    if (latest) {
      [reports] = filenames;
    } else {
      reports = filenames;
    }
  }
  return reports;
}

module.exports = {
  getReportByFilename,
  createReport,
  getReports,
};
