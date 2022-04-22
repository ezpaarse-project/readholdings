/* eslint-disable array-callback-return */
/* eslint-disable consistent-return */

const HttpsProxyAgent = require('https-proxy-agent');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

const logger = require('./logger');

const configPath = path.resolve(os.homedir(), '.config', 'ezhlm.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

const httpsAgent = process.env.https_proxy && new HttpsProxyAgent(process.env.https_proxy);

const sleep = (waitTimeInMs) => new Promise((resolve) => setTimeout(resolve, waitTimeInMs));

const holdings = axios.create({
  baseURL: config.holdingsiq.baseURL,
  timeout: 20000,
  httpsAgent: (config.holdingsiq.baseURL.startsWith('https') && httpsAgent) ? httpsAgent : undefined,
  proxy: (config.holdingsiq.baseURL.startsWith('https') && httpsAgent) ? false : undefined,
});

const format = 'kbart2';

/**
 * reload snapshot on holdings
 * @param {Object} conf - config on institute (name, apikey, custid)
 * @returns {Integer} number of data
 */
const postHoldings = async (conf) => {
  const {
    apikey,
    custid,
  } = conf;

  let res;

  let i = 1;

  do {
    try {
      res = await holdings({
        method: 'post',
        url: `/${custid}/holdings`,
        headers: {
          'x-api-key': apikey,
          'Content-Type': 'application/json',
        },
      });
    } catch (err) {
      logger.errorRequest(err);
      logger.error(`${i} try, wait ${2 ** i} seconds for the next try`);
      await sleep(1000 * 2 ** i);
      i += 1;
    }
    if (res) break;
  } while (i <= 4);

  if (i >= 4) {
    logger.error(`Cannot request /${custid}/holdings - Fail 4 times`);
    process.exit(1);
  }

  return res?.data?.totalCount;
};

/**
 * get number of data of custid
 * @param {Object} conf - config on institute (name, apikey, custid)
 * @returns {Integer} number of data
 */
const getHoldingsStatus = async (conf) => {
  const {
    apikey,
    custid,
  } = conf;

  let res;

  let i = 1;

  do {
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
      logger.error(`${i} try, wait ${2 ** i} seconds for the next try`);
      await sleep(1000 * 2 ** i);
      i += 1;
    }
    if (res) break;
  } while (i <= 4);

  if (i >= 4) {
    logger.error(`Cannot request /${custid}/holdings/status - Fail 4 times`);
    process.exit(1);
  }

  return res?.data;
};

/**
 * Parse the result of getHoldings for ezHLM format
 * @param {Array<Object>} data Data to be parsed
 * @param {String} institute Name of institute
 * @param {String} index Index where the values will be inserted
 * @param {boolean} update Type of bulk, if true: update bulk, else create
 * @returns {Object} Data ready to be inserted in elastic
 */
const parseGetHoldings = (data, institute, index, update) => {
  const results = [];
  data.forEach((e) => {
    const result = {
      ezhlmid: `${institute}-${e?.vendor_id}-${e?.package_id}-${e?.title_id}`,
      PackageID: e?.package_id,
      VendorID: e?.vendor_id,
      KBID: e?.title_id,
      PackageName: e?.package_name,
      VendorName: e?.vendor_name,
      Title: e?.publication_title,
      AccessType: e?.access_type,
      PublicationType: e?.publication_type,
      ResourceType: e?.resource_type,
      URL: e?.title_url,
      Author: e?.first_author,
      NumLastIssueOnline: e?.num_last_issue_online,
      NumLastVolOnline: e?.num_last_vol_online,
      CoverageDepth: e?.coverage_depth,
      NumFirstIssueOnline: e?.num_first_issue_online,
      NumFirstVolOnline: e?.num_first_vol_online,
      DateFirstIssueOnline: e?.date_first_issue_onlinee || null,
      DateLastIssueOnline: e?.date_last_issue_online || null,
      EmbargoInfo: e?.embargo_info,
      OnlineIdentifier: e?.online_identifier,
      PrintIdentifier: e?.print_identifier,
    };
    if (update) {
      results.push({ update: { _index: index, _id: result.ezhlmid } });
    } else {
      results.push({ index: { _index: index, _id: result.ezhlmid } });
    }
    results.push({ doc: result });
  });
  return results.slice();
};

/**
 * getHoldings for enrich initialization
 * @param {Object} conf - config on institute (name, apikey, custid)
 * @param {*} count - number of documents to recover
 * @param {*} offset - page
 * @param {String} index Index where the values will be inserted
 * @param {boolean} update Type of bulk, if true: update bulk, else create
 * @returns {Object} Data ready to be inserted in elastic
 */
