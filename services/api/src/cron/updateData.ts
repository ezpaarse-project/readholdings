import { cron } from 'config';

import appLogger from '~/lib/logger/appLogger';
import Cron from '~/cron/cron';

import update from '~/lib/update';

const cronConfig = cron.dataUpdate;

let { active } = cronConfig;
if (active === 'true' || active) active = true;
else active = false;

/**
 * Start update with HoldingsIQ API.
 */
async function task(): Promise<void> {
  update();
  appLogger.info(`[cron][${this.name}]: update is started`);
}

const updateDataCron = new Cron('dataUpdate', cronConfig.schedule, task, active);

export default updateDataCron;
