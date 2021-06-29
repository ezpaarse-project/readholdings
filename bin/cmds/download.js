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

const { getConfig } = require('../../lib/client');

const httpsAgent = process.env.https_proxy && new HttpsProxyAgent(process.env.https_proxy);

const url = 'https://sandbox.ebsco.io/rm/rmaccounts';
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
  'VendorName',
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
 * @param {string} apikey - apikey
 * @param {string} custid
 * @returns {int} number of data
 */
const getNumberOfDataOfCustid = async (apikey, custid) => {
  let res;
  let i = 0;
  while ((res === undefined || res.length === 0) && i <= 5) {
    if (i !== 0) {
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
    try {
      res = await axios({
        method: 'get',
        url: `${url}/${custid}/holdings/status`,
        headers: {
          'x-api-key': apikey,
          'Content-Type': 'application/json',
        },
        httpsAgent: (url.startsWith('https') && httpsAgent) ? httpsAgent : undefined,
        proxy: (url.startsWith('https') && httpsAgent) ? false : undefined,
      });
    } catch (err) {
      console.error(`interne error: getNumberOfDataOfCustid - ${err}`);
    }
    i += 1;
  }
  if (!res) {
    console.error('interne error: getNumberOfDataOfCustid - timeout');
    process.exit(1);
  }
  return res?.data?.totalCount;
};

/**
 * get in packets of 5000. the data of custid
 *
 * @param {String} apikey apikey
 * @param {String} custid customerID
 * @param {Int} count number of results to return in the response. can not exceed 5000
 * @param {Int} page page
 * @returns general data
 */
const generalInformationsFromEbsco = async (apikey, custid, count, offset) => {
  let res;
  let i = 1;
  while ((res === undefined || res.length === 0) && i <= 5) {
    if (i !== 0) {
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
    try {
      res = await axios({
        method: 'get',
        url: `${url}/${custid}/holdings`,
        params: { count, offset, format },
        headers: {
          'x-api-key': apikey,
          'Content-Type': 'application/json',
        },
        httpsAgent: (url.startsWith('https') && httpsAgent) ? httpsAgent : undefined,
        proxy: (url.startsWith('https') && httpsAgent) ? false : undefined,
      });
    } catch (err) {
      console.error(`interne error: generalInformationsFromEbsco - ${err}, ${i} attempt`);
    }
    i += 1;
  }
  if (!res) {
    console.error('interne error: generalInformationsFromEbsco - timeout');
    process.exit(1);
  }
  return res?.data?.holdings;
};

/**
 * Title -> titleName
 * Publisher -> publisherName
 * PrintISSN -> identifiersList.subtype = 1 + type = 0
 * OnlineISSN -> identifiersList.subtype = 2 + type = 0
 * PrintISBN -> identifiersList.subtype = 1 + type = 1
 * OnlineISBN -> identifiersList.subtype = 2 + type = 1
 * Subject -> subjectList[].subject
 * isCustom -> isTitleCustom
 * RessourceType -> pubType
 * PackageName -> customerResourcesList[].packageName
 * PackageType -> customerResourcesList[].packageType
 * CustomCoverageBegin -> customerResourcesList[].customCoverage.beginCoverage
 * CustomCoverageEnd -> customerResourcesList[].customCoverage.endCoverage
 * CoverageStatement -> customerResourcesList[].CoverageStatement
 * ManagedCoverageBegin -> customerResourcesList[].managedEmbargoPeriod.embargoUnit + embargoValue
 * CustomEmbargo -> customerResourcesList[].customEmbargoPeriod.embargoUnit + embargoValue
 * URL -> customerResourcesList[].url
 * UserDefinedField1 -> customerResourcesList[].userDefinedField1
 * UserDefinedField2 -> customerResourcesList[].userDefinedField1
 * UserDefinedField3 -> customerResourcesList[].userDefinedField1
 * UserDefinedField4 -> customerResourcesList[].userDefinedField1
 * UserDefinedField5 -> customerResourcesList[].userDefinedField1
 * Description -> description
 * Edition -> edition
 * PeerReviewed -> isPeerReviewed
 * Author -> contributorList[].type = Author, .Contributor
 * Editor -> contributorList[].type = Editor, .Contributor
 * Illustrator ->  contributorList[].type = Illustrator, .Contributor
 * get more info of ressource
 *
 * @param {String} apikey apikey
 * @param {String} custid
 * @param {Int} kbid
 * @returns {Object} additional data
 */
const additionalInfo1 = async (apikey, custid, kbid) => {
  let res;
  let i = 1;
  while ((res === undefined || res.length === 0) && i <= 5) {
    if (i !== 0) {
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
    try {
      res = await axios({
        method: 'get',
        url: `${url}/${custid}/titles/${kbid}`,
        headers: {
          'x-api-key': apikey,
          'Content-Type': 'application/json',
        },
        httpsAgent: (url.startsWith('https') && httpsAgent) ? httpsAgent : undefined,
        proxy: (url.startsWith('https') && httpsAgent) ? false : undefined,
      });
    } catch (err) {
      console.error(`interne error: additionalInfo1 - ${err}, ${i} attempt`);
    }
    i += 1;
  }
  if (!res) {
    console.error('interne error: additionalInfo1 - timeout');
    process.exit(1);
  }
  return res.data;
};

/**
 * get more info of ressource
 * Title -> titleName
 * Publisher -> publisherName
 * PrintISSN -> identifiersList.subtype = 1 + type = 0
 * OnlineISSN -> identifiersList.subtype = 2 + type = 0
 * PrintISBN -> identifiersList.subtype = 1 + type = 1
 * OnlineISBN -> identifiersList.subtype = 2 + type = 1
 * isCustom -> isTitleCustom
 * Subject -> subjectList.subject
 * RessourceType -> pubType
 * PackageName -> customerResourcesList[].packageName
 * PackageType -> customerResourcesList[].packageType
 * CustomCoverageBegin -> customerResourcesList[].customCoverage.beginCoverage
 * CustomCoverageEnd -> customerResourcesList[].customCoverage.endCoverage
 * CoverageStatement -> customerResourcesList[].CoverageStatement
 * ManagedCoverageBegin -> customerResourcesList[].managedEmbargoPeriod.embargoUnit + embargoValue
 * CustomEmbargo -> customerResourcesList[].customEmbargoPeriod.embargoUnit + embargoValue
 * URL -> customerResourcesList[].url
 * UserDefinedField1 -> customerResourcesList[].userDefinedField1
 * UserDefinedField2 -> customerResourcesList[].userDefinedField1
 * UserDefinedField3 -> customerResourcesList[].userDefinedField1
 * UserDefinedField4 -> customerResourcesList[].userDefinedField1
 * UserDefinedField5 -> customerResourcesList[].userDefinedField1
 * Description -> description
 * Edition -> edition
 * PeerReviewed -> isPeerReviewed
 * Author -> contributorList[].type = Author, .Contributor
 * Editor -> contributorList[].type = Editor, .Contributor
 * Illustrator ->  contributorList[].type = Illustrator, .Contributor
 * @param {String} apikey apikey
 * @param {String} custid
 * @param {Int} kbid
 * @returns {Object} additional data
 */
const additionalInfo2 = async (apikey, custid, vendorID, packageID, kbid) => {
  let res;
  let i = 1;
  while ((res === undefined || res.length === 0) && i <= 5) {
    if (i !== 0) {
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
    try {
      res = await axios({
        method: 'get',
        url: `${url}/${custid}/vendors/${vendorID}/packages/${packageID}/titles/${kbid}`,
        headers: {
          'x-api-key': apikey,
          'Content-Type': 'application/json',
        },
        httpsAgent: (url.startsWith('https') && httpsAgent) ? httpsAgent : undefined,
        proxy: (url.startsWith('https') && httpsAgent) ? false : undefined,
      });
    } catch (err) {
      console.error(`interne error: ${err}, ${i} attempt`);
    }
    i += 1;
  }
  if (!res) {
    console.error('interne error: - timeout');
    process.exit(1);
  }
  return res.data;
};

/**
 * get more info of ressource
 *
 * PackageName -> packageName
 * VendorName -> vendorName
 * HideOnPublicationFinder -> visibilityDate.isHidden
 * PackageContentType -> contentType
 * CustomCoverageBegin -> customCoverage.beginCoverage
 * CustomCoverageEnd -> customCoverage.beginCoverage
 * AllowEbscoToAddTitles -> allowEbscoToAddTitles
 * PackageType -> packageType
 *
 * @param {String} apikey apikey
 * @param {String} custid
 * @param {Int} kbid
 * @returns {Object} additional data
 */
const additionalInfo3 = async (apikey, custid, vendorID, packageID) => {
  let res;
  let i = 1;
  while ((res === undefined || res.length === 0) && i <= 5) {
    if (i !== 0) {
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
    try {
      res = await axios({
        method: 'get',
        url: `${url}/${custid}/vendors/${vendorID}/packages/${packageID}`,
        headers: {
          'x-api-key': apikey,
          'Content-Type': 'application/json',
        },
        httpsAgent: (url.startsWith('https') && httpsAgent) ? httpsAgent : undefined,
        proxy: (url.startsWith('https') && httpsAgent) ? false : undefined,
      });
    } catch (err) {
      console.error(`interne error: ${err}, ${i} attempt`);
    }
    i += 1;
  }
  if (!res) {
    console.error('interne error: - timeout');
    process.exit(1);
  }
  return res.data;
};

/**
 * merge firstDate and moreInfos to create unique line like "standard" format
 * @param {String} firstData data from generalInformationsFromEbsco
 * @param {String} moreInfo data from additionalInfo1
 * @param {String} institute name of institute
 * @returns {String} fusion of both
 */
const createLine = (firstData, moreInfo, institute) => {
  const final = createEmptyData();
  final.BibCNRS = institute;
  final.KBID = firstData?.title_id;
  final.Title = firstData?.publication_title;
  final.PackageName = firstData?.package_name;
  final.URL = firstData?.title_url;
  final.ProxiedURL = `http://${institute.toLowerCase()}.bib.cnrs.fr/login?url=${final.URL}`;
  final.Publisher = firstData?.publisher_name;
  final.Edition = moreInfo?.edition;
  final.Author = firstData?.first_author;
  final.Editor = firstData?.first_editor;
  final.Illustrator = firstData?.illustrator;

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
  final.CoverageStatement = moreInfo?.customerResourcesList[0]?.corverageStatement;
  final.Embargo = embargo(moreInfo?.customerResourcesList[0]?.managedEmbargoPeriod);
  final.CustomEmbargo = embargo(moreInfo?.customerResourcesList[0]?.customEmbargoPeriod);
  final.Description = moreInfo?.description;
  final.Subject = subject(moreInfo?.subjectsList);
  final.ResourceType = firstData?.resource_type;
  final.PackageContentType = firstData?.package_content_type;
  final.HideOnPublicationFinder = moreInfo?.customerResourcesList[0]?.visibilityData?.isHidden; // 34
  final.IsCustom = moreInfo.isTitleCustom;
  final.PackageType = moreInfo?.PackageType;
  final.AllowEbscoToAddNewTitles = moreInfo?.allowEbscoToAddNewTitles; // todorevoir
  final.VendorName = firstData?.vendor_name;

  return final;
};

/**
 * Write header in format of mapping "ezhlm" in a file
 * @param {String} filePath
 */
const writeHeader = async (filePath) => {
  try {
    await fs.writeFile(filePath, `${header.join(',')}\n`, { flag: 'a' });
  } catch (err) {
    console.error(`interne error: writeHeader - ${err}`);
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
    console.error(`interne error: writeLineInFile - ${err}`);
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
    console.error(`interne error: deleteFile - ${err}`);
  }
};

/**
 * count number of line in a file
 * @param {String} filePath filepath
 * @return {Int} number of line
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
  const { out } = args;

  if (!out) {
    console.error('Error: expected exit path with option -o');
    process.exit(1);
  }

  if (!institute) {
    console.error('Error: expected institute with option -i');
    process.exit(1);
  }

  const config = await getConfig(args.use);

  let page = 1;
  let offset = 0;

  const isFileExist = await fs.pathExists(out);
  if (!isFileExist) {
    await fs.writeFile(out, '');
  }

  const filePath = path.resolve(__dirname, '..', '..', 'download', `${institute}.csv`);

  if (resume) {
    try {
      // -1 because header of csv file
      offset = await countLinesInFile(filePath) - 1;
    } catch (err) {
      console.error(`download: countLinesInFile : ${err}`);
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

  const { custid } = JSON.parse(config.institutes)[institute];
  const { apikey } = JSON.parse(config.institutes)[institute];

  const count = 5000;
  let resNumber = 5000;

  // out file

  if (offset === 0) {
    await deleteFile(filePath);
    await writeHeader(filePath);
  }

  // intiate bar (terminal view)
  const numberOfData = await getNumberOfDataOfCustid(apikey, custid);
  if (offset === numberOfData) {
    console.info('all data has been downloaded, resume downloading therefore cannot take place');
    console.info(`if you want to re-download the data to update it, you have to use: ezhlm download -i ${institute}`);
    process.exit(0);
  }
  const bar = new cliProgress.SingleBar({
    format: 'progress [{bar}] {percentage}% | {value}/{total} data',
  });
  bar.start(numberOfData, offset);

  let data = await generalInformationsFromEbsco(custid, apikey, count, page);
  resNumber = data.length;

  while (resNumber === 5000) {
    // harvest by pack of 5000
    resNumber = data.length;
    // get more infos to create a "standard" data (like from HLM)
    for (let i = 0; i < 5000; i += 1) {
      if (offset <= i) {
        let moreInfo;
        if (data[i].title_id && data[i].vendor_id && data[i].package_id && data[i].title_id) {
          moreInfo = await additionalInfo2(apikey, custid, data[i].vendor_id, data[i].package_id, data[i].title_id);
        } else {
          moreInfo = await additionalInfo1(apikey, custid, data[i].title_id);
        }
        const line = createLine(data[i], moreInfo, institute);
        const csvLine = convertToCSV(line);
        await writeLineInFile(csvLine, filePath);
        bar.increment();
      }
    }

    data = await generalInformationsFromEbsco(apikey, custid, count, page);
    resNumber = data.length;

    offset = 0;
    page += 1;
  }
  console.info('download: end');
};

module.exports = {
  download,
};
