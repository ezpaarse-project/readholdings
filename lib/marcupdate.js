const fs = require('fs-extra');
const { XMLParser } = require('fast-xml-parser');

const getIDFromXML = async (source, institute, index) => {
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
            const ezhlmid = `${institute}-${PackageID}-${VendorID}-${KBID}`;
            results.push({ delete: { _index: index, _id: ezhlmid } });

            KBID = '';
            PackageID = '';
            VendorID = '';
          }
        });
      }
    });
  });

  console.log(results);

  return results.slice();
};

module.exports = getIDFromXML;
