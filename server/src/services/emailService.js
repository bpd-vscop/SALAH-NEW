const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const LOGO_FILENAME = 'logo-png.png';
const LOGO_CID = 'logo-ulksupply';
const LOGO_FALLBACK_URL = 'https://i.postimg.cc/nVjjhfsz/qt-q-95.png';
const SUPPORT_EMAIL = 'support@ulksupply.com';
const SUPPORT_PHONES = ['+1-407-449-6740', '+1-407-452-7149', '+1-407-978-6077'];
const WHATSAPP_PHONE = '+1-407-452-7149';
const logoPath = path.resolve(__dirname, '../../../client/public', LOGO_FILENAME);
const hasLogoFile = fs.existsSync(logoPath);
const logoSrc = hasLogoFile ? `cid:${LOGO_CID}` : LOGO_FALLBACK_URL;

let transporter;

const parseAdminRecipients = () => {
  const raw =
    process.env.ADMIN_NOTIFICATION_EMAILS ||
    process.env.ADMIN_ORDER_ALERTS ||
    process.env.ADMIN_EMAILS ||
    '';
  const list = raw
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean);
  if (list.length > 0) {
    return list;
  }

  const fallback = process.env.SMTP_FROM || process.env.SMTP_USER;
  return fallback ? [fallback] : [];
};

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

const sendMail = async ({ to, subject, text, html, from, replyTo, attachments }) => {
  const mailTransporter = getTransporter();
  const sender = from || process.env.SMTP_FROM || process.env.SMTP_USER;
  if (!sender) {
    throw new Error('SMTP_FROM or SMTP_USER must be configured as the email sender.');
  }

  await mailTransporter.sendMail({
    from: sender,
    to,
    replyTo,
    subject,
    text,
    html,
    attachments,
  });
};

const WEB_CONFIG_PATH = path.resolve(__dirname, '../../../client/public/web.config');

const extractDomainFromHostPattern = (pattern) => {
  if (!pattern) return null;
  const trimmed = pattern.trim();
  const match =
    trimmed.match(/([a-z0-9-]+(?:\\\.[a-z0-9-]+)+)/i) ||
    trimmed.match(/([a-z0-9-]+(?:\.[a-z0-9-]+)+)/i);
  if (!match) return null;
  const domain = match[1].replace(/\\\./g, '.').replace(/\.$/, '');
  const normalized = domain.replace(/^www\./i, '');
  return normalized || null;
};

const getWebConfigBaseUrl = () => {
  try {
    const raw = fs.readFileSync(WEB_CONFIG_PATH, 'utf8');
    const match = raw.match(/<add[^>]*input="\{HTTP_HOST\}"[^>]*pattern="([^"]+)"/i);
    if (!match) return null;
    const domain = extractDomainFromHostPattern(match[1]);
    if (!domain) return null;
    if (/^https?:\/\//i.test(domain)) {
      return domain.replace(/\/$/, '');
    }
    return `https://${domain}`;
  } catch {
    return null;
  }
};

const buildProductUrl = (productId) => {
  if (!productId) return null;
  const baseUrl = getWebConfigBaseUrl();
  if (!baseUrl) return null;
  return `${baseUrl}/products/${productId}`;
};

