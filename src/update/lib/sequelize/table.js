const { DataTypes } = require('sequelize');
const { client } = require('./client');

async function createTableHoldings(name) {
  const Holdings = client.define(name.toLowerCase(), {
    // Model attributes are defined here
    rhID: {
      type: DataTypes.TEXT,
      allowNull: false,
      primaryKey: true,
    },
    CustomerID: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    Customer: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
  
    AllowEBSCOtoSelectNewTitles: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    AlternateTitle: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    Author: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    CreateCustom: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    CustomCoverageBegin: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    CustomCoverageEnd: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    CustomCoverageSetBy: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    CustomEmbargo: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    Delete: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    Description: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    DOI: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    Edition: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    Editor: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    Embargo: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    HiddenBy: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    HideOnPublicationFinder: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    Illustrator: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    IsCustom: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    IsPackageCustom: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    IsPackageSelected: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    IsProxyInherited: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    IsTitleSelected: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    KBID: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    ManagedCoverageBegin: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    ManagedCoverageEnd: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    OnlineISBN: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    OnlineISSN: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    OrderedThroughEBSCO: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    PackageContentType: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    PackageID: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    PackageName: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    PackageType: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    PeerReviewed: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    PrintISBN: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    PrintISSN: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    ProxiedURL: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    ProxyID: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    Publisher: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    ResourceType: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    SelectedBy: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    Subject: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    Title: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    TitleCount: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    URL: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    UserDefinedField1: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    UserDefinedField2: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    UserDefinedField3: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    UserDefinedField4: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    UserDefinedField5: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    VendorID: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    VendorName: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
  
    access_type: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    coverage_depth: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    date_first_issue_online: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    date_last_issue_online: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    date_monograph_published_online: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    date_monograph_published_print: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    embargo_info: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    first_author: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    first_editor: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    monograph_edition: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    monograph_volume: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    num_first_issue_online: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    num_first_vol_online: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    num_last_issue_online: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    num_last_vol_online: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    online_identifier: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    package_content_type: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    package_id: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    package_name: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    parent_publication_title_id: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    preceeding_publication_title_id: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    print_identifier: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    publication_title: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    publication_type: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    publisher_name: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    resource_type: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    title_id: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    title_url: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    vendor_id: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    vendor_name: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
  }, {
    sequelize: client,
    logging: false,
    modelName: 'holdings',
    charset: 'utf8',
    collate: 'utf8_general_ci',
    timestamps: true,
  });

  await Holdings.sync();
}

module.exports = createTableHoldings;
