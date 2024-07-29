const fs = require('fs-extra');
const path = require('path');

function sleep(waitTimeInMs) { return new Promise((resolve) => setTimeout(resolve, waitTimeInMs)); }

/**
 * get the files in a dir in order by date
 * @param {String} dir - dir path
 * @returns {array<string>} files path in order
 */
async function orderRecentFiles(dir) {
  const filenames = await fs.readdir(dir);

  const files = await Promise.all(
    filenames.map(async (filename) => {
      const filePath = path.resolve(dir, filename);
      return {
        filename,
        stat: await fs.lstat(filePath),
      };
    }),
  );

  return files
    .filter((file) => file.stat.isFile())
    .sort((a, b) => b.stat.mtime.getTime() - a.stat.mtime.getTime());
}

async function getFilesByCustomer(dir) {
  const filenames = await fs.readdir(dir);

  const files = await Promise.all(
    filenames.map(async (filename) => {
      const filePath = path.resolve(dir, filename);
      return {
        filename,
        stat: await fs.lstat(filePath),
      };
    }),
  );

  return files
    .filter((file) => file.stat.isFile())
    .sort((a, b) => b.stat.mtime.getTime() - a.stat.mtime.getTime())
    .map((file) => file.filename);
}
/**
 * get the most recent file in a dir
 * @param {String} dir - dir path
 * @returns {String} most recent file path
 */
async function getMostRecentFile(dir) {
  const files = await orderRecentFiles(dir);
  return files.length ? files[0] : undefined;
}

const args = [
  'access_type',
  'coverage_depth',
  'date_first_issue_online',
  'date_last_issue_online',
  'date_monograph_published_online',
  'date_monograph_published_print',
  'embargo_info',
  'first_author',
  'first_editor',
  'monograph_edition',
  'monograph_volume',
  'notes',
  'num_first_issue_online',
  'num_first_vol_online',
  'num_last_issue_online',
  'num_last_vol_online',
  'online_identifier',
  'package_content_type',
  'package_id',
  'package_name',
  'parent_publication_title_id',
  'preceeding_publication_title_id',
  'print_identifier',
  'publication_title',
  'publication_type',
  'publisher_name',
  'resource_type',
  'title_id',
  'title_url',
  'vendor_id',
  'vendor_name',
];

module.exports = {
  orderRecentFiles,
  getMostRecentFile,
  getFilesByCustomer,
  sleep,
  args,
};
