const router = require('express').Router();
const elasticClient = require('../service/elastic');
const sequelize = require('../lib/sequelize/client');

router.get('/', async (req, res) => res.status(200).json('update service'));

router.get('/ping', async (req, res, next) => res.status(200).json(true));

router.get('/ping/database', async (req, res, next) => {
  let db;
  try {
    db = await sequelize.ping();
  } catch (err) {
    return next(err);
  }
  return res.status(200).json(db);
});

router.get('/ping/elastic', async (req, res, next) => {
  let elastic;
  try {
    elastic = await elasticClient.ping();
  } catch (err) {
    return next(err);
  }
  return res.status(200).json(elastic);
});

module.exports = router;
