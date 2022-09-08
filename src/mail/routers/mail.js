const router = require('express').Router();
const boom = require('@hapi/boom');

const checkAuth = require('../middlewares/auth');

const { sendMailStarted, sendMailReport } = require('../bin/update');

// auth
router.post('/update-start', checkAuth, async (req, res, next) => {
  const config = req.body;
  // TODO test config

  try {
    sendMailStarted(config);
  } catch (err) {
    return next(boom.boomify(err));
  }
  return res.status(202).json({});
});

router.post('/update-end', checkAuth, async (req, res, next) => {
  const state = req.body;
  // TODO test state

  try {
    sendMailReport(state);
  } catch (err) {
    return next(boom.boomify(err));
  }
  return res.status(202).json({});
});

module.exports = router;
