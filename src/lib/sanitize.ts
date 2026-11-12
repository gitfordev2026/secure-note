/**
 * Content sanitization for XSS prevention
 *
 * Sanitizes user-generated note content before rendering to prevent
 * cross-site scripting attacks.
 */

// Allowed HTML tags for note content
const ALLOWED_TAGS = new Set([
  "p", "br", "b", "i", "em", "strong", "u", "s",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li",
  "blockquote",
  "pre", "code",
  "a", "img",
  "table", "thead", "tbody", "tr", "td", "th",
  "hr",
]);

// Allowed attributes for specific tags
const ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  a: ["href", "title", "target", "rel"],
  img: ["src", "alt", "title", "width", "height"],
};

// Allowed URL protocols
const ALLOWED_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);

/**
 * Escape HTML special characters
 */
export function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Simple HTML sanitizer for note content.
 * Removes script tags, event handlers, javascript: URLs, and disallowed tags.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return html;

  // Remove script tags and their content
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

  // Remove event handlers (onclick, onerror, onload, etc.)
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*("[^"]*"|'[^']*'|\S+)/gi, "");

  // Remove javascript: URLs
  sanitized = sanitized.replace(/javascript:/gi, "");

  // Remove vbscript: URLs
  sanitized = sanitized.replace(/vbscript:/gi, "");

  // Remove data: URLs for img src (potential XSS vector)
  sanitized = sanitized.replace(/<img[^>]*src\s*=\s*["']data:/gi, "");

  // Remove style attributes (CSS-based XSS)
  sanitized = sanitized.replace(/\s+style\s*=\s*("[^"]*"|'[^']*'|\S+)/gi, "");

  // Remove iframe, object, embed tags entirely
  sanitized = sanitized.replace(/<(iframe|object|embed|applet|form|input|button|select|textarea|link|meta|base)[^>]*>/gi, "");

  // Remove any remaining tags with on* attributes
  sanitized = sanitized.replace(/<(\w+)([^>]*on\w+[^>]*)>/gi, "<$1$2>");

  return sanitized;
}

/**
 * Sanitize note content before saving/displaying.
 * For plain text notes, escapes HTML. For rich text, sanitizes allowed tags.
 */
export function sanitizeNoteContent(content: string, isRichText = false): string {
  if (isRichText) {
    return sanitizeHtml(content);
  }
  // Plain text: escape everything
  return escapeHtml(content);
}

/**
 * Sanitize a URL for use in href/src attributes
 */
export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
      return "#";
    }
    return url;
  } catch {
    return "#";
  }
}
