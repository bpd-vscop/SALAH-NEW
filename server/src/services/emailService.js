const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const LOGO_FILENAME = 'logo-png.png';
const LOGO_CID = 'logo-ulksupply';
const LOGO_FALLBACK_URL = 'https://i.postimg.cc/nVjjhfsz/qt-q-95.png';
const logoPath = path.resolve(__dirname, '../../../client/public', LOGO_FILENAME);
const hasLogoFile = fs.existsSync(logoPath);
const logoSrc = hasLogoFile ? `cid:${LOGO_CID}` : LOGO_FALLBACK_URL;

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

const sendMail = async ({ to, subject, text, html, from, attachments }) => {
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
    attachments,
  });
};

const sendClientVerificationEmail = async ({ to, code, fullName, clientType, expiresInMinutes }) => {
  const displayName = fullName || 'there';
  const minutes = expiresInMinutes ?? Number(process.env.VERIFICATION_CODE_TTL_MINUTES || 15);
  const subject = 'Verify your ULK Supply account';
  const text = [
    `Hi ${displayName},`,
    '',
    'Thanks for registering with ULK Supply.',
    `Your verification code is: ${code}`,
    '',
    `This code expires in ${minutes} minutes.`,
    '',
    'If you did not request this code, please ignore this email.',
  ].join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your ULK Supply Account</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f3f4f6;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.08); position: relative;">
          <!-- Content -->
          <tr>
            <td style="padding: 40px 40px 40px 40px;">
              <!-- Logo -->
              <div style="text-align: center; margin-bottom: 30px; margin-top: 0;">
                <img src="${logoSrc}" alt="ULK Supply" style="height: 80px; width: auto; display: inline-block;" />
              </div>

              <!-- Content -->
              <h2 style="margin: 0 0 20px; font-size: 28px; font-weight: 700; color: #1a1a1a; text-align: center;">
                Verify Your Email
              </h2>
              <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #4a5568; text-align: center;">
                Hi <strong>${displayName}</strong>,
              </p>
              <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #4a5568; text-align: center;">
                Thanks for registering with <strong>ULK Supply</strong>${clientType === 'B2B' ? ' as a business client' : ''}.
                To complete your registration, please use the verification code below:
              </p>

              <!-- Verification Code Box -->
              <div style="background: #fff5e6; border: 3px dashed #f6b210; border-radius: 16px; padding: 30px; text-align: center; margin: 0 0 30px;">
                <div style="font-size: 40px; font-weight: 600; letter-spacing: 10px; color: #a00b0b; font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;">
                  ${code}
                </div>
              </div>

              <!-- Expiration Notice -->
              <div style="background: rgba(185, 28, 28, 0.08); border: 1px solid rgba(185, 28, 28, 0.2); padding: 15px 20px; border-radius: 8px; margin: 0 0 30px;">
                <p style="margin: 0; font-size: 14px; color: #718096; line-height: 1.5; text-align: center;">
                  <strong style="color: #4a5568;">Important:</strong> This code will expire in <strong style="color: #4a5568;">${minutes} minutes</strong>.
                </p>
              </div>

              <p style="margin: 0 0 30px; font-size: 15px; line-height: 1.6; color: #718096; text-align: center;">
                If you didn't create an account with ULK Supply, you can safely ignore this email.
              </p>

              <!-- Footer -->
              <div style="border-top: 1px solid #e2e8f0; padding-top: 30px; margin-top: 30px;">
                <p style="margin: 0 0 10px; font-size: 14px; color: #a0aec0; text-align: center;">
                  Need help? Contact us at <a href="mailto:support@ulksupply.com" style="color: #f6b210; text-decoration: none; font-weight: 600;">support@ulksupply.com</a>
                </p>
                <p style="margin: 0; font-size: 12px; color: #cbd5e0; text-align: center;">
                  © ${new Date().getFullYear()} ULK Supply LLC. All rights reserved.
                </p>
                <p style="margin: 10px 0 0; font-size: 11px; color: #cbd5e0; text-align: center;">
                  Powered by <a href="https://www.bpd.ma" style="color: #f6b210; text-decoration: none; font-weight: 600;">BP. Digital</a>
                </p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  await sendMail({
    to,
    subject,
    text,
    html,
    attachments: hasLogoFile
      ? [
          {
            filename: LOGO_FILENAME,
            path: logoPath,
            cid: LOGO_CID,
          },
        ]
      : undefined,
  });
};

module.exports = {
  sendMail,
  sendClientVerificationEmail,
};
