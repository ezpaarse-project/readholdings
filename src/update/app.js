const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');

const morgan = require('./lib/morgan');
const logger = require('./lib/logger');

const createTableHoldings = require('./lib/sequelize/table');

const elastic = require('./lib/service/elastic');
const database = require('./lib/sequelize/client');

const routerPing = require('./routers/ping');
const routerDifference = require('./routers/difference');
const routerJob = require('./routers/job');
const routerStep = require('./routers/step');
const routerReport = require('./routers/report');

const mapping = require('./mapping/Holdings.json');

const outDir = path.resolve(__dirname, 'out');
fs.ensureDir(path.resolve(outDir));
fs.ensureDir(path.resolve(outDir, 'report'));
fs.ensureDir(path.resolve(outDir, 'upload'));

const reportDir = path.resolve(outDir, 'report');

fs.ensureDir(path.resolve(reportDir, 'insb'));
fs.ensureDir(path.resolve(reportDir, 'inc'));
fs.ensureDir(path.resolve(reportDir, 'inee'));
fs.ensureDir(path.resolve(reportDir, 'inshs'));
fs.ensureDir(path.resolve(reportDir, 'insis'));
fs.ensureDir(path.resolve(reportDir, 'insmi'));
fs.ensureDir(path.resolve(reportDir, 'in2p3'));
fs.ensureDir(path.resolve(reportDir, 'inp'));
fs.ensureDir(path.resolve(reportDir, 'ins2i'));
fs.ensureDir(path.resolve(reportDir, 'insu'));

const app = express();

app.use(express.json());
app.use(cors());
app.use(morgan);

app.use(routerPing);
app.use(routerJob);
app.use(routerDifference);
app.use(routerStep);
app.use(routerReport);

app.listen(3000, async () => {
  logger.info('ReadHoldings update service listening on 3000');
  elastic.ping();
  try {
    await database.ping();
    const postgres = database.client.config;
    logger.info(`Database: Connected to ${postgres.host}:${postgres.port} with user: [${postgres.username}]`);
  } catch (err) {
    logger.error(err);
  }

  try {
    await createTableHoldings('inshs-holdings');
    logger.info('Table [inshs-holdings] created');
  } catch (err) {
    logger.error(err);
  }

  try {
    await createTableHoldings('inshs-saveholdings');
    logger.info('Table [inshs-saveholdings] created');
  } catch (err) {
    logger.error(err);
  }

  try {
    await createTableHoldings('inshs-caches');
    logger.info('Table [inshs-caches] created');
  } catch (err) {
    logger.error(err);
  }

  elastic.createIndex(`${new Date().getFullYear()}-holdings`, mapping);
});
