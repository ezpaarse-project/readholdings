const { checkArgs } = require('../../bin/utils');

const elastic = require('../../services/elastic');

async function mergeMarcIndex(args) {
  const { index, customer } = await checkArgs(args);
  const { name } = customer;
  const { state } = args;

  let step;

  if (state) {
    state.addStepMerge();
    step = state.getLatestStep();
  }

  const indexMarc = `${name}-marc`.toLowerCase();
  const client = elastic.connection();
  const marcs = await elastic.getAll(client, indexMarc);
  const results = [];

  for (let i = 0; i < marcs.length; i += 1) {
    const result = marcs[i];
    results.push({ index: { _index: index, _id: result?.index?.id } });
    results.push(result);
  }

  results.slice();

  await elastic.bulk(client, results, 'index');

  if (state) {
    step.endAt = new Date();
    step.status = 'success';
    state.setLatestStep(step);
  }
}

module.exports = mergeMarcIndex;
