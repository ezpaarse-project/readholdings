import nodemailer from 'nodemailer';

import { config } from '~/lib/config';
import appLogger from '~/lib/logger/appLogger';

const { smtp, notifications } = config;

const transporter = nodemailer.createTransport(
  {
    ...smtp,
    tls: {
      rejectUnauthorized: false,
    },
  },
);

const mailOptions = {
  from: notifications.sender,
  to: notifications.receivers,
  subject: `[readholdings][${notifications.machine}]: Error`,
  html: `
    <h1>Erreur lors de la mise à jour</h1>
  `,
};

/**
 * Ping SMTP service.
 *
 * @returns ping
 */
export async function pingSMTP(): Promise<boolean> {
  try {
    await transporter.verify();
  } catch (err) {
    appLogger.error(`[smtp]: Cannot ping ${smtp.host}:${smtp.port}`, err);
    return false;
  }
  return true;
}

async function sendMail(text: string, state: unknown) {
  mailOptions.html = `${mailOptions.html}<p>Message: ${text}</p><p>State: ${JSON.stringify(state, null, 2)}</p>`;
  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        reject(err);
      } else {
        resolve(info);
      }
    });
  });
}

export async function sendErrorMail(text: string, state: unknown) {
  try {
    await sendMail(text, state);
  } catch (err) {
    appLogger.error('[mail]: Cannot send error mail', err);
    return;
  }
  appLogger.info('[mail]: error mail was sent');
}
