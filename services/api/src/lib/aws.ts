import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { paths } from 'config';

import appLogger from './logger/appLogger';

/**
 * @returns {Readable} Stream of snapshot.
 */
async function getFileFromAWS(url) {
  let res;
  try {
    res = await axios({
      method: 'get',
      url,
      responseType: 'stream',
    });
  } catch (err) {
    appLogger.error('[aws]: Cannot get file');
    return false;
  }
  return res;
}

async function download(portalName, data, filepath) {
  if (data instanceof Readable) {
    const totalSize = parseInt(data?.headers['content-length'], 10) || 0;
    let downloadedSize = 0;

    await new Promise((resolve, reject) => {
      data.on('data', (chunk) => {
        downloadedSize += chunk.length;
      });

      const writeStream = data.pipe(fs.createWriteStream(filepath));

      const progressInterval = setInterval(() => {
        const progress = ((downloadedSize / totalSize) * 100).toFixed(2);
        appLogger.info(`[${portalName}][download]: Progress: ${progress}%`);
      }, 5000);

      writeStream.on('ready', async () => {
        appLogger.info(`[${portalName}][download]: Ready`);
      });

      writeStream.on('finish', async () => {
        clearInterval(progressInterval);
        appLogger.info(`[${portalName}][download]: File [${filepath}] download completed`);
        return resolve(true);
      });

      writeStream.on('error', async (err) => {
        clearInterval(progressInterval);
        appLogger.error(`[${portalName}][download]: Error on stream`, err);
        return reject(err);
      });
    });
  } else {
    const writeStream = await fs.createWriteStream(filepath);
    writeStream.write(data);
    writeStream.end();
  }
}

export default async function downloadFileFromAWS(portalName, downloadLink, filename) {
  const res = await getFileFromAWS(downloadLink);
  const file = res.data;
  const filepath = path.resolve(paths.data.holdingsIQDir, filename);
  await download(portalName, file, filepath);
  return filename;
}