const getHoldings = async (conf, count, offset, index, update) => {
  const {
    apikey,
    custid,
    name,
  } = conf;

  let res;

  let i = 1;

  do {
    try {
      res = await holdings({
        method: 'get',
        url: `/${custid}/holdings`,
        params: { count, offset, format },
        headers: {
          'x-api-key': apikey,
          'Content-Type': 'application/json',
        },
      });
    } catch (err) {
      logger.errorRequest(err);
      logger.error(`${i} try, wait ${2 ** i} seconds for the next try`);
      await sleep(1000 * 2 ** i);
      i += 1;
    }
    if (res) break;
  } while (i <= 4);

  if (i >= 4) {
    logger.error(`Cannot request /${custid}/holdings - Fail 4 times`);
    process.exit(1);
  }

  const result = parseGetHoldings(res?.data?.holdings, name, index, update);
  return result;
};

/**
 * get the contributor according to the type
 * @param {Array<Object>} contributors - contributors array
 * @param {String} type - type of contributor
 * @returns {String} name of contributor
 */
const getContributor = (contributors, type) => {
  if (contributors.length === 0) {
    return undefined;
  }
  return contributors.filter((contributor) => {
    if (contributor?.type === type) {
      return contributor?.value;
    }
  });
};

/**
 * get the identifier according to the type and subtype
 * @param {Array<Object>} identifiers - identifiers array
 * @param {String} type - type of identifiers
 * @param {String} subtype - subtype of identifiers
 * @returns {String} name of contributor
 */
const getIdentifier = (identifiers, type, subtype) => {
  const tt = identifiers.filter((identifier) => {
    if (identifier?.type === type && identifier?.subtype === subtype) {
      return identifier?.id;
    }
  });
  return tt[0]?.id;
};

/**
 * parse embargo to ezHLM format
 * @param {Object} embargo embargo
 * @returns {String} embargo at ezhlm format
 */
const getEmbargo = (embargo) => {
  if (embargo?.embargoValue === 0 || !embargo?.embargoUnit) {
    return '';
  }
  let multiplicator = 1;
  if (embargo?.embargoUnit === 'years') {
    multiplicator = 12;
  }
  if (embargo?.embargoUnit === 'days') {
    multiplicator = 0.3;
  }
  return `${embargo?.embargoValue * multiplicator} mois`;
};

/**
 * parse proxy to ezHLM format
 * @param {Object} proxy proxy
 * @returns {String} proxy at ezhlm format
 */
const getProxy = (proxy) => {
  if (proxy === '<n>') {
    return undefined;
  }
  return proxy;
};

/**
 * Parse the result of getVendorsPackagesTitles for ezHLM format
 * @param {Array<Object>} data Data to be parsed
 * @returns {Object} Data ready to be inserted in elastic
 */
const parseGetVendorsPackagesTitles = (data) => ({
  PackageID: data?.customerResourcesList?.[0]?.packageId,
  VendorID: data?.customerResourcesList?.[0]?.vendorId,
  KBID: data?.titleId,
  PackageName: data?.customerResourcesList?.[0]?.packageName,
  ManagedCoverageBegin: data?.customerResourcesList?.[0]?.managedCoverageList?.beginCoverage,
  ManagedCoverageEnd: data?.customerResourcesList?.[0]?.managedCoverageList?.endCoverage,
  CustomCoverageBegin: data?.customerResourcesList?.[0]?.customCoverageList?.beginCoverage,
  CustomCoverageEnd: data?.customerResourcesList?.[0]?.customCoverageList?.endCoverage,
  Publisher: data?.publisherName,
  Embargo: getEmbargo(data?.customerResourcesList?.[0]?.managedEmbargoPeriod),
  CustomEmbargo: getEmbargo(data?.customerResourcesList?.[0]?.customEmbargoPeriod),
  VendorName: data?.customerResourcesList?.[0]?.vendorName,
  OnlineISBN: getIdentifier(data?.identifiersList, 1, 2),
  PrintISBN: getIdentifier(data?.identifiersList, 1, 1),
  OnlineISSN: getIdentifier(data?.identifiersList, 0, 2),
  PrintISSN: getIdentifier(data?.identifiersList, 0, 1),
  HideOnPublicationFinder: data?.customerResourcesList?.[0]?.visibilityDatdata?.isHidden,
  Title: data?.titleName,
  PackageType: data?.packageType,
  ResourceType: data?.pubType,
  URL: data?.customerResourcesList?.[0]?.url,
  Author: getContributor(data?.contributorsList, 'Author'),
  PeerReviewed: data?.isPeerReviewed,
  Subject: data?.subjectList?.subjects,
  IsCustom: data?.isTitleCustom,
  UserDefinedField1: data?.customerResourcesList?.[0]?.UserDefinedField1,
  UserDefinedField2: data?.customerResourcesList?.[0]?.UserDefinedField2,
  UserDefinedField3: data?.customerResourcesList?.[0]?.UserDefinedField3,
  UserDefinedField4: data?.customerResourcesList?.[0]?.UserDefinedField4,
  UserDefinedField5: data?.customerResourcesList?.[0]?.UserDefinedField5,
  IsProxyInherited: data?.customerResourcesList?.[0]?.proxy?.inherited,
  HiddenBy: data?.customerResourcesList?.[0]?.visibility?.reason,
  SelectedBy: data?.customerResourcesList?.[0]?.selectedBy,
  CustomCoverageBy: data?.customerResourcesList?.[0]?.customCovergeOwnership,
  CoverageStatement: data?.customerResourcesList?.[0]?.CoverageStatement,
  Description: data?.description,
  Editor: getContributor(data?.contributorsList, 'Editor'),
  Edition: data?.edition,
  Illustrator: getContributor(data?.contributorsList, 'Illustrator'),
  AlternateTitle: data?.alternateTitle,
  isPackageCustom: data?.customerResourcesList?.[0]?.isPackageCustom,
  ProxyID: getProxy(data?.customerResourcesList?.[0]?.proxy?.id),
  isTitleSelected: data?.customerResourcesList?.[0]?.isSelected,
});

