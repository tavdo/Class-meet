const nodemailer = require('nodemailer');
const config = require('../config');

let cachedTransporter = null;

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;
  const { host, port, secure, user, pass } = config.smtp;
  if (!host) return null;
  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user ? { user, pass } : undefined,
  });
  return cachedTransporter;
}

/**
 * Send an email. If SMTP is not configured the message is logged to the
 * server console instead — useful for local development so you can grab
 * password-reset links without provisioning a real mail provider.
 */
async function sendMail({ to, subject, html, text }) {
  const transporter = getTransporter();
  if (!transporter) {
    // Dev fallback: print the message so the reset link is visible to the operator.
    console.log('\n[mailer] SMTP not configured — email would have been sent:');
    console.log(`  to:      ${to}`);
    console.log(`  subject: ${subject}`);
    if (text) console.log(`  text:\n${text}`);
    if (html) console.log(`  html:\n${html}`);
    console.log('');
    return { delivered: false, preview: true };
  }

  const info = await transporter.sendMail({
    from: config.smtp.from,
    to,
    subject,
    text,
    html,
  });
  return { delivered: true, messageId: info.messageId };
}

module.exports = { sendMail };
