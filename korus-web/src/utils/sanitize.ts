/**
 * Content sanitization utilities for XSS protection
 */
import DOMPurify from 'dompurify';

export interface SanitizeOptions {
  allowLinks?: boolean;
  allowImages?: boolean;
  allowVideos?: boolean;
  allowFormatting?: boolean;
}

/**
 * Sanitize user-generated content to prevent XSS attacks
 * @param content - The raw content to sanitize
 * @param options - Options to control what HTML elements are allowed
 * @returns Sanitized HTML string safe for rendering
 */
/**
 * Convert @username mentions to clickable links
 */
function linkifyMentions(content: string): string {
  return content.replace(
    /@([a-zA-Z0-9_]{1,20})\b/g,
    '<a href="/profile/$1" class="mention-link">@$1</a>'
  );
}

export function sanitizeContent(
  content: string,
  options: SanitizeOptions = {}
): string {
  const {
    allowLinks = true,
    allowImages = false,
    allowVideos = false,
    allowFormatting = true,
  } = options;

  // Pre-process: convert @mentions to links before sanitization
  const processed = allowLinks ? linkifyMentions(content) : content;

  const config = {
    ALLOWED_TAGS: [
      ...(allowFormatting ? ['p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre', 'blockquote'] : []),
      ...(allowLinks ? ['a'] : []),
      ...(allowImages ? ['img'] : []),
      ...(allowVideos ? ['video', 'source'] : []),
    ],
    ALLOWED_ATTR: [
      ...(allowLinks ? ['href', 'target', 'rel', 'class'] : []),
      ...(allowImages ? ['src', 'alt', 'width', 'height'] : []),
      ...(allowVideos ? ['src', 'controls', 'type'] : []),
    ],
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|ipfs):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  };

  return DOMPurify.sanitize(processed, config);
}

/**
 * Sanitize a URL to ensure it's safe
 * @param url - The URL to sanitize
 * @returns Sanitized URL or empty string if invalid
 */
export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Only allow http, https, and ipfs protocols
    if (!['http:', 'https:', 'ipfs:'].includes(parsed.protocol)) {
      return '';
    }
    return url;
  } catch {
    return '';
  }
}

/**
 * Escape HTML entities in plain text
 * Use this when you want to display content as plain text, not HTML
 * @param text - The text to escape
 * @returns Text with HTML entities escaped
 */
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Strip all HTML tags from content
 * @param html - HTML string to strip
 * @returns Plain text with all HTML removed
 */
export function stripHtml(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}