const buildContactRows = (baseUrl) => {
  const rows = [
    {
      label: 'Email',
      value: `<a href="mailto:${SUPPORT_EMAIL}" style="color: #f6b210; font-weight: 700; text-decoration: none;">${SUPPORT_EMAIL}</a>`,
    },
    {
      label: 'Phone',
      value: SUPPORT_PHONES.join(' / '),
    },
  ];

  const whatsappDigits = WHATSAPP_PHONE.replace(/[^+\d]/g, '');
  rows.push({
    label: 'WhatsApp',
    value: `<a href="https://wa.me/${whatsappDigits}" style="color: #f6b210; font-weight: 700; text-decoration: none;">${WHATSAPP_PHONE}</a>`,
  });

  if (baseUrl) {
    const display = baseUrl.replace(/^https?:\/\//i, '');
    rows.push({
      label: 'Website',
      value: `<a href="${baseUrl}/login" style="color: #f6b210; font-weight: 700; text-decoration: none;">${display}/login</a>`,
    });
  }

  return rows;
};

const buildContactText = (baseUrl) => {
  const lines = [
    `Email: ${SUPPORT_EMAIL}`,
    `Phone: ${SUPPORT_PHONES.join(' / ')}`,
    `WhatsApp: ${WHATSAPP_PHONE}`,
  ];
  if (baseUrl) {
    const display = baseUrl.replace(/^https?:\/\//i, '');
    lines.push(`Website: ${display}/login`);
  }
  return lines;
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

const formatCurrency = (value) => {
  const amount = Number(value ?? 0);
  return `$${amount.toFixed(2)}`;
};

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const datePart = new Intl.DateTimeFormat('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: '2-digit',
  }).format(date);
  const timePart = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
  return `${datePart} - ${timePart}`;
};

const formatPaymentMethodLabel = (method, details) => {
  if (method === 'paypal') return 'PayPal';
  if (method === 'stripe') {
    const last4 = details?.last4;
    return last4 ? `Card **** ${last4}` : 'Card';
  }
  if (method === 'affirm') return 'Affirm';
  if (method === 'none') return 'Not specified';
  return method ? String(method) : 'Not specified';
};

const formatShippingMethodLabel = (method) => {
  if (!method) return '-';
  const text = String(method);
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const formatShortId = (value, fallbackLength) => {
  if (!value) return '';
  const text = String(value);
  const length = Number.isFinite(fallbackLength) ? fallbackLength : 6;
  return text.length > length ? text.slice(-length) : text;
};

const buildMailtoLink = (email) => {
  const trimmed = String(email || '').trim();
  if (!trimmed) return null;
  const encoded = encodeURIComponent(trimmed);
  return `<a href="mailto:${encoded}" style="color: #f6b210; font-weight: 700; text-decoration: none;">${escapeHtml(trimmed)}</a>`;
};

const buildTelLink = (phone) => {
  const trimmed = String(phone || '').trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/[^+\d]/g, '');
  const href = digits ? `tel:${digits}` : `tel:${encodeURIComponent(trimmed)}`;
  return `<a href="${href}" style="color: #f6b210; font-weight: 700; text-decoration: none;">${escapeHtml(trimmed)}</a>`;
};

const buildKeyValueRowsHtml = (rows, { valueAlign = 'left' } = {}) =>
  rows
    .map(({ label, value, valueHtml }) => {
      const renderedValue = valueHtml ?? escapeHtml(value ?? '-');
      return `<tr>
          <td style="padding: 6px 0; font-size: 13px; color: #64748b; width: 150px; vertical-align: top;"><strong>${escapeHtml(
            label
          )}</strong></td>
          <td style="padding: 6px 0; font-size: 13px; color: #0f172a; text-align: ${valueAlign};">${renderedValue}</td>
        </tr>`;
    })
    .join('');

const buildSectionCardHtml = ({ title, bodyHtml }) => `
  <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px 18px; margin: 0 0 14px;">
    <div style="font-size: 12px; font-weight: 800; color: #64748b; letter-spacing: 0.08em; text-transform: uppercase; margin: 0 0 10px; text-align: left;">
      ${escapeHtml(title)}
    </div>
    ${bodyHtml}
  </div>
`;

const buildOrderItemsTableHtml = (items) => {
  const safeItems = Array.isArray(items) ? items : [];
  if (!safeItems.length) {
    return `<div style="padding: 12px; font-size: 13px; color: #94a3b8; text-align: center;">No items in this order.</div>`;
  }

  const rows = safeItems
    .map((item) => {
      const name = escapeHtml(item?.name ?? '');
      const productId = item?.productId ? String(item.productId) : '';
      const shortProductId = productId ? formatShortId(productId, 12) : '';
      const quantity = Number(item?.quantity ?? 0);
      const price = Number(item?.price ?? 0);
      const lineTotal = price * quantity;

      const productMeta = shortProductId
        ? `<div style="font-size: 11px; color: #94a3b8; font-family: 'Courier New', Courier, monospace;">${escapeHtml(
            shortProductId
          )}</div>`
        : '';

      return `<tr>
        <td style="padding: 12px 8px; border-bottom: 1px solid #e2e8f0;">
          <div style="font-size: 14px; font-weight: 600; color: #0f172a;">${name || '-'}</div>
          ${productMeta}
        </td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 13px; color: #475569;">${quantity}</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 13px; color: #475569;">${formatCurrency(
          price
        )}</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 13px; font-weight: 700; color: #0f172a;">${formatCurrency(
          lineTotal
        )}</td>
      </tr>`;
    })
    .join('');

  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse: collapse;">
    <thead>
      <tr style="background: #f8fafc;">
        <th style="padding: 10px 8px; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; text-align: left; color: #64748b;">Product</th>
        <th style="padding: 10px 8px; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; text-align: center; color: #64748b;">Qty</th>
        <th style="padding: 10px 8px; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; text-align: right; color: #64748b;">Price</th>
        <th style="padding: 10px 8px; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; text-align: right; color: #64748b;">Total</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
};

const buildAddressLines = (address) => {
  if (!address) return [];
  const lines = [];
  if (address.fullName) lines.push(address.fullName);
  if (address.addressLine1) lines.push(address.addressLine1);
  if (address.addressLine2) lines.push(address.addressLine2);
  const cityLine = [address.city, address.state, address.postalCode].filter(Boolean).join(', ');
  if (cityLine) lines.push(cityLine);
  if (address.country) lines.push(address.country);
  if (address.phone) lines.push(address.phone);
  return lines;
};

const formatAddressHtml = (address) => {
  const lines = buildAddressLines(address);
  if (!lines.length) return '-';
  return lines.map((line) => escapeHtml(line)).join('<br />');
};

const formatAddressText = (address) => {
  const lines = buildAddressLines(address);
  if (!lines.length) return '-';
  return lines.join('\n');
};

const buildOrderEmailHtml = ({
  title,
  subtitle,
  metaRows,
  items,
  summaryRows,
  customerRows,
  shippingRows,
  note,
}) => {
  const metaTable = buildKeyValueRowsHtml(metaRows || []);
  const summaryTable = buildKeyValueRowsHtml(summaryRows || [], { valueAlign: 'right' });
  const customerTable = customerRows?.length ? buildKeyValueRowsHtml(customerRows) : '';
  const shippingTable = shippingRows?.length ? buildKeyValueRowsHtml(shippingRows) : '';

  const noteHtml = note
    ? `<div style="margin-top: 14px; font-size: 13px; color: #64748b; text-align: center;">${escapeHtml(
        note
      )}</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f3f4f6;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.08); overflow: hidden;">
          <tr>
            <td style="padding: 36px 40px 30px 40px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <img src="${logoSrc}" alt="ULK Supply" style="height: 80px; width: auto; display: inline-block;" />
              </div>

              <h2 style="margin: 0 0 8px; font-size: 26px; font-weight: 800; color: #0f172a; text-align: center;">
                ${escapeHtml(title)}
              </h2>
              <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #475569; text-align: center;">
                ${escapeHtml(subtitle || '')}
              </p>

              ${buildSectionCardHtml({
                title: 'Order details',
                bodyHtml: `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">${metaTable}</table>`,
              })}

              ${buildSectionCardHtml({
                title: 'Items',
                bodyHtml: buildOrderItemsTableHtml(items),
              })}

              ${buildSectionCardHtml({
                title: 'Totals',
                bodyHtml: `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">${summaryTable}</table>`,
              })}

              ${
                customerTable
                  ? buildSectionCardHtml({
                      title: 'Customer',
                      bodyHtml: `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">${customerTable}</table>`,
                    })
                  : ''
              }

              ${
                shippingTable
                  ? buildSectionCardHtml({
                      title: 'Shipping',
                      bodyHtml: `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">${shippingTable}</table>`,
                    })
                  : ''
              }

              ${noteHtml}

              <div style="border-top: 1px solid #e2e8f0; padding-top: 24px; margin-top: 26px;">
                <p style="margin: 0 0 10px; font-size: 14px; color: #94a3b8; text-align: center;">
                  Need help? Contact us at <a href="mailto:support@ulksupply.com" style="color: #f6b210; text-decoration: none; font-weight: 700;">support@ulksupply.com</a>
                </p>
                <p style="margin: 0; font-size: 12px; color: #cbd5e1; text-align: center;">
                  ${new Date().getFullYear()} ULK Supply LLC. All rights reserved.
                </p>
                <p style="margin: 10px 0 0; font-size: 11px; color: #cbd5e1; text-align: center;">
                  Powered by <a href="https://www.bpd.ma" style="color: #f6b210; text-decoration: none; font-weight: 700;">BP. Digital</a>
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
};

