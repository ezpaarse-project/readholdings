/* eslint-disable no-await-in-loop */
/* eslint-disable no-loop-func */
/* eslint-disable max-len */
const path = require('path');
const fs = require('fs-extra');
const axios = require('axios');
const logger = require('../../lib/logger');

const { URL } = process.env;
const { APIKEY } = process.env;
let { CUSTID } = process.env;
const format = 'kbart2';

const printAndOnlineIdentifier = (type) => (type === 'serial' ? 'ISSN' : 'ISBN');

const sleep = (waitTimeInMs) => new Promise((resolve) => setTimeout(resolve, waitTimeInMs));

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

}

const generalInformationFromsEbsco = async (custid, count, offset) => {
  let res;
  try {
    res = await axios({
      method: 'get',
      url: `${URL}${custid}/holdings`,
      params: { count, offset, format },
      headers: {
        'x-api-key': APIKEY,
        'Content-Type': 'application/json',
      },
    });
  } catch (err) {
    logger.error(`Error in first request : ${err}`);
    process.exit(1);
  }
  logger.info('first request success');
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
    });
  } catch (err) {
    logger.error(`Error in second request : ${err}`);
    process.exit(1);
  }
  logger.info('second request success');
  return res.data;
};

const createData = (firstData, moreInfo, institute) => {
  const final = {};
  final.BibCNRS = institute;
  final.KBID = firstData?.title_id;
  final.Title = firstData?.publication_title;
  // 7 AlternateTitle
  final.PackageName = firstData?.package_name;
  final.URL = firstData?.title_url;
  final.ProxiedURL = ` http://${institute.toLowerCase}.bib.cnrs.fr/login?url=${final.URL}`;
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
  final.Subject = moreInfo?.subjectsList[0].subject; // 30
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

const download = async (args) => {
  let count = 0;
  let offset = 1;
  let resNumber = 1000;

  const { institute } = args;
  CUSTID = JSON.parse(CUSTID)[institute];

  while (resNumber === 1000) {
    count += 1000;
    const data = await generalInformationFromsEbsco(CUSTID, count, offset);
    console.log(data);
    resNumber = data.length;
    data.forEach(async (element) => {
      const moreInfo = await additionalInformationFromsEbsco(CUSTID, element.vendor_id, element.package_id, element.title_id);
      await sleep(1000);
      const line = createData(element, moreInfo, institute);
      console.log(line);
      // TODO write in a csv file
    });
    offset += 1000;
  }
};

module.exports = {
  download,
};
