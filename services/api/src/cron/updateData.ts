import { config } from '~/lib/config';

import appLogger from '~/lib/logger/appLogger';
import Cron from '~/cron/cron';

import update from '~/lib/update';

const { cron: { dataUpdate: cronConfig } } = config;

/**
 * Start update with HoldingsIQ API.
 */
async function task(this: Cron): Promise<void> {
  update();
  appLogger.info(`[cron][${this.name}]: update is started`);
}

const updateDataCron = new Cron('dataUpdate', cronConfig.schedule, task, cronConfig.active);

export default updateDataCron;
