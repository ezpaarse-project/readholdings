/* eslint-disable no-await-in-loop */
/* eslint-disable no-loop-func */
/* eslint-disable max-len */
const path = require('path');
const fs = require('fs-extra');
const Papa = require('papaparse');
const axios = require('axios');
const readline = require('readline');
const HttpsProxyAgent = require('https-proxy-agent');
const cliProgress = require('cli-progress');
const { exec } = require('child_process');
const logger = require('../../lib/logger');

const httpsAgent = process.env.https_proxy && new HttpsProxyAgent(process.env.https_proxy);

const { URL } = process.env;
const { INSTITUTES } = process.env;
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

/**
 * create a empty data with all keys from mapping
 * @returns {Object} empty data with all keys from mapping
 */
const createEmptyData = () => {
  const data = {};
  header.forEach((element) => {
    data[element] = '';
  });
  return data;
};

/**
 * return if type is ISSN or ISBN
 * @param {String} type publication_type
 * @returns {String} type ISSN or ISBN
 */
const printAndOnlineIdentifier = (type) => (type === 'serial' ? 'ISSN' : 'ISBN');

/**
 * parse coverage data for csv format
 * @param {String} data unparsed coverage
 * @returns {String} parsed coverage
 */
const coverage = (data) => {
  if (!data.length) {
    return '';
  }
  return {
    begin: data.map((e) => e.beginCoverage).join('|'),
    end: data.map((e) => e.endCoverage).join('|'),
  };
};

/**
 * parse embargo data for csv format
 * @param {String} data unparsed embargo
 * @returns {String} parsed embargo
 */
const embargo = (data) => {
  if (data.embargoUnit === null) {
    return '';
  }
  return `${data.embargoValue} ${data.embargoUnit}`;
};

/**
 * parse subject data for csv format
 * @param {String} data unparsed subject
 * @returns {String} parsed subject
 */
const subject = (data) => {
  if (!data.length) {
    return '';
  }
  return data.map((e) => e.subject).join(',');
};

/**
 * get number of data of custid
 * @param {String} custid
 * @returns {Int} number of data
 */
const getNumberOfDataOfCustid = async (custid, apikey) => {
  let res;
  let i = 0;
  while ((res === undefined || res.length === 0) && i < 5) {
    try {
      res = await axios({
        method: 'get',
        url: `${URL}/${custid}/holdings/status`,
        headers: {
          'x-api-key': apikey,
          'Content-Type': 'application/json',
        },
        httpsAgent: (URL.startsWith('https') && httpsAgent) ? httpsAgent : undefined,
        proxy: (URL.startsWith('https') && httpsAgent) ? false : undefined,
      });
    } catch (err) {
      logger.error(`getNumberOfDataOfCustid : ${err}`);
    }
    i += 1;
  }
  return res?.data?.totalCount;
};

/**
 * get in packets of 5000. the data of custid
 * in this data, they have general info and kbid (title_id) to do another request to get more infos
 * @param {String} custid customerID
 * @param {String} apikey apikey
 * @param {Int} count number of results to return in the response. can not exceed 5000
 * @param {Int} page page
 * @returns general data
 */
const generalInformationsFromEbsco = async (custid, apikey, count, offset) => {
  let res;
  let i = 0;
  while ((res === undefined || res.length === 0) && i < 5) {
    try {
      res = await axios({
        method: 'get',
        url: `${URL}/${custid}/holdings`,
        params: { count, offset, format },
        headers: {
          'x-api-key': apikey,
          'Content-Type': 'application/json',
        },
        httpsAgent: (URL.startsWith('https') && httpsAgent) ? httpsAgent : undefined,
        proxy: (URL.startsWith('https') && httpsAgent) ? false : undefined,
      });
    } catch (err) {
      logger.error(`generalInformationsFromEbsco: ${err}`);
    }
    i += 1;
  }
  return res?.data?.holdings;
};

/**
 * get more info of ressource
 * @param {String} custid
 * @param {String} apikey apikey
 * @param {Int} kbid
 * @returns {Object} additional data
 */
