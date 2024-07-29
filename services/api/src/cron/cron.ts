import { CronJob } from 'cron';
import { timezone } from 'config';
import appLogger from '~/lib/logger/appLogger';

type TaskFunction = () => void | Promise<void>;

interface CronConfig {
  name: string;
  schedule: string;
  active: boolean;
}

class Cron {
  public name: string;

  public schedule: string;

  public task: TaskFunction;

  public active: boolean;

  public process: CronJob;

  /**
   * @constructor
   *
   * @param name Name of cron.
   * @param schedule Schedule of cron.
   * @param task Function that will be executed by the cron.
   * @param active Indicates whether it is active or not.
   */
  constructor(name: string, schedule: string, task: TaskFunction, active: boolean) {
    this.name = name;
    this.schedule = schedule;
    this.task = task;
    this.active = active;
    this.process = new CronJob(schedule, this.task, null, false, timezone);
  }

  get config(): CronConfig {
    return {
      name: this.name,
      schedule: this.schedule,
      active: this.active,
    };
  }

  /**
   * Set new task for cron.
   *
   * @param taskFunction that will be executed by the cron.
   */
  setTask(task: TaskFunction): void {
    this.process.stop();
    this.task = task;
    appLogger.info(`[cron][${this.name}]: task updated`);
    this.process = new CronJob(this.schedule, this.task, null, false, timezone);
    if (this.active) this.process.start();
  }

  /**
   * Set new schedule for cron.
   *
   * @param schedule Schedule of cron.
   */
  setSchedule(schedule: string): void {
    this.process.stop();
    this.schedule = schedule;
    appLogger.info(`[cron][${this.name}]: schedule is updated [${this.schedule}]`);
    this.process = new CronJob(this.schedule, async () => {
      await this.task();
    }, null, false, timezone);
    if (this.active) this.process.start();
  }

  /**
   * Make active to true.
   */
  start(): void {
    try {
      this.process.start();
      appLogger.info(`[cron][${this.name}]: started`);
      appLogger.info(`[cron][${this.name}]: schedule [${this.schedule}]`);
    } catch (err) {
      appLogger.error(`[cron][${this.name}]: Cannot start`, err);
      return;
    }
    this.active = true;
  }

  /**
   * Make active to false.
   */
  stop(): void {
    try {
      this.process.stop();
      appLogger.info(`[cron][${this.name}]: stopped`);
    } catch (err) {
      appLogger.error(`[cron][${this.name}]: Cannot stop`, err);
      return;
    }
    this.active = false;
  }
}

export default Cron;
