import { paths, cron } from 'config';

import appLogger from '~/lib/logger/appLogger';
import Cron from '~/cron/cron';

import deleteOldFiles from '~/lib/file';

const cronConfig = cron.cleanLog;

let { active } = cronConfig;
if (active === 'true' || active) active = true;
else active = false;

/**
 * Removes logs files after a certain time define in config.
 *
 * @returns
 */
async function task(): Promise<void> {
  const deletedApplicationLogs = await deleteOldFiles(
    paths.log.applicationDir,
    cronConfig.applicationLogThreshold,
  );
  appLogger.info(`[cron][${this.name}]: ${deletedApplicationLogs?.join(',')} (${deletedApplicationLogs.length}) application log files are deleted`);

  const deletedAccessLog = await deleteOldFiles(
    paths.log.accessDir,
    cronConfig.accessLogThreshold,
  );
  appLogger.info(`[cron][${this.name}]: ${deletedAccessLog?.join(',')} (${deletedAccessLog.length}) access log files are deleted`);

  const deletedHealthCheckLog = await deleteOldFiles(
    paths.log.healthCheckDir,
    cronConfig.healthcheckLogThreshold,
  );
  appLogger.info(`[cron][${this.name}]: ${deletedHealthCheckLog?.join(',')} (${deletedHealthCheckLog.length}) healthCheck log files are deleted`);
}

const deleteFileCron = new Cron('Clean log', cronConfig.schedule, task, active);

export default deleteFileCron;