const additionalInformationsFromEbsco = async (custid, apikey, kbid) => {
  let res;
  try {
    res = await axios({
      method: 'get',
      url: `${URL}/${custid}/titles/${kbid}`,
      headers: {
        'x-api-key': apikey,
        'Content-Type': 'application/json',
      },
      httpsAgent: (URL.startsWith('https') && httpsAgent) ? httpsAgent : undefined,
      proxy: (URL.startsWith('https') && httpsAgent) ? false : undefined,
    });
  } catch (err) {
    logger.error(`additionalInformationsFromEbsco: ${err}`);
    process.exit(1);
  }
  return res.data;
};

/**
 * merge firstDate and moreInfos to create unique line like "standard" format
 * @param {String} firstData data from generalInformationsFromEbsco
 * @param {String} moreInfo data from additionalInformationsFromEbsco
 * @param {String} institute name of institute
 * @returns {String} fusion of both
 */
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

/**
 * Write header in format of mapping "etatcollhlm" in a file
 * @param {String} filePath
 */
const writeHeader = async (filePath) => {
  try {
    await fs.writeFile(filePath, `${header.join(',')}\n`, { flag: 'a' });
  } catch (err) {
    logger.error(`writeHeader: ${err}`);
  }
};

/**
 * Parse a json date to csv
 * @param {String} line
 * @returns {String} parsed data
 */
const convertToCSV = (line) => {
  const CSVLine = Papa.unparse([line]);
  const data = CSVLine.split('\n');
  return data[1];
};

/**
 * write a parsed data in csv format in a file
 * @param {String} line
 * @param {String} filePath
 */
const writeLineInFile = async (line, filePath) => {
  try {
    await fs.writeFile(filePath, `${line}\n`, { flag: 'a' });
  } catch (err) {
    logger.error(`writeLineInFile: ${err}`);
  }
};

/**
 * delete file
 * @param {String} filePath filepath
 */
const deleteFile = async (filePath) => {
  try {
    await fs.remove(filePath);
  } catch (err) {
    logger.error(`deleteFile: ${err}`);
  }
};

/**
 *
 * @param {String} filePath
 */
const countLinesInFile = async (filePath) => {
  let lines = 0;
  const readStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: readStream,
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    lines += 1;
  }
  return lines;
};

/**
 * write in a file all data in format standard from esbco of custid
 * @param {Object} args object from commander
 */
const download = async (args) => {
  // get custid and apikey from config
  const { institute } = args;
  const { resume } = args;

  let page = 1;
  let offset = 0;

  const filePath = path.resolve(__dirname, '..', '..', 'download', `${institute}.csv`);

  if (resume) {
    try {
      // -1 because header of csv file
      offset = await countLinesInFile(filePath) - 1;
    } catch (err) {
      logger.error(`download: countLinesInFile : ${err}`);
    }
    if (offset) {
      page = Math.floor(offset / 5000) + 1;
      if (page !== 0) {
        offset -= 5000 * (page - 1);
      }
    } else {
      offset = 0;
    }
  }

  const { custid } = JSON.parse(INSTITUTES)[institute];
  const { apikey } = JSON.parse(INSTITUTES)[institute];

  const count = 5000;
  let resNumber = 5000;

  // out file

  if (offset === 0) {
    await deleteFile(filePath);
    await writeHeader(filePath);
  }

  // intiate bar (terminal view)
  const numberOfData = await getNumberOfDataOfCustid(custid, apikey);
  if (offset === numberOfData) {
    logger.info('all data has been downloaded, resume downloading therefore cannot take place');
    logger.info(`if you want to re-download the data to update it, you have to use: etatcollhlm download -i ${institute}`);
    process.exit(0);
  }
  const bar = new cliProgress.SingleBar({
    format: 'progress [{bar}] {percentage}% | {value}/{total} data',
  });
  bar.start(numberOfData - offset, 0);

  while (resNumber === 5000) {
    // harvest by pack of 5000
    const data = await generalInformationsFromEbsco(custid, apikey, count, page);
    resNumber = data.length;
    // get more infos to create a "standard" data (like from HLM)
    for (let i = 0; i < 5000; i += 1) {
      if (offset <= i) {
        const moreInfo = await additionalInformationsFromEbsco(custid, apikey, data[i].title_id);
        const line = createData(data[i], moreInfo, institute);
        const csvLine = convertToCSV(line);
        await writeLineInFile(csvLine, filePath);
      }
      bar.increment();
    }
    offset = 0;
    page += 1;
  }
  logger.info('download: end');
};

module.exports = {
  download,
};
