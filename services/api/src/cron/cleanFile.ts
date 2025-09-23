import { config } from '~/lib/config';
import appLogger from '~/lib/logger/appLogger';
import Cron from '~/cron/cron';

import { deleteOldFiles } from '~/lib/file';

const { paths, cron: { cleanFile: cronConfig } } = config;

/**
 * Removes logs files after a certain time define in config.
 */
async function task(this: Cron): Promise<void> {
  const deletedApplicationLogFiles = await deleteOldFiles(
    paths.log.applicationDir,
    cronConfig.applicationLogRetention,
  );
  appLogger.info(`[cron][${this.name}]: ${deletedApplicationLogFiles?.join(',')} (${deletedApplicationLogFiles.length}) application log files are deleted`);

  const deletedAccessLogFiles = await deleteOldFiles(
    paths.log.accessDir,
    cronConfig.accessLogRetention,
  );
  appLogger.info(`[cron][${this.name}]: ${deletedAccessLogFiles?.join(',')} (${deletedAccessLogFiles.length}) access log files are deleted`);

  const deletedHealthCheckLogFiles = await deleteOldFiles(
    paths.log.healthCheckDir,
    cronConfig.healthcheckLogRetention,
  );
  appLogger.info(`[cron][${this.name}]: ${deletedHealthCheckLogFiles?.join(',')} (${deletedHealthCheckLogFiles.length}) healthCheck log files are deleted`);

  const deletedHoldingsIQFiles = await deleteOldFiles(
    paths.data.holdingsIQDir,
    cronConfig.holdingsIQRetention,
  );
  appLogger.info(`[cron][${this.name}]: ${deletedHoldingsIQFiles?.join(',')} (${deletedHoldingsIQFiles.length}) HoldingsIQ files are deleted`);

  const deletedHLMFiles = await deleteOldFiles(
    paths.data.HLMDir,
    cronConfig.HLMRetention,
  );
  appLogger.info(`[cron][${this.name}]: ${deletedHLMFiles?.join(',')} (${deletedHLMFiles.length}) HLM files are deleted`);

  const deletedExtractsFiles = await deleteOldFiles(
    paths.data.extractDir,
    cronConfig.extractRetention,
  );
  appLogger.info(`[cron][${this.name}]: ${deletedExtractsFiles?.join(',')} (${deletedExtractsFiles.length}) extracts files are deleted`);
}

const deleteFileCron = new Cron('cleanFile', cronConfig.schedule, task, cronConfig.active);

export default deleteFileCron;
