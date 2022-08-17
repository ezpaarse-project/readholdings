const { format } = require('date-fns');

const { notifications } = require('config');

const logger = require('../lib/logger');

const { sendMail, generateMail } = require('../lib/mail');

const sendMailStarted = async (config) => {
  try {
    await sendMail({
      from: notifications.sender,
      to: notifications.receivers,
      subject: `ReadHoldings ${notifications.machine} - Mise à jour des données`,
      ...generateMail('started', {
        config,
        date: format(new Date(), 'dd-MM-yyyy'),
      }),
    });
  } catch (err) {
    logger.error(`Cannot send mail ${err}`);
    logger.error(err);
    return;
  }
  logger.info('send update start email');
};

const sendMailReport = async (state) => {
  let status = state.error;
  if (status) {
    status = 'error';
  } else {
    status = 'success';
  }

  try {
    await sendMail({
      from: notifications.sender,
      to: notifications.receivers,
      subject: `ReadHoldings ${notifications.machine} - Rapport de mise à jour - ${status}`,
      ...generateMail('report', {
        state,
        status,
        date: format(new Date(), 'dd-MM-yyyy'),
      }),
    });
  } catch (err) {
    logger.error(`Cannot send mail ${err}`);
    logger.error(err);
    return;
  }
  logger.info('send update end email');
};

module.exports = {
  sendMailStarted,
  sendMailReport,
};
