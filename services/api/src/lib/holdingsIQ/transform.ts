/**
 * Convert coverage to Array of string.
 *
 * @param coverage coverage data.
 *
 * @returns
 */
export function transformCoverage(coverage: string) {
  if (coverage === 'Present') {
    return `${new Date().getFullYear()}-12-31`;
  }

  let updatedArray;

  if (coverage.includes('|')) {
    updatedArray = coverage.split('|');
    return updatedArray.map((item) => (item === 'Present' ? `${new Date().getFullYear()}-12-31` : item));
  }

  return coverage;
}

/**
 * Convert coverage to Array of string.
 *
 * @param coverage coverage data.
 *
 * @returns
 */
export function transformStringToArray(coverage: string) {
  if (coverage.includes('|')) {
    return coverage.split('|');
  }
  return coverage;
}

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
function getIdentifier(identifiers, type, subtype) {
  const id = identifiers.filter((identifier) => {
    if (identifier?.type === type && identifier?.subtype === subtype) {
      return identifier?.id;
    }
    return '';
  });
  return id[0]?.id;
}

/**
 * Get the contributor according to the type.
 *
 * @param contributors Contributors array.
 * @param type Type of contributor.
 *
 * @returns Name of contributor.
 */
function getContributor(contributors, type) {
  if (contributors.length === 0) {
    return undefined;
  }
  return contributors.filter((contributor) => {
    if (contributor?.type === type) {
      return contributor?.value;
    }
    return '';
  });
}

/**
 * Transform the result of getVendorsPackages for ezHLM format
 *
 * @param data Data to be transformed
 *
 * @returns Data ready to be inserted in elastic
 */
export function transformGetVendorsPackages(data) {
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
 * Transform the result of getHoldings for Holding format
 *
 * @param data Data to be transformed.
 * @param institute Name of institute.
 * @param index Index where the values will be inserted.
 * @param update Type of bulk, if true: update bulk, else create.
 *
 * @returns Data ready to be inserted in elastic.
 */
export function transformGetHoldings(data, institute) {
  return {
    holdingID: `${institute}-${data?.vendor_id}-${data?.package_id}-${data?.title_id}`,
    PackageID: data?.package_id,
    VendorID: data?.vendor_id,
    KBID: data?.title_id,
    PackageName: data?.package_name,
    VendorName: data?.vendor_name,
    Title: data?.publication_title,
    AccessType: data?.access_type,
    PublicationType: data?.publication_type,
    ResourceType: data?.resource_type,
    URL: data?.title_url,
    Author: data?.first_author,
    NumLastIssueOnline: data?.num_last_issue_online,
    NumLastVolOnline: data?.num_last_vol_online,
    CoverageDepth: data?.coverage_depth,
    NumFirstIssueOnline: data?.num_first_issue_online,
    NumFirstVolOnline: data?.num_first_vol_online,
    DateFirstIssueOnline: data?.date_first_issue_online || null,
    DateLastIssueOnline: data?.date_last_issue_online || null,
    EmbargoInfo: data?.embargo_info,
    OnlineIdentifier: data?.online_identifier,
    PrintIdentifier: data?.print_identifier,
  };
}

export function transformEmbargo(embargo) {
  const time = embargo;

  if (!time) {
    return time;
  }

  const separate = time.split(' ');
  const number = separate[0];
  const indicator = separate[1].toUpperCase();

  let ratio = 1;
  if (indicator === 'YEARS') {
    ratio = 12;
  }
  if (indicator === 'DAYS') {
    ratio = 0.3;
  }

  return number * ratio;
}

/**
 * Transform the result of getVendorsPackagesTitles for ezHLM format
 * @param {Array<Object>} data Data to be transformed
 * @returns {Object} Data ready to be inserted in elastic
 */
export function transformGetVendorsPackagesTitles(data) {
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
  };
}
