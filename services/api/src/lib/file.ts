import { unlink, stat, readdir } from 'fs/promises';
import { join } from 'path';
import appLogger from '~/lib/logger/appLogger';

/**
 * Deletes files in a directory that are older than n time.
 *
 * @param directory Directory path.
 * @param age Max age of files in days.
 *
 * @returns List of deleted files.
 */
export default async function deleteOldFiles(directory: string, age: number) {
  const time: number = age * 24 * 60 * 60 * 1000;
  const threshold: number = Date.now() - time;

  const files: string[] = await readdir(directory);

  const deletedFiles = [];

  const promises = files.map(async (file) => {
    const filePath: string = join(directory, file);
    const fileStat = await stat(filePath);
    if (fileStat.mtime.getTime() < threshold) {
      try {
        await unlink(filePath);
        appLogger.info(`[files]: [${filePath}] is removed`);
      } catch (err) {
        appLogger.error(`[files]: Cannot remove [${filePath}]`);
        throw err;
      }
      deletedFiles.push(file);
    }
  });

  await Promise.all(promises);

  return deletedFiles;
}
