/* eslint-disable array-callback-return */
/* eslint-disable consistent-return */

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
  const id = identifiers.filter((identifier) => {
    if (identifier?.type === type && identifier?.subtype === subtype) {
      return identifier?.id;
    }
  });
  return id[0]?.id;
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
  return `${embargo.embargoValue * multiplicator} mois`;
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
 * Parse the result of getHoldings for ezHLM format
 * @param {Array<Object>} data Data to be parsed
 * @param {String} institute Name of institute
 * @param {boolean} update Type of bulk, if true: update bulk, else create
 * @returns {Object} Data ready to be inserted in elastic
 */
const parseGetHoldings = (data, institute) => {
  const results = [];
  data.forEach((e) => {
    const result = {
      rhID: `${institute}-${e?.vendor_id}-${e?.package_id}-${e?.title_id}`,

      access_type: e?.access_type,
      coverage_depth: e?.coverage_depth,
      date_first_issue_online: e?.date_first_issue_online || null,
      date_last_issue_online: e?.date_last_issue_online || null,
      date_monograph_published_online: e?.date_monograph_published_online || null,
      date_monograph_published_print: e?.date_monograph_published_print || null,
      embargo_info: e?.embargo_info,
      first_author: e?.first_author,
      first_editor: e?.first_editor,
      monograph_edition: e?.monograph_edition,
      monograph_volume: e?.monograph_volume,
      notes: e?.notes,
      num_last_issue_online: e?.num_last_issue_online,
      num_last_vol_online: e?.num_last_vol_online,
      num_first_issue_online: e?.num_first_issue_online,
      num_first_vol_online: e?.num_first_vol_online,
      online_identifier: e?.online_identifier,
      package_content_type: e?.package_content_type,
      package_id: e?.package_id,
      package_name: e?.package_name,
      parent_publication_title_id: e?.parent_publication_title_id,
      preceeding_publication_title_id: e?.preceeding_publication_title_id,
      print_identifier: e?.print_identifier,
      publication_title: e?.publication_title,
      publication_type: e?.publication_type,
      publisher_name: e?.publisher_name,
      resource_type: e?.resource_type,
      title_id: e?.title_id,
      title_url: e?.title_url,
      vendor_id: e?.vendor_id,
      vendor_name: e?.vendor_name,

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
    results.push(result);
  });
  return results.slice();
};

module.exports = {
  parseGetVendorsPackagesTitles,
  parseGetVendorsPackages,
  parseGetHoldings,
};
