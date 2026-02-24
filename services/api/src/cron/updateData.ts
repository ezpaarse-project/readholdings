import { config } from '~/lib/config';

import appLogger from '~/lib/logger/appLogger';
import Cron from '~/cron/cron';

import update from '~/lib/update';

const { cron: { dataUpdate: cronConfig } } = config;

const name = 'dataUpdate';

/**
 * Start update with HoldingsIQ API.
 */
async function task(this: Cron): Promise<void> {
  appLogger.info(`[cron][${name}]: task start`);
  update();
  appLogger.info(`[cron][${name}]: update is started`);
  appLogger.info(`[cron][${name}]: task end`);
}

const updateDataCron = new Cron(name, cronConfig.schedule, task, cronConfig.active);

export default updateDataCron;
