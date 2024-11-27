import fsp from 'fs/promises';
import { createWriteStream } from 'fs';
import { join, extname, resolve } from 'path';
import { pipeline } from 'stream/promises';

import { paths } from 'config';
import appLogger from '~/lib/logger/appLogger';

/**
 * Deletes files in a directory that are older than n time.
 *
 * @param directory Directory path.
 * @param age Max age of files in days.
 *
 * @returns List of deleted files.
 */
export async function deleteOldFiles(directory: string, age: number) {
  const time: number = age * 24 * 60 * 60 * 1000;
  const threshold: number = Date.now() - time;

  const files: string[] = await fsp.readdir(directory);

  const deletedFiles = [];

  const promises = files.map(async (file) => {
    const filePath: string = join(directory, file);
    const fileStat = await fsp.stat(filePath);
    if (fileStat.mtime.getTime() < threshold) {
      try {
        await fsp.unlink(filePath);
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

/**
 *
 * @param parts
 */
export async function uploadFile(part) {
  if (part) {
    const fileType: string = part.mimetype;
    const fileExtension: string = extname(part.filename).toLowerCase();

    // Verify that the file is a CSV
    if (fileType !== 'text/csv' || fileExtension !== '.csv') {
      throw new Error(`Invalid file type: ${part.filename}`);
    }

    await pipeline(part.file, createWriteStream(`${paths.data.HLMDir}/${part.filename}`));
  }
}

/**
 * Get the files in a directory in order by date.
 *
 * @param {string} dir Directory path.
 *
 * @returns {Promise<Array<{filename: string, stat: import('fs').Stats}>>} list of files
 * sorted by modification date.
 */
async function orderRecentFiles(dir) {
  const filenames = await fsp.readdir(dir);

  const files = await Promise.all(
    filenames.map(async (filename) => {
      const filePath = resolve(dir, filename);
      return {
        filename,
        stat: await fsp.lstat(filePath),
      };
    }),
  );

  return files
    .filter((file) => file.stat.isFile())
    .sort((a, b) => b.stat.mtime.getTime() - a.stat.mtime.getTime());
}

/**
 * Get the most recent file in a directory.
 *
 * @param {string} dir Directory path.
 *
 * @returns most recent filepath.
 */
export async function getMostRecentFile(dir) {
  const files = await orderRecentFiles(dir);
  return files.length ? files[0] : undefined;
}

/**
 * Delete file installed on readholdings
 *
 * @param {string} filepath Filepath.
 *
 * @returns {Promise<void>}
 */
export async function deleteFile(filepath) {
  try {
    await fsp.unlink(filepath);
  } catch (err) {
    appLogger.error(`[file] Cannot remove [${filepath}]`, err);
    throw err;
  }
  appLogger.info(`[file]: [${filepath}] deleted`);
}
