const path = require('path');
const fs = require('fs-extra');
const os = require('os');
const logger = require('../lib/logger');

class State {
  constructor(customer) {
    this.customer = customer;
    this.done = false;
    this.createdAt = new Date();
    this.steps = [];
    this.endAt = null;
    this.error = false;
    this.ezhlmid = 0;
    this.request = 0;
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

  setLatestStep(step) {
    this.steps[this.steps.length - 1] = step;
  }

  addStepUpdateSnapshot() {
    logger.info('step - update snapshot on holdingsIQ');
    const step = {
      name: 'Update snapshot on Holdings',
      createdAt: new Date(),
      endAt: null,
      totalLine: 0,
      status: 'inProgress',
    };
    this.steps.push(step);
  }

  addStepSnapshotIndex() {
    logger.info('step - generate snapshot index that content the snapshot of holdingsIQ');
    const step = {
      name: 'Create snapshot index on elastic',
      createdAt: new Date(),
      endAt: null,
      insertedLine: 0,
      status: 'inProgress',
    };
    this.steps.push(step);
  }

  addStepDownloadMarc() {
    logger.info('step - download marc files from FTP server');
    const step = {
      name: 'Download xml delta file from Marc',
      createdAt: new Date(),
      endAt: null,
      files: [],
      status: 'inProgress',
    };
    this.steps.push(step);
  }

  addStepMarcIndex() {
    logger.info('step - Enriches the marc index by creating ezhlm-id according to the XML file content and enriches these with the holdingsIQ API');
    const step = {
      name: 'Create delta index on elastic',
      createdAt: new Date(),
      endAt: null,
      errors: [],
      ezhlmids: [],
      request: 0,
      status: 'inProgress',
    };
    this.steps.push(step);
  }

  addStepMerge() {
    logger.info('step - Merge the Marc index in the current index');
    const step = {
      name: 'Merge delta index on current index',
      createdAt: new Date(),
      endAt: null,
      linesCreated: 0,
      linesUpdated: 0,
      errors: [],
      status: 'inProgress',
    };
    this.steps.push(step);
  }

  addStepDelete() {
    logger.info('step - Delete data from current snapshots with ezhlmid from Marc delete files');
    const step = {
      name: 'Delete holdings with delta',
      createdAt: new Date(),
      endAt: null,
      linesDeleted: 0,
      errors: [],
      status: 'inProgress',
    };
    this.steps.push(step);
  }

  addStepClean() {
    logger.info('step - Clean files');
    const step = {
      name: 'clean indices and files',
      createdAt: new Date(),
      endAt: null,
      files: [],
      status: 'inProgress',
    };
    this.steps.push(step);
  }

  endState() {
    this.done = true;
    this.endAt = new Date();
  }

  fail() {
    const step = this.getLatestStep();
    step.status = 'error';
    this.setLatestStep(step);
    this.done = true;
    this.endAt = new Date();
    this.error = true;
    process.exit(1);
  }

  async saveInFile() {
    const configPath = path.resolve(os.homedir(), '.config', 'ezhlm.json');
    const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
    const reportPath = config?.report;

    if (!fs.stat(reportPath)) {
      try {
        await fs.mkdir(reportPath);
      } catch (err) {
        logger.error(`Cannot create reportDir in ${path.resolve(reportPath)}`);
        process.exit(1);
      }
    }

    await fs.ensureDir(path.resolve(reportPath, this.customer));

    const reportName = `${new Date().toISOString()}.json`;
    try {
      await fs.writeFile(path.resolve(reportPath, this.customer, reportName), JSON.stringify(this, null, 2), 'utf8');
    } catch (err) {
      logger.error(`Cannot write ${JSON.stringify(config, null, 2)} in ${path.resolve(reportPath, this.customer, reportName)}`);
      logger.error(err);
      process.exit(1);
    }
  }
}

module.exports = State;
