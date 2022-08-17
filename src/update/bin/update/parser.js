/* eslint-disable array-callback-return */
/* eslint-disable consistent-return */

/**
 * get the contributor according to the type
 * @param {Array<Object>} contributors - contributors array
 * @param {String} type - type of contributor
 * @returns {String} name of contributor
 */
function getContributor(contributors, type) {
  if (contributors.length === 0) {
    return undefined;
  }

  let contributor;

  contributors.filter((e) => {
    if (e?.type.toLowerCase() === type) {
      contributor = e?.contributor;
    }
  });

  return contributor;
}

/**
 * get the identifier according to the type and subtype
 * @param {Array<Object>} identifiers - identifiers array
 * @param {String} type - type of identifiers
 * @param {String} subtype - subtype of identifiers
 * @returns {String} name of contributor
 */
function getIdentifier(identifiers, type, subtype) {
  const id = identifiers.filter((identifier) => {
    if (identifier?.type === type && identifier?.subtype === subtype) {
      return identifier?.id;
    }
  });
  return id[0]?.id;
}

/**
 * parse embargo to month unit to readHolding format
 * @param {Object} embargo embargo
 * @returns {String} embargo at ezhlm format
 */
function getEmbargo(embargo) {
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
}

/**
 * parse proxy to ezHLM format
 * @param {Object} proxy proxy
 * @returns {String} proxy at ezhlm format
 */
function getProxy(proxy) {
  if (proxy === '<n>') {
    return undefined;
  }
  return proxy;
}

/**
 * Parse the result of getVendorsPackagesTitles for ezHLM format
 * @param {Array<Object>} data Data to be parsed
 * @returns {Object} Data ready to be inserted in elastic
 */
function parseGetVendorsPackagesTitles(data) {
  return {
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
    Author: getContributor(data?.contributorsList, 'author'),
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
    Editor: getContributor(data?.contributorsList, 'editor'),
    Edition: data?.edition,
    Illustrator: getContributor(data?.contributorsList, 'illustrator'),
    AlternateTitle: data?.alternateTitle,
    isPackageCustom: data?.customerResourcesList?.[0]?.isPackageCustom,
    ProxyID: getProxy(data?.customerResourcesList?.[0]?.proxy?.id),
    isTitleSelected: data?.customerResourcesList?.[0]?.isSelected,
  };
}

function parseGetVendorsPackages(data) {
  return {
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
  };
}

/**
 * Parse the result of getHoldings for ezHLM format
 * @param {Array<Object>} data Data to be parsed
 * @param {String} institute Name of institute
 * @returns {Object} Data ready to be inserted in elastic
 */
function parseGetHoldings(data, institute) {
  return data.map((e) => ({
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
  }));
}

