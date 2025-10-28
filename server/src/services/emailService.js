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

const sendPasswordResetEmail = async ({ email, fullName, resetUrl, code, expiresInMinutes }) => {
  const displayName = fullName || 'there';
  const minutes = expiresInMinutes ?? 30;
  const subject = 'Reset your ULK Supply password';
  const text = [
    `Hi ${displayName},`,
    '',
    'We received a request to reset your password for your ULK Supply account.',
    '',
    `Click this link to reset your password: ${resetUrl}`,
    '',
    `Or use this 6-digit code: ${code}`,
    '',
    `This link and code expire in ${minutes} minutes.`,
    '',
    'If you did not request a password reset, please ignore this email and your password will remain unchanged.',
  ].join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password - ULK Supply</title>
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
                Reset Your Password
              </h2>
              <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #4a5568; text-align: center;">
                Hi <strong>${displayName}</strong>,
              </p>
              <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #4a5568; text-align: center;">
                We received a request to reset your password for your <strong>ULK Supply</strong> account.
                Click the button below to choose a new password:
              </p>

              <!-- Reset Button -->
              <div style="text-align: center; margin: 0 0 30px;">
                <a href="${resetUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #f6b210 0%, #a00b0b 100%); color: #ffffff; text-decoration: none; border-radius: 50px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(160, 11, 11, 0.3);">
                  Reset Password
                </a>
              </div>

              <!-- Divider -->
              <div style="text-align: center; margin: 30px 0; position: relative;">
                <div style="border-top: 1px solid #e2e8f0; position: absolute; width: 100%; top: 50%; left: 0;"></div>
                <span style="background: #ffffff; padding: 0 15px; position: relative; font-size: 14px; color: #a0aec0; font-weight: 500;">OR USE THIS CODE</span>
              </div>

              <!-- Verification Code Box -->
              <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #4a5568; text-align: center;">
                If the button doesn't work, enter this 6-digit code on the password reset page:
              </p>
              <div style="background: #fff5e6; border: 3px dashed #f6b210; border-radius: 16px; padding: 30px; text-align: center; margin: 0 0 30px;">
                <div style="font-size: 40px; font-weight: 600; letter-spacing: 10px; color: #a00b0b; font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;">
                  ${code}
                </div>
              </div>

              <!-- Expiration Notice -->
              <div style="background: rgba(185, 28, 28, 0.08); border: 1px solid rgba(185, 28, 28, 0.2); padding: 15px 20px; border-radius: 8px; margin: 0 0 30px;">
                <p style="margin: 0; font-size: 14px; color: #718096; line-height: 1.5; text-align: center;">
                  <strong style="color: #4a5568;">Important:</strong> This link and code will expire in <strong style="color: #4a5568;">${minutes} minutes</strong>.
                </p>
              </div>

              <p style="margin: 0 0 30px; font-size: 15px; line-height: 1.6; color: #718096; text-align: center;">
                If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
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
    to: email,
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

const sendPasswordChangeEmail = async ({ email, fullName, code, expiresInMinutes }) => {
  const displayName = fullName || 'there';
  const minutes = expiresInMinutes ?? 15;
  const subject = 'Verify your password change - ULK Supply';
  const text = [
    `Hi ${displayName},`,
    '',
    'We received a request to change your password for your ULK Supply account.',
    `Your verification code is: ${code}`,
    '',
    `This code expires in ${minutes} minutes.`,
    '',
    'If you did not request this password change, please contact us immediately.',
  ].join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Password Change - ULK Supply</title>
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
                Verify Password Change
              </h2>
              <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #4a5568; text-align: center;">
                Hi <strong>${displayName}</strong>,
              </p>
              <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #4a5568; text-align: center;">
                We received a request to change your password for your <strong>ULK Supply</strong> account.
                To verify this is you, please use the code below:
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

              <!-- Security Warning -->
              <div style="background: rgba(239, 68, 68, 0.1); border-left: 4px solid #ef4444; padding: 15px 20px; margin: 0 0 30px;">
                <p style="margin: 0; font-size: 14px; color: #dc2626; line-height: 1.6; font-weight: 600;">
                  ⚠️ Security Alert
                </p>
                <p style="margin: 8px 0 0; font-size: 14px; color: #991b1b; line-height: 1.6;">
                  If you didn't request this password change, please contact us immediately at <a href="mailto:support@ulksupply.com" style="color: #dc2626; text-decoration: underline;">support@ulksupply.com</a>
                </p>
              </div>

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
    to: email,
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

const sendPasswordChangedConfirmation = async ({ email, fullName }) => {
  const displayName = fullName || 'there';
  const subject = 'Your password has been changed - ULK Supply';
  const text = [
    `Hi ${displayName},`,
    '',
    'This email confirms that your password for your ULK Supply account has been successfully changed.',
    '',
    'If you did not make this change, please contact us immediately at support@ulksupply.com',
    '',
    'For your security:',
    '- Never share your password with anyone',
    '- Use a unique password for your ULK Supply account',
    '- Enable two-factor authentication if available',
    '',
    'Thank you for keeping your account secure.',
  ].join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Changed Successfully - ULK Supply</title>
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
              <h2 style="margin: 0 0 20px; font-size: 28px; font-weight: 700; color: #ffffff; background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 16px 24px; border-radius: 12px; text-align: center;">
                Password Changed Successfully
              </h2>
              <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #4a5568; text-align: center;">
                Hi <strong>${displayName}</strong>,
              </p>
              <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #4a5568; text-align: center;">
                This email confirms that your password for your <strong>ULK Supply</strong> account has been successfully changed.
              </p>

              <!-- Security Information -->
              <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 20px; margin: 0 0 20px;">
                <p style="margin: 0 0 15px; font-size: 15px; color: #166534; font-weight: 600;">
                  🔒 Your Account is Secure
                </p>
                <ul style="margin: 0; padding-left: 20px; color: #15803d; font-size: 14px; line-height: 1.8;">
                  <li>Your password has been encrypted and stored securely</li>
                  <li>We use industry-standard security measures to protect your account</li>
                  <li>Your data is protected with SSL/TLS encryption</li>
                  <li>We never share your personal information with third parties</li>
                </ul>
              </div>

              <!-- Security Warning -->
              <div style="background: rgba(239, 68, 68, 0.1); border-left: 4px solid #ef4444; padding: 15px 20px; margin: 0 0 30px;">
                <p style="margin: 0; font-size: 14px; color: #dc2626; line-height: 1.6; font-weight: 600;">
                  ⚠️ Didn't make this change?
                </p>
                <p style="margin: 8px 0 0; font-size: 14px; color: #991b1b; line-height: 1.6;">
                  If you did not change your password, please contact us immediately at <a href="mailto:support@ulksupply.com" style="color: #dc2626; text-decoration: underline;">support@ulksupply.com</a>
                </p>
              </div>

              <p style="margin: 0 0 30px; font-size: 15px; line-height: 1.6; color: #718096; text-align: center;">
                Thank you for keeping your account secure!
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
    to: email,
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
  sendPasswordResetEmail,
  sendPasswordChangeEmail,
  sendPasswordChangedConfirmation,
};