const sendOrderConfirmationEmail = async ({
  to,
  fullName,
  customer,
  orderId,
  status,
  items,
  subtotal,
  discountAmount,
  couponCode,
  taxRate,
  taxAmount,
  shippingCost,
  shippingMethod,
  shippingRateInfo,
  shippingAddress,
  paymentMethod,
  paymentDetails,
  total,
  createdAt,
}) => {
  if (!to) return;
  const shortId = formatShortId(orderId, 6);
  const subject = `We received your order #${shortId || orderId}`;
  const displayName = fullName || 'there';
  const statusLabel = status || 'processing';

  const itemLines = (Array.isArray(items) ? items : [])
    .map((item) => {
      const name = item?.name || 'Item';
      const quantity = Number(item?.quantity ?? 0);
      const price = Number(item?.price ?? 0);
      const lineTotal = price * quantity;
      return `- ${name} x${quantity} @ ${formatCurrency(price)} = ${formatCurrency(lineTotal)}`;
    })
    .join('\n');

  const orderLines = [
    `Order ID: ${orderId || '-'}`,
    `Created: ${formatDateTime(createdAt)}`,
    `Payment: ${formatPaymentMethodLabel(paymentMethod, paymentDetails)}`,
  ];

  const summaryLines = [
    `Subtotal: ${formatCurrency(subtotal ?? 0)}`,
    ...(discountAmount > 0 ? [`Discount${couponCode ? ` (${couponCode})` : ''}: -${formatCurrency(discountAmount)}`] : []),
    ...(taxAmount > 0 ? [`Tax${taxRate ? ` (${taxRate}%)` : ''}: ${formatCurrency(taxAmount)}`] : []),
    `Shipping: ${formatCurrency(shippingCost ?? 0)}`,
    `Total: ${formatCurrency(total ?? 0)}`,
  ];

  const shippingLines = shippingAddress ? formatAddressText(shippingAddress) : '-';

  const text = [
    `Hi ${displayName},`,
    '',
    `Thanks for your purchase! Your order ${shortId ? `#${shortId}` : `#${orderId}`} is now ${statusLabel}.`,
    '',
    'Order details:',
    ...orderLines,
    '',
    'Items:',
    itemLines || '- (no line items found)',
    '',
    'Totals:',
    ...summaryLines,
    '',
    'Shipping address:',
    shippingLines,
    `Shipping method: ${formatShippingMethodLabel(shippingMethod)}`,
    ...(shippingRateInfo?.estimatedDelivery
      ? [`Estimated delivery: ${formatDateTime(shippingRateInfo.estimatedDelivery)}`]
      : []),
    '',
    'We will notify you when it ships.',
  ].join('\n');

  const metaRows = [
    { label: 'Order ID', value: orderId || '-' },
    { label: 'Created', value: formatDateTime(createdAt) },
    { label: 'Payment', value: formatPaymentMethodLabel(paymentMethod, paymentDetails) },
  ];

  const summaryRows = [
    { label: 'Subtotal', value: formatCurrency(subtotal ?? 0) },
    ...(discountAmount > 0
      ? [
          {
            label: `Discount${couponCode ? ` (${couponCode})` : ''}`,
            valueHtml: `<span style="color: #16a34a; font-weight: 700;">-${formatCurrency(discountAmount)}</span>`,
          },
        ]
      : []),
    ...(taxAmount > 0
      ? [
          {
            label: `Tax${taxRate ? ` (${taxRate}%)` : ''}`,
            value: formatCurrency(taxAmount),
          },
        ]
      : []),
    { label: 'Shipping', value: formatCurrency(shippingCost ?? 0) },
    { label: 'Total', valueHtml: `<span style="font-size: 16px; font-weight: 800; color: #0f172a;">${formatCurrency(total ?? 0)}</span>` },
  ];

  const shippingRows = [];
  if (shippingAddress) {
    shippingRows.push({ label: 'Ship to', valueHtml: formatAddressHtml(shippingAddress) });
  }
  if (shippingMethod || shippingAddress) {
    shippingRows.push({ label: 'Shipping method', value: formatShippingMethodLabel(shippingMethod) });
  }
  if (shippingRateInfo?.estimatedDelivery) {
    shippingRows.push({ label: 'Estimated delivery', value: formatDateTime(shippingRateInfo.estimatedDelivery) });
  }

  const customerRows = customer
    ? [
        { label: 'Name', value: customer.name || '-' },
        { label: 'Email', valueHtml: buildMailtoLink(customer.email) || escapeHtml(customer.email || '-') },
        ...(customer.phoneNumber
          ? [
              {
                label: 'Phone',
                valueHtml: buildTelLink(
                  `${customer.phoneCode || ''}${customer.phoneCode ? ' ' : ''}${customer.phoneNumber}`
                ) || escapeHtml(customer.phoneNumber),
              },
            ]
          : []),
        ...(customer.clientType ? [{ label: 'Type', value: customer.clientType }] : []),
        ...(customer.company?.name ? [{ label: 'Company', value: customer.company.name }] : []),
        ...(customer.company?.website ? [{ label: 'Company website', value: customer.company.website }] : []),
      ]
    : [];

  const html = buildOrderEmailHtml({
    title: `We received your order ${shortId ? `#${shortId}` : orderId ? `#${orderId}` : ''}`.trim(),
    subtitle: `Thanks for your purchase! Your order is now ${statusLabel}.`,
    metaRows,
    items,
    summaryRows,
    customerRows,
    shippingRows,
    note: 'We will notify you when it ships.',
  });

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

const sendAdminNewOrderEmail = async ({
  client,
  orderId,
  items,
  subtotal,
  discountAmount,
  couponCode,
  taxRate,
  taxAmount,
  shippingCost,
  shippingMethod,
  shippingRateInfo,
  shippingAddress,
  paymentMethod,
  paymentDetails,
  total,
  createdAt,
}) => {
  const recipients = parseAdminRecipients();
  if (recipients.length === 0) return;

  const clientEmail = client?.email || null;
  const clientId = client?.id || null;
  const shortId = formatShortId(orderId, 6);
  const subject = `New order #${shortId || orderId} from ${clientEmail || clientId || 'client'}`;
  const clientName = client?.name || 'N/A';
  const phone = client?.phoneNumber
    ? `${client?.phoneCode || ''}${client?.phoneCode ? ' ' : ''}${client?.phoneNumber}`
    : null;

  const itemLines = (Array.isArray(items) ? items : [])
    .map((item) => {
      const name = item?.name || 'Item';
      const quantity = Number(item?.quantity ?? 0);
      const price = Number(item?.price ?? 0);
      const lineTotal = price * quantity;
      return `- ${name} x${quantity} @ ${formatCurrency(price)} = ${formatCurrency(lineTotal)}`;
    })
    .join('\n');

  const orderLines = [
    `Order ID: ${orderId || '-'}`,
    `Created: ${formatDateTime(createdAt)}`,
    `Payment: ${formatPaymentMethodLabel(paymentMethod, paymentDetails)}`,
  ];

  const summaryLines = [
    `Subtotal: ${formatCurrency(subtotal ?? 0)}`,
    ...(discountAmount > 0 ? [`Discount${couponCode ? ` (${couponCode})` : ''}: -${formatCurrency(discountAmount)}`] : []),
    ...(taxAmount > 0 ? [`Tax${taxRate ? ` (${taxRate}%)` : ''}: ${formatCurrency(taxAmount)}`] : []),
    `Shipping: ${formatCurrency(shippingCost ?? 0)}`,
    `Total: ${formatCurrency(total ?? 0)}`,
  ];

  const shippingLines = shippingAddress ? formatAddressText(shippingAddress) : '-';

  const text = [
    `New order received: ${shortId ? `#${shortId}` : `#${orderId}`}`,
    `Client: ${clientName}`,
    `Client email: ${clientEmail || 'N/A'}`,
    `Client ID: ${clientId || 'N/A'}`,
    ...(phone ? [`Client phone: ${phone}`] : []),
    ...(client?.clientType ? [`Client type: ${client.clientType}`] : []),
    ...(typeof client?.isEmailVerified === 'boolean'
      ? [`Email verified: ${client.isEmailVerified ? 'Yes' : 'No'}`]
      : []),
    '',
    'Order details:',
    ...orderLines,
    '',
    'Items:',
    itemLines || '- (no line items found)',
    '',
    'Totals:',
    ...summaryLines,
    '',
    'Shipping address:',
    shippingLines,
    `Shipping method: ${formatShippingMethodLabel(shippingMethod)}`,
    ...(shippingRateInfo?.estimatedDelivery
      ? [`Estimated delivery: ${formatDateTime(shippingRateInfo.estimatedDelivery)}`]
      : []),
  ].join('\n');

  const metaRows = [
    { label: 'Order ID', value: orderId || '-' },
    { label: 'Created', value: formatDateTime(createdAt) },
    { label: 'Payment', value: formatPaymentMethodLabel(paymentMethod, paymentDetails) },
  ];

  const summaryRows = [
    { label: 'Subtotal', value: formatCurrency(subtotal ?? 0) },
    ...(discountAmount > 0
      ? [
          {
            label: `Discount${couponCode ? ` (${couponCode})` : ''}`,
            valueHtml: `<span style="color: #16a34a; font-weight: 700;">-${formatCurrency(discountAmount)}</span>`,
          },
        ]
      : []),
    ...(taxAmount > 0
      ? [
          {
            label: `Tax${taxRate ? ` (${taxRate}%)` : ''}`,
            value: formatCurrency(taxAmount),
          },
        ]
      : []),
    { label: 'Shipping', value: formatCurrency(shippingCost ?? 0) },
    { label: 'Total', valueHtml: `<span style="font-size: 16px; font-weight: 800; color: #0f172a;">${formatCurrency(total ?? 0)}</span>` },
  ];

  const customerRows = [
    { label: 'Name', value: clientName },
    { label: 'Email', valueHtml: buildMailtoLink(clientEmail) || escapeHtml(clientEmail || '-') },
    { label: 'Client ID', value: clientId || '-' },
    ...(phone ? [{ label: 'Phone', valueHtml: buildTelLink(phone) || escapeHtml(phone) }] : []),
    ...(client?.clientType ? [{ label: 'Type', value: client.clientType }] : []),
    ...(typeof client?.isEmailVerified === 'boolean'
      ? [{ label: 'Email verified', value: client.isEmailVerified ? 'Yes' : 'No' }]
      : []),
    ...(client?.company?.name ? [{ label: 'Company', value: client.company.name }] : []),
    ...(client?.company?.website ? [{ label: 'Company website', value: client.company.website }] : []),
  ];

  const shippingRows = [];
  if (shippingAddress) {
    shippingRows.push({ label: 'Ship to', valueHtml: formatAddressHtml(shippingAddress) });
  }
  if (shippingMethod || shippingAddress) {
    shippingRows.push({ label: 'Shipping method', value: formatShippingMethodLabel(shippingMethod) });
  }
  if (shippingRateInfo?.estimatedDelivery) {
    shippingRows.push({ label: 'Estimated delivery', value: formatDateTime(shippingRateInfo.estimatedDelivery) });
  }

  const subtitleName = clientName && clientName !== 'N/A' ? clientName : clientEmail || 'a customer';
  const html = buildOrderEmailHtml({
    title: 'New order received',
    subtitle: `A new order was placed by ${subtitleName}.`,
    metaRows,
    items,
    summaryRows,
    customerRows,
    shippingRows,
  });

  await sendMail({
    to: recipients,
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

const buildSupportMessageHtml = ({ title, subtitle, metaRows, message, ctaLabel, ctaUrl }) => {
  const metaHtml = (metaRows || [])
    .map(
      ({ label, value }) =>
        `<tr>
          <td style="padding: 6px 0; font-size: 13px; color: #64748b; width: 130px; vertical-align: top;"><strong>${label}</strong></td>
          <td style="padding: 6px 0; font-size: 13px; color: #0f172a;">${value || '-'}</td>
        </tr>`
    )
    .join('');

  const ctaHtml = ctaUrl
    ? `<div style="text-align: center; margin-top: 24px;">
        <a href="${ctaUrl}" style="display: inline-block; background: #a00b0b; color: #ffffff; text-decoration: none; font-weight: 700; padding: 12px 18px; border-radius: 12px;">
          ${ctaLabel || 'Open dashboard'}
        </a>
      </div>`
    : '';

  const safeMessage = String(message || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f3f4f6;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.08); overflow: hidden;">
          <tr>
            <td style="padding: 36px 40px 30px 40px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <img src="${logoSrc}" alt="ULK Supply" style="height: 80px; width: auto; display: inline-block;" />
              </div>

              <h2 style="margin: 0 0 10px; font-size: 26px; font-weight: 800; color: #0f172a; text-align: center;">
                ${title}
              </h2>
              <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #475569; text-align: center;">
                ${subtitle || ''}
              </p>

              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px 18px; margin: 0 0 18px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  ${metaHtml}
                </table>
              </div>

               <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px 18px; margin: 0 0 14px;">
                 <div style="font-size: 12px; font-weight: 800; color: #64748b; letter-spacing: 0.08em; text-transform: uppercase; margin: 0 0 10px; text-align: left;">
                   Message
                 </div>
                <div style="font-size: 15px; color: #0f172a; line-height: 1.7; white-space: pre-wrap; text-align: left;">${safeMessage}</div>
               </div>

               ${ctaHtml}

              <div style="border-top: 1px solid #e2e8f0; padding-top: 24px; margin-top: 26px;">
                <p style="margin: 0 0 10px; font-size: 14px; color: #94a3b8; text-align: center;">
                  Need help? Contact us at <a href="mailto:support@ulksupply.com" style="color: #f6b210; text-decoration: none; font-weight: 700;">support@ulksupply.com</a>
                </p>
                <p style="margin: 0; font-size: 12px; color: #cbd5e1; text-align: center;">
                  ${new Date().getFullYear()} ULK Supply LLC. All rights reserved.
                </p>
                <p style="margin: 10px 0 0; font-size: 11px; color: #cbd5e1; text-align: center;">
                  Powered by <a href="https://www.bpd.ma" style="color: #f6b210; text-decoration: none; font-weight: 700;">BP. Digital</a>
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
};

const sendRestockSubscriptionEmail = async ({ to, fullName, productName, productId }) => {
  if (!to) return;
  const displayName = fullName || 'there';
  const productLabel = productName || 'this product';
  const baseUrl = getWebConfigBaseUrl();
  const contactRows = buildContactRows(baseUrl);
  const productUrl = buildProductUrl(productId);

  const messageLines = [
    `Hi ${displayName},`,
    '',
    `You are on the notify list for ${productLabel}.`,
    'We will email you as soon as it is back in stock.',
    'You will also receive another email when it is ready to order.',
  ];

  const text = [...messageLines, '', ...buildContactText(baseUrl)].join('\n');
  const html = buildSupportMessageHtml({
    title: 'Restock notification confirmed',
    subtitle: `We will notify you when ${productLabel} is ready to order.`,
    metaRows: [{ label: 'Product', value: productLabel }, ...contactRows],
    message: messageLines.join('\n'),
    ctaLabel: productUrl ? 'View product' : undefined,
    ctaUrl: productUrl || undefined,
  });

  await sendMail({
    to,
    subject: `You will be notified about ${productLabel}`,
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

const sendRestockAvailableEmail = async ({ to, fullName, productName, productId }) => {
  if (!to) return;
  const displayName = fullName || 'there';
  const productLabel = productName || 'this product';
  const baseUrl = getWebConfigBaseUrl();
  const contactRows = buildContactRows(baseUrl);
  const productUrl = buildProductUrl(productId);

  const messageLines = [
    `Hi ${displayName},`,
    '',
    `Good news! ${productLabel} is ready to order.`,
    'Stock is now available, so you can place your order.',
  ];

  const text = [...messageLines, '', ...buildContactText(baseUrl)].join('\n');
  const html = buildSupportMessageHtml({
    title: 'Product ready to order',
    subtitle: `${productLabel} is now available.`,
    metaRows: [{ label: 'Product', value: productLabel }, ...contactRows],
    message: messageLines.join('\n'),
    ctaLabel: productUrl ? 'Order now' : undefined,
    ctaUrl: productUrl || undefined,
  });

  await sendMail({
    to,
    subject: `${productLabel} is now in stock`,
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

const sendClientAccountDeletedEmail = async ({ to, fullName, reason }) => {
  if (!to) return;
  const displayName = fullName || 'there';
  const baseUrl = getWebConfigBaseUrl();
  const contactRows = buildContactRows(baseUrl);

  const messageLines = [
    `Hi ${displayName},`,
    '',
    'Your ULK Supply account has been removed by our team.',
    reason ? `Reason: ${reason}` : 'Reason: -',
    '',
    'If you have questions or believe this was a mistake, please contact us using any of the channels below.',
  ];

  const text = [...messageLines, '', ...buildContactText(baseUrl)].join('\n');
  const html = buildSupportMessageHtml({
    title: 'Account removed',
    subtitle: 'Your ULK Supply account has been removed.',
    metaRows: [{ label: 'Account', value: to }, ...contactRows],
    message: messageLines.join('\n'),
  });

  await sendMail({
    to,
    subject: 'Your ULK Supply account was removed',
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

const sendClientAccountInactivatedEmail = async ({ to, fullName, reason }) => {
  if (!to) return;
  const displayName = fullName || 'there';
  const baseUrl = getWebConfigBaseUrl();
  const contactRows = buildContactRows(baseUrl);

  const messageLines = [
    `Hi ${displayName},`,
    '',
    'Your ULK Supply account has been set to inactive.',
    reason ? `Reason: ${reason}` : 'Reason: -',
    'For more information, please contact us using any of the channels below.',
  ];

  const text = [...messageLines, '', ...buildContactText(baseUrl)].join('\n');
  const html = buildSupportMessageHtml({
    title: 'Account inactive',
    subtitle: 'Your ULK Supply account is currently inactive.',
    metaRows: [{ label: 'Account', value: to }, ...contactRows],
    message: messageLines.join('\n'),
  });

  await sendMail({
    to,
    subject: 'Your ULK Supply account is inactive',
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

const sendClientAccountActivatedEmail = async ({ to, fullName }) => {
  if (!to) return;
  const displayName = fullName || 'there';
  const baseUrl = getWebConfigBaseUrl();
  const contactRows = buildContactRows(baseUrl);

  const messageLines = [
    `Hi ${displayName},`,
    '',
    'Your ULK Supply account is active again.',
    'You can log in to your account using the website link below.',
    'If you have questions, please contact us using any of the channels below.',
  ];

  const text = [...messageLines, '', ...buildContactText(baseUrl)].join('\n');
  const html = buildSupportMessageHtml({
    title: 'Account active',
    subtitle: 'Your ULK Supply account has been reactivated.',
    metaRows: [{ label: 'Account', value: to }, ...contactRows],
    message: messageLines.join('\n'),
  });

  await sendMail({
    to,
    subject: 'Your ULK Supply account is active',
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

const sendClientTypeDowngradeEmail = async ({ to, fullName, reason }) => {
  if (!to) return;
  const displayName = fullName || 'there';
  const baseUrl = getWebConfigBaseUrl();
  const contactRows = buildContactRows(baseUrl);

  const messageLines = [
    `Hi ${displayName},`,
    '',
    'Your account type has been changed from B2B to C2B.',
    'Business details associated with your B2B profile have been removed.',
    reason ? `Reason: ${reason}` : 'Reason: -',
    '',
    'If you have questions, please contact us using any of the channels below.',
  ];

  const text = [...messageLines, '', ...buildContactText(baseUrl)].join('\n');
  const html = buildSupportMessageHtml({
    title: 'Account type updated',
    subtitle: 'Your ULK Supply account type has been updated.',
    metaRows: [{ label: 'Account', value: to }, ...contactRows],
    message: messageLines.join('\n'),
  });

  await sendMail({
    to,
    subject: 'Your ULK Supply account type was updated',
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

const sendSupportClientMessageEmailToAdmin = async ({ to, clientName, clientEmail, clientType, message, attachments }) => {
  const subject = `New client message: ${clientName || clientEmail || 'Client'}`;
  const text = [
    'New client message received.',
    '',
    `Client: ${clientName || 'N/A'}`,
    `Email: ${clientEmail || 'N/A'}`,
    `Type: ${clientType || 'N/A'}`,
    '',
    'Message:',
    message || '',
  ].join('\n');

  const baseUrl = getWebConfigBaseUrl();
  const ctaUrl = baseUrl ? `${baseUrl}/login` : null;
  const html = buildSupportMessageHtml({
    title: 'New Client Message',
    subtitle: 'A client sent you a new message in the ULK Supply support chat.',
    metaRows: [
      { label: 'Client name', value: clientName || '-' },
      { label: 'Client email', value: clientEmail || '-' },
      { label: 'Client type', value: clientType || '-' },
    ],
    message,
    ctaLabel: 'Reply',
    ctaUrl,
  });

  await sendMail({
    to,
    subject,
    text,
    html,
    replyTo: clientEmail || undefined,
    attachments: [
      ...(hasLogoFile
        ? [
            {
              filename: LOGO_FILENAME,
              path: logoPath,
              cid: LOGO_CID,
            },
          ]
        : []),
      ...(Array.isArray(attachments) ? attachments : []),
    ],
  });
};

const sendSupportAdminReplyEmailToClient = async ({ to, clientName, recipientEmail, message, attachments }) => {
  const subject = 'ULK Supply: New reply to your message';
  const text = [
    `Hi ${clientName || 'there'},`,
    '',
    'We replied to your message in the ULK Supply support chat:',
    '',
    message || '',
    '',
    'You can also view this reply in your account messages.',
  ].join('\n');

  const baseUrl = getWebConfigBaseUrl();
  const ctaUrl = baseUrl ? `${baseUrl}/login` : null;
  const html = buildSupportMessageHtml({
    title: 'Support Reply',
    subtitle: 'We replied to your message. You can reply directly from your account.',
    metaRows: [
      { label: 'Support', value: recipientEmail || 'ULK Supply' },
    ],
    message,
    ctaLabel: 'Reply',
    ctaUrl,
  });

  await sendMail({
    to,
    subject,
    text,
    html,
    replyTo: recipientEmail || undefined,
    attachments: [
      ...(hasLogoFile
        ? [
            {
              filename: LOGO_FILENAME,
              path: logoPath,
              cid: LOGO_CID,
            },
          ]
        : []),
      ...(Array.isArray(attachments) ? attachments : []),
    ],
  });
};

module.exports = {
  sendMail,
  sendClientVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordChangeEmail,
  sendPasswordChangedConfirmation,
  sendOrderConfirmationEmail,
  sendAdminNewOrderEmail,
  sendRestockSubscriptionEmail,
  sendRestockAvailableEmail,
  sendClientAccountDeletedEmail,
  sendClientAccountInactivatedEmail,
  sendClientAccountActivatedEmail,
  sendClientTypeDowngradeEmail,
  sendSupportClientMessageEmailToAdmin,
  sendSupportAdminReplyEmailToClient,
};
