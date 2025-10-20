/**
 * Tests for SafeContent Component
 * Tests XSS protection and content sanitization
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { SafeContent, MemoizedSafeContent } from '../SafeContent';

// Mock the sanitize utility
jest.mock('@/utils/sanitize', () => ({
  sanitizeContent: jest.fn((content: string, options: { allowLinks?: boolean; allowImages?: boolean; allowFormatting?: boolean }) => {
    // Handle null/undefined content
    if (content === null || content === undefined) {
      return '';
    }

    // Simple mock that removes script tags but keeps basic HTML
    let sanitized = content;

    // Remove script tags
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // Remove dangerous attributes
    sanitized = sanitized.replace(/on\w+="[^"]*"/gi, '');

    // Handle options
    if (!options.allowLinks) {
      sanitized = sanitized.replace(/<a\b[^>]*>(.*?)<\/a>/gi, '$1');
    }
    if (!options.allowImages) {
      sanitized = sanitized.replace(/<img\b[^>]*>/gi, '');
    }
    if (!options.allowFormatting) {
      sanitized = sanitized.replace(/<(strong|em|b|i)\b[^>]*>(.*?)<\/\1>/gi, '$2');
    }

    return sanitized;
  }),
}));

describe('SafeContent', () => {
  describe('Basic rendering', () => {
    it('should render plain text content', () => {
      render(<SafeContent content="Hello World" />);
      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });

    it('should render with custom className', () => {
      const { container } = render(
        <SafeContent content="Test" className="text-white font-bold" />
      );
      const element = container.firstChild as HTMLElement;
      expect(element.className).toBe('text-white font-bold');
    });

    it('should render as different HTML element when "as" prop is provided', () => {
      const { container } = render(
        <SafeContent content="Test" as="span" />
      );
      expect(container.firstChild?.nodeName).toBe('SPAN');
    });

    it('should render as div by default', () => {
      const { container } = render(<SafeContent content="Test" />);
      expect(container.firstChild?.nodeName).toBe('DIV');
    });
  });

  describe('XSS Protection', () => {
    it('should sanitize script tags', () => {
      const maliciousContent = 'Safe text <script>alert("XSS")</script> more text';
      render(<SafeContent content={maliciousContent} />);

      // Script should be removed
      const element = screen.getByText(/Safe text.*more text/);
      expect(element.innerHTML).not.toContain('<script>');
      expect(element.innerHTML).not.toContain('alert');
    });

    it('should sanitize event handlers', () => {
      const maliciousContent = '<div onclick="alert(\'XSS\')">Click me</div>';
      const { container } = render(<SafeContent content={maliciousContent} />);

      const element = container.firstChild as HTMLElement;
      expect(element.innerHTML).not.toContain('onclick');
      expect(element.innerHTML).toContain('Click me');
    });

    it('should handle multiple XSS attempts', () => {
      const maliciousContent = `
        <script>alert('XSS1')</script>
        <div onload="alert('XSS2')">
          <img src="x" onerror="alert('XSS3')" />
        </div>
      `;
      const { container } = render(<SafeContent content={maliciousContent} />);

      const element = container.firstChild as HTMLElement;
      expect(element.innerHTML).not.toContain('<script>');
      expect(element.innerHTML).not.toContain('onload');
      expect(element.innerHTML).not.toContain('onerror');
    });
  });

  describe('Content sanitization options', () => {
    it('should allow links by default', () => {
      const content = '<a href="https://example.com">Link</a>';
      const { container } = render(<SafeContent content={content} />);

      const element = container.firstChild as HTMLElement;
      expect(element.innerHTML).toContain('<a');
      expect(element.innerHTML).toContain('https://example.com');
    });

    it('should remove links when allowLinks is false', () => {
      const content = '<a href="https://example.com">Link</a>';
      const { container } = render(
        <SafeContent content={content} allowLinks={false} />
      );

      const element = container.firstChild as HTMLElement;
      expect(element.innerHTML).not.toContain('<a');
      expect(element.innerHTML).toContain('Link'); // Text should remain
    });

    it('should allow images when allowImages is true', () => {
      const content = '<img src="https://example.com/image.jpg" alt="Test" />';
      const { container } = render(
        <SafeContent content={content} allowImages={true} />
      );

      const element = container.firstChild as HTMLElement;
      expect(element.innerHTML).toContain('<img');
    });

    it('should remove images by default', () => {
      const content = 'Text <img src="test.jpg" /> more text';
      const { container } = render(<SafeContent content={content} />);

      const element = container.firstChild as HTMLElement;
      expect(element.innerHTML).not.toContain('<img');
    });

    it('should allow formatting by default', () => {
      const content = 'Normal <strong>bold</strong> <em>italic</em>';
      const { container } = render(<SafeContent content={content} />);

      const element = container.firstChild as HTMLElement;
      expect(element.innerHTML).toContain('<strong>');
      expect(element.innerHTML).toContain('<em>');
    });

    it('should remove formatting when allowFormatting is false', () => {
      const content = '<strong>Bold</strong> <em>Italic</em>';
      const { container } = render(
        <SafeContent content={content} allowFormatting={false} />
      );

      const element = container.firstChild as HTMLElement;
      expect(element.innerHTML).not.toContain('<strong>');
      expect(element.innerHTML).not.toContain('<em>');
      expect(element.textContent).toContain('Bold');
      expect(element.textContent).toContain('Italic');
    });
  });

  describe('Complex content scenarios', () => {
    it('should handle empty content', () => {
      render(<SafeContent content="" />);
      const { container } = render(<SafeContent content="" />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should handle content with special characters', () => {
      const content = 'Special chars: < > & " \'';
      render(<SafeContent content={content} />);
      expect(screen.getByText(/Special chars/)).toBeInTheDocument();
    });

    it('should handle mixed safe and unsafe content', () => {
      const content = `
        <p>Safe paragraph</p>
        <script>alert('unsafe')</script>
        <strong>Safe bold</strong>
        <div onclick="unsafe()">Safe text</div>
      `;
      const { container } = render(<SafeContent content={content} />);

      const element = container.firstChild as HTMLElement;
      expect(element.innerHTML).toContain('Safe paragraph');
      expect(element.innerHTML).toContain('Safe bold');
      expect(element.innerHTML).not.toContain('<script>');
      expect(element.innerHTML).not.toContain('onclick');
    });

    it('should preserve line breaks and whitespace in text', () => {
      const content = 'Line 1\n\nLine 2\nLine 3';
      render(<SafeContent content={content} />);
      expect(screen.getByText(/Line 1/)).toBeInTheDocument();
    });
  });

  describe('MemoizedSafeContent', () => {
    it('should render content correctly', () => {
      render(<MemoizedSafeContent content="Memoized test" />);
      expect(screen.getByText('Memoized test')).toBeInTheDocument();
    });

    it('should have correct display name', () => {
      expect(MemoizedSafeContent.displayName).toBe('MemoizedSafeContent');
    });

    it('should not re-render when props are the same', () => {
      const { rerender } = render(
        <MemoizedSafeContent content="Test" className="text-white" />
      );

      const firstElement = screen.getByText('Test');

      // Re-render with same props
      rerender(
        <MemoizedSafeContent content="Test" className="text-white" />
      );

      const secondElement = screen.getByText('Test');
      expect(firstElement).toBe(secondElement);
    });

    it('should re-render when content changes', () => {
      const { rerender } = render(
        <MemoizedSafeContent content="Initial" />
      );

      expect(screen.getByText('Initial')).toBeInTheDocument();

      rerender(<MemoizedSafeContent content="Updated" />);

      expect(screen.queryByText('Initial')).not.toBeInTheDocument();
      expect(screen.getByText('Updated')).toBeInTheDocument();
    });

    it('should re-render when options change', () => {
      const content = '<a href="test">Link</a>';
      const { rerender, container } = render(
        <MemoizedSafeContent content={content} allowLinks={true} />
      );

      let element = container.firstChild as HTMLElement;
      expect(element.innerHTML).toContain('<a');

      rerender(
        <MemoizedSafeContent content={content} allowLinks={false} />
      );

      element = container.firstChild as HTMLElement;
      expect(element.innerHTML).not.toContain('<a');
    });
  });

  describe('Integration with dangerouslySetInnerHTML', () => {
    it('should use dangerouslySetInnerHTML correctly', () => {
      const content = '<p>Paragraph with <strong>formatting</strong></p>';
      const { container } = render(<SafeContent content={content} />);

      const element = container.firstChild as HTMLElement;
      // Should render as HTML, not escaped text
      expect(element.querySelector('p')).toBeTruthy();
      expect(element.querySelector('strong')).toBeTruthy();
    });

    it('should not double-encode HTML entities', () => {
      const content = '&lt;script&gt;alert()&lt;/script&gt;';
      render(<SafeContent content={content} />);

      // Should be safe and render the entities as-is
      expect(screen.getByText(/script/i)).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('should handle very long content', () => {
      const longContent = 'x'.repeat(10000);
      const { container } = render(<SafeContent content={longContent} />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should handle deeply nested HTML', () => {
      const nested = '<div><div><div><span>Deep</span></div></div></div>';
      render(<SafeContent content={nested} />);
      expect(screen.getByText('Deep')).toBeInTheDocument();
    });

    it('should handle malformed HTML gracefully', () => {
      const malformed = '<div><p>Unclosed paragraph<div>Another div</div>';
      const { container } = render(<SafeContent content={malformed} />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should handle null-like content safely', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { container } = render(<SafeContent content={null as any} />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should handle undefined className', () => {
      const { container } = render(
        <SafeContent content="Test" className={undefined} />
      );
      const element = container.firstChild as HTMLElement;
      expect(element.className).toBe('');
    });
  });
});
