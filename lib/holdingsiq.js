const HttpsProxyAgent = require('https-proxy-agent');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

const logger = require('./logger');

const configPath = path.resolve(os.homedir(), '.config', 'ezhlm.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

const httpsAgent = process.env.https_proxy && new HttpsProxyAgent(process.env.https_proxy);

const holdings = axios.create({
  baseURL: config.holdingsiq.baseURL,
  timeout: 10000,
  httpsAgent: (config.holdingsiq.baseURL.startsWith('https') && httpsAgent) ? httpsAgent : undefined,
  proxy: (config.holdingsiq.baseURL.startsWith('https') && httpsAgent) ? false : undefined,
});

const format = 'kbart2';

/**
 * get number of data of custid
 * @param {string} apikey - apikey
 * @param {string} custid
 * @returns {int} number of data
 */
const getHoldingsStatus = async (apikey, custid) => {
  let res;
  try {
    res = await holdings({
      method: 'get',
      url: `/${custid}/holdings/status`,
      headers: {
        'x-api-key': apikey,
        'Content-Type': 'application/json',
      },
    });
  } catch (err) {
    logger.errorRequest(err);
    process.exit(1);
  }
  return res?.data?.totalCount;
};

const parseGetHoldings = (data, institute, index) => {
  const results = [];
  data.forEach((e) => {
    const result = {
      ezhlmid: `${institute}-${e?.vendor_id}-${e?.package_id}-${e?.title_id}`,
      PackageID: e?.package_id,
      VendorID: e?.vendor_id,
      KBID: e?.title_id,
      PackageName: e?.package_name,
      VendorName: e?.vendorName,
      Title: e?.publication_title,
      AccessType: e?.access_type,
      PublicationType: e?.publication_type,
      RessourceType: e?.ressource_type,
      URL: e?.title_url,
      Author: e?.first_author,
      NumLastIssueOnline: e?.num_last_issue_online,
      NumLastVolOnline: e?.num_last_vol_online,
      CoverageDepth: e?.coverage_depth,
      NumFirstIssueOnline: e?.num_first_issue_online,
      NumFirstVolOnline: e?.num_first_vol_online,
      DateFirstIssueOnline: e?.date_first_issue_online,
      DateLastIssueOnline: e?.date_last_issue_online,
      EmbargoInfo: e?.embargo_info,
      OnlineIdentifier: e?.online_identifier,
      PrintIdentifier: e?.print_identifier,
    };
    results.push({ update: { _index: index, _id: result.ezhlmid } });
    results.push({ doc: result });
  });
  return results.slice();
};

const getHoldings = async (apikey, custid, count, offset, institute, index) => {
  let res;
  try {
    res = await holdings({
      method: 'get',
      url: `/${custid}/holdings`,
      params: { count, offset, format },
      headers: {
        'x-api-key': apikey,
        'Content-Type': 'application/json',
      },
      httpsAgent: (config.holdingsiq.baseURL.startsWith('https') && httpsAgent) ? httpsAgent : undefined,
      proxy: (config.holdingsiq.baseURL.startsWith('https') && httpsAgent) ? false : undefined,
    });
  } catch (err) {
    logger.errorRequest(err);
    process.exit(1);
  }
  const result = parseGetHoldings(res?.data?.holdings, institute, index);
  return result;
};

const getTitles = async (apikey, custid, kbid) => {
  let res;
  try {
    res = await holdings({
      method: 'get',
      url: `/${custid}/titles/${kbid}`,
      headers: {
        'x-api-key': apikey,
        'Content-Type': 'application/json',
      },
    });
  } catch (err) {
    logger.errorRequest(err);
    process.exit(1);
  }
  return res.data;
};

const getVendorsPackages = async (apikey, custid, vendorID, packageID) => {
  let res;
  try {
    res = await holdings({
      method: 'get',
      url: `/${custid}/vendors/${vendorID}/packages/${packageID}`,
      headers: {
        'x-api-key': apikey,
        'Content-Type': 'application/json',
      },
    });
  } catch (err) {
    logger.errorRequest(err);
    process.exit(1);
  }
  return res.data;
};

const getContributor = (contributors, type) => contributors.filter((contributor) => {
  if (contributor?.type === type) {
    return contributor?.value;
  }
});

const getIdentifier = (identifiers, type, subtype) => identifiers.filter((identifier) => {
  if (identifier?.type === type && identifier?.subtype === subtype) {
    return identifier?.id;
  }
});

const getEmbargo = (embargo) => {
  if (embargo?.embargoValue === 0) {
    return '0 mois';
  }
  let multiplicator = 1;
  if (embargo?.embargoUnit === 'years') {
    multiplicator = 12;
  }
  if (embargo?.embargoUnit === 'days') {
    multiplicator = 0.3;
  }
  return `${embargo?.embargoUnit * multiplicator} mois`;
};

const parseGetVendorsPackagesTitles = (data, institute, index) => {
  const results = [];
  data.forEach((e) => {
    const result = {
      ezhlmid: `${institute}-${e?.customerResourcesList[0]?.packageId}-${e?.customerResourcesList[0]?.vendorId}-${e?.titleId}`,
      PackageID: e?.customerResourcesList[0]?.packageId,
      VendorID: e?.customerResourcesList[0]?.vendorId,
      KBID: e?.titleId,
      PackageName: e?.customerResourcesList[0]?.packageName,
      ManagedCoverageBegin: e?.customerResourcesList[0]?.managedCoverageList?.beginCoverage,
      ManagedCoverageEnd: e?.customerResourcesList[0]?.managedCoverageList?.endCoverage,
      CustomCoverageBegin: e?.customerResourcesList[0]?.customCoverageList?.beginCoverage,
      CustomCoverageEnd: e?.customerResourcesList[0]?.customCoverageList?.endCoverage,
      Publisher: e?.publisherName,
      Embargo: getEmbargo(e?.customerResourcesList[0]?.managedEmbargoPeriod),
      CustomEmbargo: getEmbargo(e?.customerResourcesList[0]?.customEmbargoPeriod),
      VendorName: e?.customerResourcesList[0]?.vendorName,
      OnlineISBN: getIdentifier(e?.identifierList, 1, 2),
      PrintISBN: getIdentifier(e?.identifierList, 1, 1),
      OnlineISSN: getIdentifier(e?.identifierList, 0, 2),
      PrintISSN: getIdentifier(e?.identifierList, 0, 1),
      HideOnPublicationFinder: e?.customerResourcesList[0]?.visibilityDate?.isHidden,
      Title: e?.titleName,
      PackageType: e?.packageType,
      RessourceType: e?.pubType,
      URL: e?.customerResourcesList[0]?.url,
      Author: getContributor(e?.contributorsList, 'Author'),
      PeerReviewed: e?.isPeerReviewed,
      Subject: e?.subjectList?.subjects,
      IsCustom: e?.isTitleCustom,
      UserDefinedField1: e?.customerResourcesList[0]?.UserDefinedField1,
      UserDefinedField2: e?.customerResourcesList[0]?.UserDefinedField2,
      UserDefinedField3: e?.customerResourcesList[0]?.UserDefinedField3,
      UserDefinedField4: e?.customerResourcesList[0]?.UserDefinedField4,
      UserDefinedField5: e?.customerResourcesList[0]?.UserDefinedField5,
      Inherited: e?.customerResourcesList[0]?.proxy?.inherited,
      HiddenBy: e?.customerResourcesList[0]?.visibility?.reason,
      SelectedBy: e?.customerResourcesList[0]?.selectedBy,
      CustomCoverageBy: e?.customerResourcesList[0]?.customCovergeOwnership,
      CoverageStatement: e?.customerResourcesList[0]?.CoverageStatement,
      Description: e?.description,
      Editor: getContributor(e?.contributorsList, 'Editor'),
      Edition: e?.edition,
      Illustrator: getContributor(e?.contributorsList, 'Illustrator'),
      AlternateTitle: e?.alternateTitle,
      CoveragePackage: e?.customerResourcesList[0]?.isPackageCustom,
      Proxy: e?.customerResourcesList[0]?.isPackageCustom,
      TitleSelected: e?.customerResourcesList[0]?.isSelected,
    };

    results.push({ update: { _index: index, _id: result.ezhlmid } });
    results.push({ doc: result });
  });
  return results.slice();
};

const getVendorsPackagesTitles = async (apikey, custid, vendorID, packageID, kbid, institute, index) => {
  let res;
  try {
    res = await holdings({
      method: 'get',
      url: `/${custid}/vendors/${vendorID}/packages/${packageID}/titles/${kbid}`,
      headers: {
        'x-api-key': apikey,
        'Content-Type': 'application/json',
      },
    });
  } catch (err) {
    logger.errorRequest(err);
    process.exit(1);
  }
  return res?.data;
  // const result = parseGetVendorsPackagesTitles(res?.data, institute, index);
  // return result;
};

module.exports = {
  getHoldingsStatus,
  getHoldings,
  getTitles,
  getVendorsPackages,
  getVendorsPackagesTitles,
};
