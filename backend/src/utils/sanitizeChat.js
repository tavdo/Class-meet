const sanitizeHtml = require('sanitize-html');

/**
 * Strip HTML/scripts from chat input to reduce XSS when messages are rendered.
 */
function sanitizeChatText(input) {
  if (typeof input !== 'string') return '';
  const trimmed = input.trim();
  if (!trimmed) return '';
  return sanitizeHtml(trimmed, {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'discard',
  });
}

module.exports = { sanitizeChatText };
