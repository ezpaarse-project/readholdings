const path = require('path');
const fs = require('fs-extra');
const os = require('os');
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
    this.totalRequest = 0;
    this.totalTime = 0;
    this.totalLineDeleted = 0;
    this.totalLineUpdated = 0;
    this.totalLineAdded = 0;
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
    step.time = Math.abs(differenceInSeconds(step.createdAt, step.endAt));
    this.steps[this.steps.length - 1] = step;
    await this.saveInFile();
  }

  stepUpdateSnapshot() {
    logger.info('step - update snapshot on holdingsIQ');
    const step = {
      name: 'updateSnapshot',
      createdAt: new Date(),
      nbRequest: 0,
      endAt: null,
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
      endAt: null,
      status: 'inProgress',
    };
    this.steps.push(step);
    return step;
  }

  createStepUpdateCache() {
    logger.info('step - enrich cache with api holding');
    const step = {
      name: 'enrichCache',
      createdAt: new Date(),
      nbRequest: 0,
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
      status: 'inProgress',
    };
    this.steps.push(step);
    return step;
  }

  stepInterchangeTableName() {
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
      status: 'inProgress',
    };
    this.steps.push(step);
    return step;
  }

  endState() {
    this.done = true;
    this.endAt = new Date();
    this.totalTime = Math.abs(differenceInSeconds(this.createdAt, this.endAt));

    this.steps.forEach((step) => {
      if (step?.nbRequest) {
        this.totalRequest += step.totalRequest;
      }
      if (step?.deletedLines) {
        this.nbDeletedLines += step.deletedLines;
      }
      if (step?.cacheUpdatedLines) {
        this.nbUpdatedLines += step.cacheUpdatedLines;
      }
      if (step?.cacheInsertedLines) {
        this.nbAddedLines += step.cacheInsertedLines;
      }
    });

    return this;
  }

  fail() {
    const step = this.getLatestStep();
    step.status = 'error';
    this.setLatestStep(step);
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
