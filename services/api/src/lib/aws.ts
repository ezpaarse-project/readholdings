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

async function download(data, filepath) {
  if (data instanceof Readable) {
    await new Promise((resolve, reject) => {
      const writeStream = data.pipe(fs.createWriteStream(filepath));

      writeStream.on('ready', async () => {
        appLogger.info('[download]: Ready');
      });

      writeStream.on('finish', async () => {
        appLogger.info('[download]: File download completed');
        return resolve(true);
      });

      writeStream.on('error', async (err) => {
        appLogger.error('[download]: Error on stream', err);
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
  await download(file, filepath);
  return filename;
}
