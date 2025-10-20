const parseBoolean = (value, defaultValue = false) => {
  if (value === undefined) {
    return defaultValue;
  }
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const getEmailConfig = () => {
  const port = Number(process.env.SMTP_PORT || 587);
  return {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number.isFinite(port) ? port : 587,
    secure: parseBoolean(process.env.SMTP_SECURE, false),
    auth: {
      user: process.env.SMTP_USER || 'bpd.claude@gmail.com',
      pass: process.env.SMTP_PASSWORD || process.env.SMTP_PASS || '',
    },
    sender: process.env.EMAIL_SENDER || process.env.SMTP_USER || 'bpd.claude@gmail.com',
  };
};

module.exports = {
  getEmailConfig,
};

