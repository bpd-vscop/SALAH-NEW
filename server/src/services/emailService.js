const nodemailer = require('nodemailer');
const { getEmailConfig } = require('../config/email');

let transporter;

const getTransporter = () => {
  if (transporter) {
    return transporter;
  }
  const config = getEmailConfig();
  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth.user && config.auth.pass ? config.auth : undefined,
  });
  return transporter;
};

const sendEmail = async ({ to, subject, text, html }) => {
  const config = getEmailConfig();
  const mailer = getTransporter();
  await mailer.sendMail({
    from: config.sender,
    to,
    subject,
    text,
    html,
  });
};

const sendVerificationEmail = async ({ to, code }) => {
  const subject = 'Verify your ULKS account';
  const plainText = `Your verification code is ${code}. It will expire in 15 minutes.`;
  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.5;">
      <h2 style="color: #a00b0b;">ULKS Email Verification</h2>
      <p>Use the verification code below to confirm your email address. This code expires in 15 minutes.</p>
      <p style="font-size: 24px; letter-spacing: 6px; font-weight: bold;">${code}</p>
      <p>If you did not request this email, you can ignore it.</p>
    </div>
  `;

  await sendEmail({ to, subject, text: plainText, html });
};

module.exports = {
  sendVerificationEmail,
};

