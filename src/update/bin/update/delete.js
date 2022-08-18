const { diffID } = require('../../lib/service/database');

const { bulkRemove, refresh } = require('../../lib/service/elastic');

async function deleteLines(saveHoldingTable, holdingTable, step) {
  const ids = await diffID(saveHoldingTable, holdingTable);

  const index = `${new Date().getFullYear()}-holdings`;
  const body = ids.flatMap((e) => [{ delete: { _index: index, _id: e.rhID } }]);

  const size = 4000;
  const nbPage = Math.ceil(body.length / size);

  for (let currentPage = 0; currentPage < nbPage; currentPage += 1) {
    const page = body.slice(currentPage * 4000, (currentPage + 1) * 4000);
    await bulkRemove(page, index);
  }

  await refresh(index);

  step.endAt = new Date();
  step.deletedLines = ids.length;
  step.status = 'success';
}

module.exports = deleteLines;