/**
 * getVendorsPackagesTitles for unit enrich update
 * @param {Object} conf - config on institute (, apikey, custid)
 * @param {*} vendorID - vendorID
 * @param {*} packageID - packageID
 * @param {*} kbID - kbID
 * @returns {Object} Data ready to be inserted in elastic
 */
const getVendorsPackagesTitles = async (conf, vendorID, packageID, kbID) => {
  const {
    apikey,
    custid,
  } = conf;

  let res;

  let i = 1;

  do {
    try {
      res = await holdings({
        method: 'get',
        url: `/${custid}/vendors/${vendorID}/packages/${packageID}/titles/${kbID}`,
        headers: {
          'x-api-key': apikey,
          'Content-Type': 'application/json',
        },
      });
    } catch (err) {
      logger.errorRequest(err);
      logger.error(err?.response?.data?.Errors[0]?.Message);
      logger.error(`${i} try, wait ${2 ** i} seconds for the next try`);
      await sleep(1000 * 2 ** i);
      i += 1;
    }

    if (res) break;
  } while (i <= 4);

  if (i >= 4) {
    logger.error(`Cannot request /${custid}/vendors/${vendorID}/packages/${packageID}/titles/${kbID} - Fail 4 times`);
    process.exit(1);
  }

  const result = parseGetVendorsPackagesTitles(res?.data);
  return result;
};

/**
 * Parse the result of getVendorsPackages for ezHLM format
 * @param {Array<Object>} data Data to be parsed
 * @returns {Object} Data ready to be inserted in elastic
 */
const parseGetVendorsPackages = (data) => ({
  PackageID: data.packageId,
  VendorID: data.vendorId,
  AllowEBSCOtoSelectNewTitles: data.allowEbscoToAddTitles,
  PackageName: data.packageName,
  CustomCoverageBegin: data.beginCoverage,
  CustomCoverageEnd: data.endCoverage,
  VendorName: data.vendorName,
  HideOnPublicationFinder: data.visibilityData?.isHidden,
  PackageType: data.packageType,
  PackageContentType: data.contentType,
  IsProxyInherited: data.proxy?.inherited,
  HiddenBy: data.visibilityData?.reason,
  IsPackageCustom: data.isCustom,
  IsPackageSelected: data.isSelected,
  ProxyID: getProxy(data.proxy?.id),
});

/**
 * getVendorsPackages for unit enrich update
 * @param {Object} conf - config on institute (apikey, custid)
 * @param {Integer} vendorID - vendorID
 * @param {Integer} packageID - packageID
 * @param {String} index - Index where the values will be inserted
 * @returns {Object} Data ready to be inserted in elastic
 */
const getVendorsPackages = async (conf, vendorID, packageID, index) => {
  const {
    apikey,
    custid,
  } = conf;

  let res;
  let i = 1;

  do {
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
      logger.error(`${i} try, wait ${2 ** i} seconds for the next try`);
      await sleep(1000 * 2 ** i);
      i += 1;
    }
    if (res) break;
  } while (i <= 4);

  if (i >= 4) {
    logger.error(`Cannot request /${custid}/vendors/${vendorID}/packages/${packageID} - Fail 4 times`);
    process.exit(1);
  }

  const result = parseGetVendorsPackages(res?.data, index);
  return result;
};

module.exports = {
  getHoldingsStatus,
  getHoldings,
  getVendorsPackages,
  getVendorsPackagesTitles,
  postHoldings,
};
