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
 * @param {String} index Index where the values will be inserted
 * @param {boolean} update Type of bulk, if true: update bulk, else create
 * @returns {Object} Data ready to be inserted in elastic
 */
const parseGetHoldings = (data, institute, index) => {
  const results = [];
  data.forEach((e) => {
    const result = {
      rh: { value: `${institute}-${e?.vendor_id}-${e?.package_id}-${e?.title_id}`, tag: 'meta' },

      access_type: { value: e?.access_type, tag: 'kbart' },
      coverage_depth: { value: e?.coverage_depth, tag: 'kbart' },
      date_first_issue_online: { value: e?.date_first_issue_online || null, tag: 'kbart' },
      date_last_issue_online: { value: e?.date_last_issue_online || null, tag: 'kbart' },
      date_monograph_published_online: { value: e?.date_monograph_published_online || null, tag: 'kbart' },
      date_monograph_published_print: { value: e?.date_monograph_published_print || null, tag: 'kbart' },
      embargo_info: { value: e?.embargo_info, tag: 'kbart' },
      first_author: { value: e?.first_author, tag: 'kbart' },
      first_editor: { value: e?.first_editor, tag: 'kbart' },
      monograph_edition: { value: e?.monograph_edition, tag: 'kbart' },
      monograph_volume: { value: e?.monograph_volume, tag: 'kbart' },
      notes: { value: e?.notes, tag: 'kbart' },
      num_last_issue_online: { value: e?.num_last_issue_online, tag: 'kbart' },
      num_last_vol_online: { value: e?.num_last_vol_online, tag: 'kbart' },
      num_first_issue_online: { value: e?.num_first_issue_online, tag: 'kbart' },
      num_first_vol_online: { value: e?.num_first_vol_online, tag: 'kbart' },
      online_identifier: { value: e?.online_identifier, tag: 'kbart' },
      package_content_type: { value: e?.package_content_type, tag: 'kbart' },
      package_id: { value: e?.package_id, tag: 'kbart' },
      package_name: { value: e?.package_name, tag: 'kbart' },
      parent_publication_title_id: { value: e?.parent_publication_title_id, tag: 'kbart' },
      preceeding_publication_title_id: { value: e?.preceeding_publication_title_id, tag: 'kbart' },
      print_identifier: { value: e?.print_identifier, tag: 'kbart' },
      publication_title: { value: e?.publication_title, tag: 'kbart' },
      publication_type: { value: e?.publication_type, tag: 'kbart' },
      publisher_name: { value: e?.publisher_name, tag: 'kbart' },
      resource_type: { value: e?.resource_type, tag: 'kbart' },
      title_id: { value: e?.title_id, tag: 'kbart' },
      title_url: { value: e?.title_url, tag: 'kbart' },
      vendor_id: { value: e?.vendor_id, tag: 'kbart' },
      vendor_name: { value: e?.vendor_name, tag: 'kbart' },

      PackageID: { value: e?.package_id, tag: 'kbart' },
      VendorID: { value: e?.vendor_id, tag: 'kbart' },
      KBID: { value: e?.title_id, tag: 'kbart' },
      PackageName: { value: e?.package_name, tag: 'kbart' },
      VendorName: { value: e?.vendor_name, tag: 'kbart' },
      Title: { value: e?.publication_title, tag: 'kbart' },
      AccessType: { value: e?.access_type, tag: 'kbart' },
      PublicationType: { value: e?.publication_type, tag: 'kbart' },
      ResourceType: { value: e?.resource_type, tag: 'kbart' },
      URL: { value: e?.title_url, tag: 'kbart' },
      Author: { value: e?.first_author, tag: 'kbart' },
      NumLastIssueOnline: { value: e?.num_last_issue_online, tag: 'kbart' },
      NumLastVolOnline: { value: e?.num_last_vol_online, tag: 'kbart' },
      CoverageDepth: { value: e?.coverage_depth, tag: 'kbart' },
      NumFirstIssueOnline: { value: e?.num_first_issue_online, tag: 'kbart' },
      NumFirstVolOnline: { value: e?.num_first_vol_online, tag: 'kbart' },
      DateFirstIssueOnline: { value: e?.date_first_issue_onlinee || null, tag: 'kbart' },
      DateLastIssueOnline: { value: e?.date_last_issue_online || null, tag: 'kbart' },
      EmbargoInfo: { value: e?.embargo_info, tag: 'kbart' },
      OnlineIdentifier: { value: e?.online_identifier, tag: 'kbart' },
      PrintIdentifier: { value: e?.print_identifier, tag: 'kbart' },
    };
    results.push({ index: { _index: index, _id: result.rhID.value } });
    results.push({ doc: result });
  });
  return results.slice();
};

module.exports = {
  parseGetVendorsPackagesTitles,
  parseGetVendorsPackages,
  parseGetHoldings,
};
