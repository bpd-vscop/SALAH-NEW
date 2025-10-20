const nodemailer = require('nodemailer');

let transporter;

const getTransporter = () => {
  if (transporter) {
    return transporter;
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) {
    throw new Error('SMTP configuration is incomplete. Set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASSWORD.');
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  return transporter;
};

const getSenderAddress = () => {
  return process.env.SMTP_FROM || process.env.SMTP_USER || 'bpd.claude@gmail.com';
};

const sendEmail = async ({ to, subject, text, html }) => {
  const mailer = getTransporter();
  const from = getSenderAddress();

  await mailer.sendMail({ from, to, subject, text, html });
};

const sendVerificationEmail = async ({ to, code, expiresAt }) => {
  const subject = 'Verify your account';
  const expiry = expiresAt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const text = `Your verification code is ${code}. It expires at ${expiry}.`;
  const html = `
    <p>Hello,</p>
    <p>Your verification code is <strong>${code}</strong>.</p>
    <p>The code will expire at <strong>${expiry}</strong>. Enter this code in the verification screen to activate your account.</p>
    <p>If you did not request this code, you can safely ignore this email.</p>
  `;

  await sendEmail({ to, subject, text, html });
};

module.exports = {
  sendVerificationEmail,
};
