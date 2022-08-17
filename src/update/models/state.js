const path = require('path');
const fs = require('fs-extra');
const { differenceInSeconds } = require('date-fns');
const logger = require('../lib/logger');

class State {
  constructor(customer) {
    this.customer = customer;
    this.done = false;
    this.createdAt = new Date();
    this.steps = [];
    this.endAt = null;
    this.error = false;
    this.nbRequest = 0;
    this.time = 0;
    this.nbDeletedLines = 0;
    this.nbUpdatedLines = 0;
    this.nbInsertedLines = 0;
  }

  increment(key, value) {
    this[key] += value;
  }

  set(key, value) {
    this[key] = value;
  }

  getLatestStep() {
    return this.steps[this.steps.length - 1];
  }

  async setLatestStep(step) {
    if (!step.endAt) step.endAt = new Date();
    step.time = Math.abs(differenceInSeconds(step.createdAt, step.endAt));
    this.steps[this.steps.length - 1] = step;
    await this.saveInFile();
  }

  stepUpdateSnapshot() {
    logger.info('step - update snapshot on holdings API');
    const step = {
      name: 'updateSnapshot',
      createdAt: new Date(),
      endAt: null,
      time: 0,
      nbRequest: 0,
      status: 'inProgress',
    };
    this.steps.push(step);
    return step;
  }

  createStepSaveCache() {
    logger.info('step - save cache');
    const step = {
      name: 'saveCache',
      createdAt: new Date(),
      nbRequest: 0,
      nbCacheLine: 0,
      nbLine: 0,
      endAt: null,
      status: 'inProgress',
    };
    this.steps.push(step);
    return step;
  }

  createStepEnrichCache() {
    logger.info('step - enrich cache with api holding');
    const step = {
      name: 'enrichCache',
      createdAt: new Date(),
      nbRequest: 0,
      nbLine: 0,
      endAt: null,
      status: 'inProgress',
    };
    this.steps.push(step);
    return step;
  }

  createStepMergeCache() {
    logger.info('step - merge the content of Cache table in elastic');
    const step = {
      name: 'mergeCache',
      createdAt: new Date(),
      endAt: null,
      time: 0,
      status: 'inProgress',
    };
    this.steps.push(step);
    return step;
  }

  createStepDeleteLines() {
    logger.info('step - delete line on elastic');
    const step = {
      name: 'deleteLines',
      createdAt: new Date(),
      endAt: null,
      time: 0,
      nbLine: 0,
      status: 'inProgress',
    };
    this.steps.push(step);
    return step;
  }

  stepSwapTableNames() {
    logger.info('step - Save current Table Holding for tomorrow');
    const step = {
      name: 'swapTableNames',
      createdAt: new Date(),
      endAt: null,
      status: 'inProgress',
    };
    this.steps.push(step);
    return step;
  }

  stepClean() {
    logger.info('step - Clean Cache and Holdings');
    const step = {
      name: 'clean',
      createdAt: new Date(),
      endAt: null,
      time: 0,
      status: 'inProgress',
    };
    this.steps.push(step);
    return step;
  }

  endState() {
    this.done = true;
    this.endAt = new Date();
    this.totalTime = Math.abs(differenceInSeconds(this.createdAt, this.endAt));

    const [stepMergeCache] = this.steps.filter((e) => e.name === 'mergeCache');
    const [stepDeleteLines] = this.steps.filter((e) => e.name === 'deleteLines');

    if (stepMergeCache) {
      this.nbUpdatedLines += stepMergeCache.updatedLines;
      this.nbInsertedLines += stepMergeCache.insertedLines;
    }

    if (stepDeleteLines) this.nbDeletedLines += stepDeleteLines.nbLine;

    this.steps.forEach((e) => {
      if (e.time) this.time += e.time;
      if (e.nbRequest) this.nbRequest += e.nbRequest;
    });

    return this;
  }

  async fail() {
    const step = this.getLatestStep();
    step.status = 'error';
    await this.setLatestStep(step);
    this.done = true;
    this.endAt = new Date();
    this.error = true;
    // TODO send error mail
  }

  async saveInFile() {
    const reportName = `${this.createdAt.toISOString()}.json`;
    const reportPath = path.resolve(__dirname, '..', 'out', 'report', this.customer, reportName);

    try {
      await fs.writeFile(reportPath, JSON.stringify(this, null, 2), 'utf8');
    } catch (err) {
      logger.error(`Cannot write ${JSON.stringify(this, null, 2)} in ${reportPath}`);
      logger.error(err);
      return false;
    }
    return true;
  }
}

module.exports = State;
