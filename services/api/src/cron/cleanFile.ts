import { config } from '~/lib/config';
import appLogger from '~/lib/logger/appLogger';
import Cron from '~/cron/cron';

import { deleteOldFiles } from '~/lib/file';

const { paths, cron: { cleanFile: cronConfig } } = config;

const name = 'cleanFile';


/**
 * Removes logs files after a certain time define in config.
 */
async function task(this: Cron): Promise<void> {
  appLogger.info(`[cron][${name}]: task start`);
  const deletedApplicationLogFiles = await deleteOldFiles(
    paths.log.applicationDir,
    cronConfig.applicationLogRetention,
  );
  appLogger.info(`[cron][${name}]: ${deletedApplicationLogFiles?.join(',')} (${deletedApplicationLogFiles.length}) application log files are deleted`);

  const deletedAccessLogFiles = await deleteOldFiles(
    paths.log.accessDir,
    cronConfig.accessLogRetention,
  );
  appLogger.info(`[cron][${name}]: ${deletedAccessLogFiles?.join(',')} (${deletedAccessLogFiles.length}) access log files are deleted`);

  const deletedHealthCheckLogFiles = await deleteOldFiles(
    paths.log.healthCheckDir,
    cronConfig.healthcheckLogRetention,
  );
  appLogger.info(`[cron][${name}]: ${deletedHealthCheckLogFiles?.join(',')} (${deletedHealthCheckLogFiles.length}) healthCheck log files are deleted`);

  const deletedHoldingsIQFiles = await deleteOldFiles(
    paths.data.holdingsIQDir,
    cronConfig.holdingsIQRetention,
  );
  appLogger.info(`[cron][${name}]: ${deletedHoldingsIQFiles?.join(',')} (${deletedHoldingsIQFiles.length}) HoldingsIQ files are deleted`);

  const deletedExtractsFiles = await deleteOldFiles(
    paths.data.extractDir,
    cronConfig.extractRetention,
  );
  appLogger.info(`[cron][${name}]: ${deletedExtractsFiles?.join(',')} (${deletedExtractsFiles.length}) extracts files are deleted`);

  const deletedReportsFiles = await deleteOldFiles(
    paths.data.reportDir,
    cronConfig.extractRetention,
  );
  appLogger.info(`[cron][${name}]: ${deletedReportsFiles?.join(',')} (${deletedReportsFiles.length}) reports files are deleted`);
}

const deleteFileCron = new Cron(name, cronConfig.schedule, task, cronConfig.active);

export default deleteFileCron;
