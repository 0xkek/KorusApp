import { sanitizeString, sanitizeSqlInput } from '../middleware/sanitization';

describe('Input Sanitization', () => {
  describe('sanitizeString', () => {
    it('should remove HTML tags', () => {
      const input = '<script>alert("XSS")</script>Hello';
      const output = sanitizeString(input);
      expect(output).not.toContain('<script>');
      expect(output).not.toContain('</script>');
    });

    it('should escape HTML entities', () => {
      const input = '<div>Test & "quotes" \'single\'</div>';
      const output = sanitizeString(input);
      expect(output).not.toContain('<div>');
      expect(output).toContain('&lt;');
      expect(output).toContain('&gt;');
      expect(output).toContain('&quot;');
    });

    it('should remove javascript: protocol', () => {
      const input = 'javascript:alert(1)';
      const output = sanitizeString(input);
      expect(output).not.toContain('javascript:');
    });

    it('should remove event handlers', () => {
      const input = 'onclick=alert(1) onmouseover=alert(2)';
      const output = sanitizeString(input);
      expect(output).not.toContain('onclick');
      expect(output).not.toContain('onmouseover');
    });

    it('should handle empty input', () => {
      expect(sanitizeString('')).toBe('');
      expect(sanitizeString(null as any)).toBe('');
      expect(sanitizeString(undefined as any)).toBe('');
    });
  });

  describe('sanitizeSqlInput', () => {
    it('should remove SQL keywords', () => {
      const input = 'SELECT * FROM users WHERE id = 1; DROP TABLE users;';
      const output = sanitizeSqlInput(input);
      expect(output).not.toContain('SELECT');
      expect(output).not.toContain('DROP');
      expect(output).not.toContain('FROM');
    });

    it('should remove SQL special characters', () => {
      const input = "'; DELETE FROM users; --";
      const output = sanitizeSqlInput(input);
      expect(output).not.toContain("'");
      expect(output).not.toContain(';');
      expect(output).not.toContain('--');
    });

    it('should handle UNION attacks', () => {
      const input = '1 UNION SELECT password FROM users';
      const output = sanitizeSqlInput(input);
      expect(output).not.toContain('UNION');
      expect(output).not.toContain('SELECT');
    });

    it('should preserve safe text', () => {
      const input = 'This is a normal search query';
      const output = sanitizeSqlInput(input);
      expect(output).toBe('This is a normal search query');
    });
  });
});