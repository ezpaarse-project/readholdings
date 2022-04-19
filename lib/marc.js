const fs = require('fs-extra');
const path = require('path');
const jsZip = require('jszip');
const { XMLParser } = require('fast-xml-parser');

const logger = require('./logger');
const connection = require('./ftp');

const downloadDir = path.resolve(__dirname, '..', 'download');

const getMarcFiles = async (institution, start, end) => {
  let startDate = start;
  let endDate = end;

  const { custid, name } = institution;

  const now = Date.now();

  if (startDate && !endDate) {
    endDate = now;
  }

  if (!startDate && !endDate) {
    const oneDay = (1 * 24 * 60 * 60 * 1000);
    const lastWeek = new Date(now - (8 * oneDay));

    startDate = lastWeek;
    endDate = now;
  }
  const client = await connection();

  await new Promise((resolve) => {
    client.on('ready', () => {
      client.cwd(custid, (err1) => {
        if (err1) throw err1;
        client.list((err2, list) => {
          if (err2) throw err2;
          const newSnapshots = list
            .filter((file) => new Date(file.date).getTime() >= new Date(startDate).getTime())
            .filter((file) => new Date(file.date).getTime() <= new Date(endDate).getTime())
            .filter((file) => file.type === '-')
            .filter((file) => file.name.split('.')[1] === 'zip');
          newSnapshots.forEach((file) => {
            client.get(file.name, async (err3, stream) => {
              if (err3) throw err3;
              await fs.open(path.resolve(downloadDir, name, file.name), 'w');
              stream.pipe(fs.createWriteStream(path.resolve(downloadDir, name, file.name)));
            });
          });
          client.end();
          return resolve();
        });
      });
    });
  });
};

const unzipMarcFile = async (portal, file) => {
  let data;
  try {
    data = await fs.readFile(file);
  } catch (err) {
    logger.error(err);
  }

  let zip;
  try {
    zip = await jsZip.loadAsync(data);
  } catch (err) {
    logger.error(err);
  }

  let filenames = Object.keys(zip.files);
  filenames = filenames.filter((filename) => filename.split('.')[1] === 'xml');

  for await (const filename of filenames) {
    const fileData = await zip.files[filename].async('string');
    try {
      await fs.writeFile(path.resolve(downloadDir, portal, filename), fileData, { flag: 'a' });
    } catch (err) {
      logger.error(err);
    }
  }
};

const getIDFromXML = async (source, institute, index, type) => {
  const results = [];
  const res = await fs.readFile(source);

  const parser = new XMLParser();

  const json = parser.parse(res);

  const { record } = json?.collection;
  record.forEach((e1) => {
    const { datafield } = e1;
    datafield.forEach((e2) => {
      const { subfield } = e2;
      let KBID;
      let PackageID;
      let VendorID;
      if (Array.isArray(subfield)) {
        subfield.forEach((e3) => {
          if (typeof e3 === 'string') {
            if (e3.includes('KBID')) [, KBID] = e3.split(':');
            if (e3.includes('PkgID')) [, PackageID] = e3.split(':');
            if (e3.includes('ProviderID')) [, VendorID] = e3.split(':');
          }

          if (KBID && PackageID && VendorID) {
            const ezhlmid = `${institute}-${VendorID}-${PackageID}-${KBID}`;
            if (type === 'delete') {
              results.push({ delete: { _index: index, _id: ezhlmid } });
            }
            if (type === 'upsert') {
              results.push({ index: { _index: index, _id: ezhlmid } });
            }

            KBID = '';
            PackageID = '';
            VendorID = '';
          }
        });
      }
    });
  });

  return results.slice();
};

module.exports = {
  getMarcFiles,
  unzipMarcFile,
  getIDFromXML,
};
