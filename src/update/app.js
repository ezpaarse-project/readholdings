const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');

const morgan = require('./lib/morgan');
const logger = require('./lib/logger');

const createTableHoldings = require('./lib/sequelize/table');

const elastic = require('./service/elastic');
const database = require('./lib/sequelize/client');

const routerPing = require('./routers/ping');
const routerDifference = require('./routers/difference');
const routerJob = require('./routers/job');

const mapping = require('./mapping/Holdings.json');

const outDir = path.resolve(__dirname, 'out');
fs.ensureDir(path.resolve(outDir));
fs.ensureDir(path.resolve(outDir, 'report'));
fs.ensureDir(path.resolve(outDir, 'upload'));

const app = express();

app.use(express.json());
app.use(cors());
app.use(morgan);

app.use(routerPing);
app.use(routerJob);
app.use(routerDifference);

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
    await createTableHoldings('Holdings');
    logger.info('Table Holdings created');
  } catch (err) {
    logger.error(err);
  }

  try {
    await createTableHoldings('SaveHoldings');
    logger.info('Table SaveHoldings created');
  } catch (err) {
    logger.error(err);
  }

  try {
    await createTableHoldings('Cache');
    logger.info('Table Cache created');
  } catch (err) {
    logger.error(err);
  }

  elastic.createIndex(`${new Date().getFullYear()}-holdings`, mapping);
});
