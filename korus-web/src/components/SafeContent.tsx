/**
 * SafeContent component for rendering sanitized user-generated content
 * Prevents XSS attacks by sanitizing HTML before rendering
 */
import React from 'react';
import { sanitizeContent, SanitizeOptions } from '@/utils/sanitize';

interface SafeContentProps extends SanitizeOptions {
  content: string;
  className?: string;
  as?: keyof React.JSX.IntrinsicElements;
}

/**
 * Safely renders user-generated HTML content with XSS protection
 *
 * @example
 * // Basic usage with default settings (allows links and formatting)
 * <SafeContent content={post.content} className="text-white" />
 *
 * @example
 * // Allow images in the content
 * <SafeContent content={post.content} allowImages={true} />
 *
 * @example
 * // Render as a specific element
 * <SafeContent content={post.content} as="span" className="text-sm" />
 */
export function SafeContent({
  content,
  className = '',
  as: Component = 'div',
  allowLinks = true,
  allowImages = false,
  allowVideos = false,
  allowFormatting = true,
}: SafeContentProps) {
  const sanitized = sanitizeContent(content, {
    allowLinks,
    allowImages,
    allowVideos,
    allowFormatting,
  });

  return (
    <Component
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}

/**
 * Memoized version of SafeContent for performance optimization
 * Only re-renders if content or options change
 */
export const MemoizedSafeContent = React.memo(SafeContent, (prevProps, nextProps) => {
  return (
    prevProps.content === nextProps.content &&
    prevProps.className === nextProps.className &&
    prevProps.allowLinks === nextProps.allowLinks &&
    prevProps.allowImages === nextProps.allowImages &&
    prevProps.allowVideos === nextProps.allowVideos &&
    prevProps.allowFormatting === nextProps.allowFormatting
  );
});

MemoizedSafeContent.displayName = 'MemoizedSafeContent';
