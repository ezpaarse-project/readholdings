/* eslint-disable no-await-in-loop */
/* eslint-disable no-loop-func */
/* eslint-disable max-len */
const path = require('path');
const fs = require('fs-extra');
const Papa = require('papaparse');
const axios = require('axios');
const HttpsProxyAgent = require('https-proxy-agent');
const logger = require('../../lib/logger');

const httpsAgent = process.env.https_proxy && new HttpsProxyAgent(process.env.https_proxy);

const { URL } = process.env;
const { INSTITUTES } = process.env;
const { APIKEY } = process.env;
const format = 'kbart2';

const header = [
  'BibCNRS',
  'KBID',
  'Title',
  'AlternateTitle',
  'PackageName',
  'URL',
  'ProxiedURL',
  'Publisher',
  'Edition',
  'Author',
  'Editor',
  'Illustrator',
  'PrintISSN',
  'OnlineISSN',
  'PrintISBN',
  'OnlineISBN',
  'DOI',
  'PeerReviewed',
  'ManagedCoverageBegin',
  'ManagedCoverageEnd',
  'CustomCoverageBegin',
  'CustomCoverageEnd',
  'CoverageStatement',
  'Embargo',
  'CustomEmbargo',
  'Description',
  'Subject',
  'ResourceType',
  'PackageContentType',
  'CreateCustom',
  'HideOnPublicationFinder',
  'Delete',
  'OrderedThroughEBSCO',
  'IsCustom',
  'UserDefinedField1',
  'UserDefinedField2',
  'UserDefinedField3',
  'UserDefinedField4',
  'UserDefinedField5',
  'PackageType',
  'AllowEbscoToAddNewTitles',
];

const createEmptyData = () => {
  const data = {};
  header.forEach((element) => {
    data[element] = '';
  });
  return data;
};

const printAndOnlineIdentifier = (type) => (type === 'serial' ? 'ISSN' : 'ISBN');

const coverage = (data) => {
  if (!data.length) {
    return '';
  }
  return {
    begin: data.map((e) => e.beginCoverage).join('|'),
    end: data.map((e) => e.endCoverage).join('|'),
  };
};

const embargo = (data) => {
  if (data.embargoUnit === null) {
    return '';
  }
  return `${data.embargoValue} ${data.embargoUnit}`;
};

const subject = (data) => {
  if (!data.length) {
    return '';
  }
  return data.map((e) => e.subject).join(',');
};

const generalInformationsFromEbsco = async (custid, count, offset) => {
  let res;
  let i = 0;
  while (res === undefined && i < 5) {
    try {
      res = await axios({
        method: 'get',
        url: `${URL}${custid}/holdings`,
        params: { count, offset, format },
        headers: {
          'x-api-key': APIKEY,
          'Content-Type': 'application/json',
        },
        httpsAgent: (URL.startsWith('https') && httpsAgent) ? httpsAgent : undefined,
        proxy: (URL.startsWith('https') && httpsAgent) ? false : undefined,
      });
    } catch (err) {
      logger.error(`generalInformationsFromEbsco : ${err}`);
    }
    i += 1;
    logger.info('generalInformationsFromEbsco success');
  }
  return res?.data?.holdings;
};

const additionalInformationFromsEbsco = async (custid, vendorid, packageid, kbid) => {
  let res;
  try {
    res = await axios({
      method: 'get',
      url: `${URL}${custid}/vendors/${vendorid}/packages/${packageid}/titles/${kbid}`,
      headers: {
        'x-api-key': APIKEY,
        'Content-Type': 'application/json',
      },
      httpsAgent: (URL.startsWith('https') && httpsAgent) ? httpsAgent : undefined,
      proxy: (URL.startsWith('https') && httpsAgent) ? false : undefined,
    });
  } catch (err) {
    logger.error(`additionalInformationFromsEbsco : ${err}`);
    process.exit(1);
  }
  logger.info('additionalInformationFromsEbsco success');
  return res.data;
};

