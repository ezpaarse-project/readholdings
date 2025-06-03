export interface HoldingStandard {
  KBID?: string | null;
  Title?: string | null;
  AlternateTitle?: string | null;
  PackageName?: string | null;
  URL?: string | null;
  ProxiedURL?: string | null;
  Publisher?: string | null;
  Edition?: string | null;
  Author?: string | null;
  Editor?: string | null;
  Illustrator?: string | null;
  PrintISSN?: string | null;
  OnlineISSN?: string | null;
  PrintISBN?: string | null;
  OnlineISBN?: string | null;
  DOI?: string | null;
  PeerReviewed?: string | null;
  ManagedCoverageBegin?: string | string[] | null;
  ManagedCoverageEnd?: string | string[] | null;
  CustomCoverageBegin?: string | string[] | null;
  CustomCoverageEnd?: string | string[] | null;
  CoverageStatement?: string | null;
  Embargo?: string | null;
  CustomEmbargo?: string | null;
  Description?: string | null;
  Subject?: string | string[] | null;
  ResourceType?: string | null;
  PackageContentType?: string | null;
  CreateCustom?: string | null;
  HideOnPublicationFinder?: string | null;
  Delete?: string | null;
  OrderedThroughEBSCO?: string | null;
  IsCustom?: string | null;
  UserDefinedField1?: string | null;
  UserDefinedField2?: string | null;
  UserDefinedField3?: string | null;
  UserDefinedField4?: string | null;
  UserDefinedField5?: string | null;
  PackageType?: string | null;
  AllowEBSCOtoSelectNewTitles?: string | null;
  PackageID?: string | null;
  VendorName?: string | null;
  VendorID?: string | null;
  Absorbed?: string | null;
  Continued?: string | null;
  'Continued in part'?: string | null;
  Merged?: string | null;
  Split?: string | null;
}

export interface HoldingKbart {
  publication_title: string;
  print_identifier: string;
  online_identifier: string;
  date_first_issue_online: string;
  num_first_vol_online: string;
  num_first_issue_online: string;
  date_last_issue_online: string;
  num_last_vol_online: string;
  num_last_issue_online: string;
  title_url: string;
  first_author: string;
  title_id: string;
  embargo_info: string;
  coverage_depth: string;
  notes: string;
  publisher_name: string;
  publication_type: string;
  date_monograph_published_print: string;
  date_monograph_published_online: string;
  monograph_volume: string;
  monograph_edition: string;
  first_editor: string;
  parent_publication_title_id: string;
  preceeding_publication_title_id: string;
  access_type: string;
  package_name: string;
  package_id: string;
  vendor_name: string;
  vendor_id: string;
  resource_type: string;
  package_content_type: string;
  proxied_url: string;
}

export interface HoldingMeta {
  BibCNRS: string;
  createdAt: string;
  holdingID: string;
  EmbargoMonth?: number | null;
  CustomEmbargoMonth?: number | null;
  ManagedCoverageBegin?: string | string[] | null; // Date
  ManagedCoverageEnd?: string | string[] | null; // Date
  CustomCoverageBegin?: string | string[] | null; // Date
  CustomCoverageEnd?: string | string[] | null; // Date
  access_type: string;
  IN2P3: boolean;
  INC: boolean;
  'INC.label': string;
  INEE: boolean;
  'INEE.label': string;
  INP: boolean;
  'INP.label': string;
  INS2I: boolean;
  'INS2I.label': string;
  INSB: boolean;
  'INSB.label': string;
  INSHS: boolean;
  'INSHS.label': string;
  INSIS: boolean;
  'INSIS.label': string;
  INSMI: boolean;
  'INSMI.label': string;
  INSU: boolean;
  'INSU.label': string;
  INTEST: boolean;
  'INTEST.label': string;
  firstOccurrence?: boolean;
}

export interface Holding {
  meta: HoldingMeta;
  kbart2: HoldingKbart;
  standard: HoldingStandard;
}
