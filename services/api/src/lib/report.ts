import path from 'path';
import fsp from 'fs/promises';
import { format } from 'date-fns';
import { config } from '~/lib/config';
import appLogger from '~/lib/logger/appLogger';

const { reportDir } = config.paths.data;

/**
 * Create report on the folder as name the date of process.
 *
 * @param state
 *
 * @returns
 */
export async function createReport(state: unknown) {
  appLogger.info('[report]: create new report');
  const filepath = path.resolve(reportDir, `${format(new Date(), "yyyy-MM-dd'T'HH:mm:ss.SSS")}.json`);
  try {
    await fsp.writeFile(filepath, JSON.stringify(state, null, 2));
  } catch (err) {
    appLogger.error(`[report] Cannot write [${JSON.stringify(state, null, 2)}] in [${filepath}]`, err);
    throw err;
  }
  appLogger.debug('[report]: report created');
  return true;
}

/**
 * Get report
 *
 * @param filename Report filename.
 *
 * @returns Report in json format.
 */
export async function getReport(filename: string): Promise<object> {
  let report;
  const pathfile = path.resolve(reportDir, filename);
  try {
    report = await fsp.readFile(pathfile, 'utf-8');
  } catch (err) {
    appLogger.error(`[report] Cannot read [${pathfile}]`, err);
    throw err;
  }

  try {
    report = JSON.parse(report);
  } catch (err) {
    appLogger.error(`[report] Cannot parse [${report}] at json format`, err);
    throw err;
  }
  return report;
}

/**
 * Get all reports filtered by date
 *
 * @returns all reports
 */
export async function getReports() {
  const reports = [];

  let reportsFilename = await fsp.readdir(reportDir);

  reportsFilename = reportsFilename.sort((a, b) => {
    // remove .json
    const date1 = a.slice(0, -5);
    const date2 = b.slice(0, -5);
    return new Date(date2).getTime() - new Date(date1).getTime();
  });

  // eslint-disable-next-line no-restricted-syntax
  for await (const filename of reportsFilename) {
    const report = await getReport(filename);
    reports.push({ filename, report });
  }

  return reports;
}