const createData = (firstData, moreInfo, institute) => {
  const final = createEmptyData();
  final.BibCNRS = institute;
  final.KBID = firstData?.title_id;
  final.Title = firstData?.publication_title;
  // 7 AlternateTitle
  final.PackageName = firstData?.package_name;
  final.URL = firstData?.title_url;
  final.ProxiedURL = `http://${institute.toLowerCase()}.bib.cnrs.fr/login?url=${final.URL}`;
  final.Publisher = firstData?.publisher_name; // 11
  final.Edition = moreInfo?.edition; // 12
  final.Author = firstData?.first_author; // 13
  final.Editor = firstData?.first_editor; // 14

  // 15 Illustrator

  const type = printAndOnlineIdentifier(firstData.publication_type);
  if (type === 'ISSN') {
    final.PrintISSN = firstData?.print_identifier;
    final.OnlineISSN = firstData?.online_identifier;
    final.PrintISBN = '';
    final.OnlineISBN = '';
  } else {
    final.PrintISBN = firstData?.print_identifier;
    final.OnlineISBN = firstData?.online_identifier;
    final.PrintISSN = '';
    final.OnlineISSN = '';
  }

  // 20 DOI // TODO object identifiersList
  final.PeerReviewed = moreInfo?.isPeerReviewed;// 21 PeerReviewed
  if (moreInfo?.customerResourcesList[0]?.managedCoverageList.length !== 0) {
    const { begin, end } = coverage(moreInfo?.customerResourcesList[0]?.managedCoverageList);
    final.ManagedCoverageBegin = begin;
    final.ManagedCoverageEnd = end;
  }

  if (moreInfo?.customerResourcesList[0]?.customCoverageList.length !== 0) {
    const { begin, end } = coverage(moreInfo?.customerResourcesList[0]?.customCoverageList);
    final.CustomCoverageBegin = begin;
    final.CustomCoverageEnd = end;
  }

  final.Embargo = embargo(moreInfo?.customerResourcesList[0]?.managedEmbargoPeriod);
  final.CustomEmbargo = embargo(moreInfo?.customerResourcesList[0]?.customEmbargoPeriod);
  final.Description = moreInfo?.description; // 29
  final.Subject = subject(moreInfo?.subjectsList); // 30
  final.ResourceType = firstData?.resource_type; // 31
  final.PackageContentType = firstData?.package_content_type; // 32
  // 33 CreateCustom // TODO toujours à N dans le fichier
  final.HideOnPublicationFinder = moreInfo?.customerResourcesList[0]?.visibilityData?.isHidden; // 34
  // 35 Delete // TODO toujours à N dans le fichier
  // 36 OrderedThroughEBSCO
  final.IsCustom = moreInfo.isTitleCustom; // 37
  final.PackageType = moreInfo?.PackageType; // 43
  // 44 AllowEbscoToAddNewTitles

  return final;
};

const writeHeader = async (filePath) => {
  try {
    await fs.writeFile(filePath, `${header.join(',')}\n`, { flag: 'a' });
  } catch (err) {
    logger.error(`writeHeader: ${err}`);
  }
};

const convertToCSV = (line) => {
  const CSVLine = Papa.unparse([line]);
  const data = CSVLine.split('\n');
  return data[1];
};

const writeLineInFile = async (line, filePath) => {
  try {
    await fs.writeFile(filePath, `${line}\n`, { flag: 'a' });
  } catch (err) {
    logger.error(`writeLineInFile: ${err}`);
  }
};

const deleteFile = async (filePath) => {
  try {
    await fs.unlink(filePath);
  } catch (err) {
    logger.error(`deleteFile: ${err}`);
  }
};

const download = async (args) => {
  const { institute } = args;
  const filePath = path.resolve(__dirname, '..', '..', 'download', `${institute}.csv`);

  let count = 0;
  let offset = 1;
  let resNumber = 1000;
  const CUSTID = JSON.parse(INSTITUTES)[institute];
  await deleteFile(filePath);
  await writeHeader(filePath);
  while (resNumber === 1000) {
    count += 1000;
    const data = await generalInformationsFromEbsco(CUSTID, count, offset);
    resNumber = data.length;
    logger.info(count);
    for (let i = 0; i < 1000; i += 1) {
      logger.info(i);
      const moreInfo = await additionalInformationFromsEbsco(CUSTID, data[i].vendor_id, data[i].package_id, data[i].title_id);
      const line = createData(data[i], moreInfo, institute);
      const csvLine = convertToCSV(line);
      await writeLineInFile(csvLine, filePath);
    }
    offset += 1000;
  }
  logger.info('download: end');
};

module.exports = {
  download,
};
