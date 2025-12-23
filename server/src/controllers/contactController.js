const { badRequest } = require('../utils/appError');
const { validateSendContactEmail } = require('../validators/contact');
const { sendMail } = require('../services/emailService');

const getAllowedRecipients = () => {
  const raw = process.env.CONTACT_RECIPIENT_EMAILS || process.env.CONTACT_RECIPIENTS || '';
  const list = raw
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (list.length > 0) {
    return list;
  }

  return ['sales@ulk-supply.com', 'ulksupply@hotmail.com', 'bprod.digital@gmail.com'].map((email) => email.toLowerCase());
};

const sendContactEmail = async (req, res, next) => {
  try {
    const data = validateSendContactEmail(req.body || {});
    const allowed = getAllowedRecipients();
    const recipient = data.recipient.trim().toLowerCase();

    if (!allowed.includes(recipient)) {
      throw badRequest('Invalid recipient selected.', [{ field: 'recipient' }]);
    }

    const subject = `Contact form: ${data.name} <${data.email}>`;
    const text = [
      'New contact form submission:',
      '',
      `To: ${recipient}`,
      `Name: ${data.name}`,
      `Email: ${data.email}`,
      data.phone ? `Phone: ${data.phone}` : 'Phone: -',
      '',
      'Message:',
      data.message,
    ].join('\n');

    await sendMail({
      to: recipient,
      subject,
      text,
      replyTo: data.email,
    });

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  sendContactEmail,
};

