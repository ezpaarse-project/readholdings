import axios from 'axios';

import appLogger from '~/lib/logger/appLogger';

import { transformEmbargo } from '~/lib/hlm';

const holdingsIQ = axios.create({
  baseURL: config.holdingsiq.baseURL,
  timeout: 20000,
});

const getProxy = (proxy) => {
  if (proxy === '<n>') {
    return undefined;
  }
  return proxy;
};

/**
 * Get the identifier according to the type and subtype.
 *
 * @param identifiers Array of Identifiers.
 * @param type Type of identifiers.
 * @param subtype Subtype of identifiers
 *
 * @returns name of contributor.
 */
const getIdentifier = (identifiers, type, subtype) => {
  const id = identifiers.filter((identifier) => {
    if (identifier?.type === type && identifier?.subtype === subtype) {
      return identifier?.id;
    }
    return '';
  });
  return id[0]?.id;
};

/**
 * Get the contributor according to the type.
 *
 * @param contributors Contributors array.
 * @param type Type of contributor.
 *
 * @returns Name of contributor.
 */
const getContributor = (contributors, type) => {
  if (contributors.length === 0) {
    return undefined;
  }
  return contributors.filter((contributor) => {
    if (contributor?.type === type) {
      return contributor?.value;
    }
    return '';
  });
};

/**
 * Parse the result of getVendorsPackages for ezHLM format
 *
 * @param data Data to be parsed
 *
 * @returns Data ready to be inserted in elastic
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
 * Parse the result of getHoldings for Holding format
 *
 * @param data Data to be parsed.
 * @param institute Name of institute.
 * @param index Index where the values will be inserted.
 * @param update Type of bulk, if true: update bulk, else create.
 *
 * @returns Data ready to be inserted in elastic.
 */
const parseGetHoldings = (data, institute, index) => {
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
    results.push({ index: { _index: index, _id: result.ezhlmid } });
    results.push({ doc: result });
  });
  return results.slice();
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
  Embargo: transformEmbargo(data?.customerResourcesList?.[0]?.managedEmbargoPeriod),
  CustomEmbargo: transformEmbargo(data?.customerResourcesList?.[0]?.customEmbargoPeriod),
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
 * Reload snapshot on holdings.
 *
 * @param conf Config on institute (name, apikey, custid).
 *
 * @returns number of data.
 */
export async function postHoldings(conf) {
  const {
    apikey,
    custid,
  } = conf;

  let res;

  try {
    res = await holdingsIQ({
      method: 'post',
      url: `/${custid}/holdings`,
      headers: {
        'x-api-key': apikey,
        'Content-Type': 'application/json',
      },
    });
  } catch (err) {
    appLogger.error(`[holdings] Cannot post /${custid}/holdings`);
  }

  return res?.data?.totalCount;
}

/**
 * Det number of data of custid
 *
 * @param conf Config on institute (name, apikey, custid)
 *
 * @returns Number of data.
 */
export async function getHoldingsStatus(conf) {
  const {
    apikey,
    custid,
  } = conf;

  let res;

  try {
    res = await holdingsIQ({
      method: 'get',
      url: `/${custid}/holdings/status`,
      headers: {
        'x-api-key': apikey,
        'Content-Type': 'application/json',
      },
    });
  } catch (err) {
    appLogger.error(`[holdings] Cannot get /${custid}/holdings/status`);
  }

  return res?.data;
}

/**
 * getHoldings for enrich initialization.
 *
 * @param conf Config on institute (name, apikey, custid).
 * @param count Number of documents to recover.
 * @param offset page.
 * @param index Index where the values will be inserted.
 * @param Type of bulk, if true: update bulk, else create.
 *
 * @returns Data ready to be inserted in elastic.
 */
export async function getHoldings(conf, count, offset, index) {
  const {
    apikey,
    custid,
    name,
  } = conf;

  let res;

  try {
    res = await holdingsIQ({
      method: 'get',
      url: `/${custid}/holdings`,
      params: { count, offset, format: 'kbart2' },
      headers: {
        'x-api-key': apikey,
        'Content-Type': 'application/json',
      },
    });
  } catch (err) {
    appLogger.error(`[holdings] Cannot get /${custid}/holdings`);
    throw err;
  }

  const result = parseGetHoldings(res?.data?.holdings, name, index);
  return result;
}

/**
 * getVendorsPackages for unit enrich update
 *
 * @param conf Config on institute (apikey, custid)
 * @param vendorID VendorID
 * @param packageID PackageID
 *
 * @returns Data ready to be inserted in elastic
 */
export async function getVendorsPackages(conf, vendorID, packageID) {
  const {
    apikey,
    custid,
  } = conf;

  let res;

  try {
    res = await holdingsIQ({
      method: 'get',
      url: `/${custid}/vendors/${vendorID}/packages/${packageID}`,
      headers: {
        'x-api-key': apikey,
        'Content-Type': 'application/json',
      },
    });
  } catch (err) {
    appLogger.error(`[holdings] Cannot get /${custid}/vendors/${vendorID}/packages/${packageID}`);
    throw err;
  }
  const result = parseGetVendorsPackages(res?.data);
  return result;
}

/**
 * getVendorsPackagesTitles for unit enrich update
 * @param {Object} conf - config on institute (, apikey, custid)
 * @param {*} vendorID - vendorID
 * @param {*} packageID - packageID
 * @param {*} kbID - kbID
 * @returns {Object} Data ready to be inserted in elastic
 */
export async function getVendorsPackagesTitles(conf, vendorID, packageID, kbID) {
  const {
    apikey,
    custid,
  } = conf;

  let res;

  try {
    res = await holdingsIQ({
      method: 'get',
      url: `/${custid}/vendors/${vendorID}/packages/${packageID}/titles/${kbID}`,
      headers: {
        'x-api-key': apikey,
        'Content-Type': 'application/json',
      },
    });
  } catch (err) {
    appLogger.error(`[holdings] Cannot get /${custid}/vendors/${vendorID}/packages/${packageID}/titles/${kbID}`);
    throw err;
  }

  const result = parseGetVendorsPackagesTitles(res?.data);
  return result;
}