function parseCacheForElastic(data, index) {
  const results = [];
  data.forEach((e) => {
    const result = {
      rhID: { value: e.rHID, tag: 'meta' },
      Customer: { value: e?.Customer, tag: 'meta' },
      CustomerID: { value: e?.CustomerID, tag: 'meta' },
      updatedAt: { value: e?.updatedAt, tag: 'meta' },

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

      AllowEBSCOtoSelectNewTitles: { value: e?.AllowEBSCOtoSelectNewTitles, tag: 'proprietary' },
      AlternateTitle: { value: e?.AlternateTitle, tag: 'proprietary' },
      Author: { value: e?.Author, tag: 'proprietary' },
      CoverageStatement: { value: e?.CoverageStatement, tag: 'proprietary' },
      CreateCustom: { value: e?.CreateCustom, tag: 'proprietary' },
      CustomCoverageBegin: { value: e?.CustomCoverageBegin, tag: 'proprietary' },
      CustomCoverageEnd: { value: e?.CustomCoverageEnd, tag: 'proprietary' },
      CustomCoverageSetBy: { value: e?.CustomCoverageSetBy, tag: 'proprietary' },
      CustomEmbargo: { value: e?.CustomEmbargo, tag: 'proprietary' },
      Delete: { value: e?.Delete, tag: 'proprietary' },
      Description: { value: e?.Description, tag: 'proprietary' },
      DOI: { value: e?.DOI, tag: 'proprietary' },
      Edition: { value: e?.Edition, tag: 'proprietary' },
      Editor: { value: e?.Editor, tag: 'proprietary' },
      Embargo: { value: e?.Embargo, tag: 'proprietary' },
      HiddenBy: { value: e?.HiddenBy, tag: 'proprietary' },
      HideOnPublicationFinder: { value: e?.HideOnPublicationFinder, tag: 'proprietary' },
      Illustrator: { value: e?.Illustrator, tag: 'proprietary' },
      IsCustom: { value: e?.IsCustom, tag: 'proprietary' },
      IsPackageCustom: { value: e?.IsPackageCustom, tag: 'proprietary' },
      IsPackageSelected: { value: e?.IsPackageSelected, tag: 'proprietary' },
      IsProxyInherited: { value: e?.IsProxyInherited, tag: 'proprietary' },
      isTitleSelected: { value: e?.isTitleSelected, tag: 'proprietary' },
      KBID: { value: e?.KBID, tag: 'proprietary' },
      ManagedCoverageBegin: { value: e?.ManagedCoverageBegin, tag: 'proprietary' },
      ManagedCoverageEnd: { value: e?.ManagedCoverageEnd, tag: 'proprietary' },
      OnlineISBN: { value: e?.OnlineISBN, tag: 'proprietary' },
      OnlineISSN: { value: e?.OnlineISSN, tag: 'proprietary' },
      OrderedThroughtEBSCO: { value: e?.OrderedThroughtEBSCO, tag: 'proprietary' },
      PackageContentType: { value: e?.PackageContentType, tag: 'proprietary' },
      PackageID: { value: e?.PackageID, tag: 'proprietary' },
      PackageName: { value: e?.PackageName, tag: 'proprietary' },
      PackageType: { value: e?.PackageType, tag: 'proprietary' },
      PeerReviewed: { value: e?.PeerReviewed, tag: 'proprietary' },
      PrintISBN: { value: e?.PrintISBN, tag: 'proprietary' },
      PrintISSN: { value: e?.PrintISSN, tag: 'proprietary' },
      ProxyURL: { value: e?.ProxyURL, tag: 'proprietary' },
      ProxyID: { value: e?.ProxyID, tag: 'proprietary' },
      Publisher: { value: e?.Publisher, tag: 'proprietary' },
      RessourceType: { value: e?.RessourceType, tag: 'proprietary' },
      SelectedBy: { value: e?.SelectedBy, tag: 'proprietary' },
      Subject: { value: e?.Subject, tag: 'proprietary' },
      Title: { value: e?.Title, tag: 'proprietary' },
      TitleCount: { value: e?.TitleCount, tag: 'proprietary' },
      URL: { value: e?.URL, tag: 'proprietary' },
      UserDefinedField1: { value: e?.UserDefinedField1, tag: 'proprietary' },
      UserDefinedField2: { value: e?.UserDefinedField2, tag: 'proprietary' },
      UserDefinedField3: { value: e?.UserDefinedField3, tag: 'proprietary' },
      UserDefinedField4: { value: e?.UserDefinedField4, tag: 'proprietary' },
      UserDefinedField5: { value: e?.UserDefinedField5, tag: 'proprietary' },
      VendorID: { value: e?.ProxyID, tag: 'proprietary' },
      VendorName: { value: e?.ProxyID, tag: 'proprietary' },
    };
    results.push({ index: { _index: index, _id: result.rhID.value } });
    results.push({ doc: result });
  });
  return results.slice();
}

module.exports = {
  parseGetVendorsPackagesTitles,
  parseGetVendorsPackages,
  parseGetHoldings,
  parseCacheForElastic,
};
