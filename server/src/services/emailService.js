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
    throw new Error('SMTP configuration is incomplete. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASSWORD.');
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465 || process.env.SMTP_SECURE === 'true',
    auth: {
      user,
      pass,
    },
  });

  return transporter;
};

const sendMail = async ({ to, subject, text, html, from }) => {
  const mailTransporter = getTransporter();
  const sender = from || process.env.SMTP_FROM || process.env.SMTP_USER;
  if (!sender) {
    throw new Error('SMTP_FROM or SMTP_USER must be configured as the email sender.');
  }

  await mailTransporter.sendMail({
    from: sender,
    to,
    subject,
    text,
    html,
  });
};

const sendClientVerificationEmail = async ({ to, code, fullName, clientType, expiresInMinutes }) => {
  const displayName = fullName || 'there';
  const minutes = expiresInMinutes ?? Number(process.env.VERIFICATION_CODE_TTL_MINUTES || 15);
  const subject = 'Verify your SALAH account';
  const text = [
    `Hi ${displayName},`,
    '',
    'Thanks for registering with SALAH.',
    `Your verification code is: ${code}`,
    '',
    `This code expires in ${minutes} minutes.`,
    '',
    'If you did not request this code, please ignore this email.',
  ].join('\n');

  const html = `
    <p>Hi ${displayName},</p>
    <p>Thanks for registering with SALAH${clientType === 'B2B' ? ' as a business client' : ''}.</p>
    <p style="font-size: 20px; font-weight: bold; letter-spacing: 4px;">${code}</p>
    <p>This code expires in ${minutes} minutes.</p>
    <p>If you did not request this code, you can safely ignore this message.</p>
  `;

  await sendMail({ to, subject, text, html });
};

module.exports = {
  sendMail,
  sendClientVerificationEmail,
};
