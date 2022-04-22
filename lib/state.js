const logger = require('./logger');

class State {
  constructor(customer) {
    this.customer = customer;
    this.done = false;
    this.createdAt = new Date();
    this.steps = [];
    this.endAt = null;
    this.error = false;
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
      createdAt: new Date(),
      endAt: null,
      errors: [],
      ezhlmids: [],
      status: 'inProgress',
    };
    this.steps.push(step);
  }

  addStepMerge() {
    logger.info('step - Merge the Marc index in the current index');
    const step = {
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
}

module.exports = State;
