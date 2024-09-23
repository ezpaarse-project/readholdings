import { paths, cron } from 'config';

import appLogger from '~/lib/logger/appLogger';
import Cron from '~/cron/cron';

import { deleteOldFiles } from '~/lib/file';

const cronConfig = cron.cleanFile;

let { active } = cronConfig;
if (active === 'true' || active) active = true;
else active = false;

/**
 * Removes logs files after a certain time define in config.
 */
async function task(): Promise<void> {
  const deletedApplicationLogFiles = await deleteOldFiles(
    paths.log.applicationDir,
    cronConfig.applicationLogThreshold,
  );
  appLogger.info(`[cron][${this.name}]: ${deletedApplicationLogFiles?.join(',')} (${deletedApplicationLogFiles.length}) application log files are deleted`);

  const deletedAccessLogFiles = await deleteOldFiles(
    paths.log.accessDir,
    cronConfig.accessLogThreshold,
  );
  appLogger.info(`[cron][${this.name}]: ${deletedAccessLogFiles?.join(',')} (${deletedAccessLogFiles.length}) access log files are deleted`);

  const deletedHealthCheckLogFiles = await deleteOldFiles(
    paths.log.healthCheckDir,
    cronConfig.healthcheckLogThreshold,
  );
  appLogger.info(`[cron][${this.name}]: ${deletedHealthCheckLogFiles?.join(',')} (${deletedHealthCheckLogFiles.length}) healthCheck log files are deleted`);

  const deletedHoldingsIQFiles = await deleteOldFiles(
    paths.data.holdingsIQDir,
    cronConfig.holdingsIQThreshold,
  );
  appLogger.info(`[cron][${this.name}]: ${deletedHoldingsIQFiles?.join(',')} (${deletedHoldingsIQFiles.length}) HoldingsIQ files are deleted`);

  const deletedHLMFiles = await deleteOldFiles(
    paths.data.HLMDir,
    cronConfig.HLMThreshold,
  );
  appLogger.info(`[cron][${this.name}]: ${deletedHLMFiles?.join(',')} (${deletedHLMFiles.length}) HLM files are deleted`);
}

const deleteFileCron = new Cron('cleanFile', cronConfig.schedule, task, active);

export default deleteFileCron;
