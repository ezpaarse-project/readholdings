import appLogger from '~/lib/logger/appLogger';

let isWorkInProgress: boolean = false;

/**
 * Setter of isWorkInProgress.
 *
 * @param status indicates if a job is in progress.
 */
export function setWorkInProgress(status: boolean): void {
  appLogger.info(`[workInProgress]: updated to [${status}]`);
  isWorkInProgress = status;
}

/**
 * Getter of isWorkInProgress.
 *
 * @returns isWorkInProgress
 */
export function getWorkInProgress(): boolean { return isWorkInProgress; }
