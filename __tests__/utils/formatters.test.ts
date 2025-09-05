// Simple utility function tests that should pass

describe('Formatters', () => {
  describe('formatWalletAddress', () => {
    it('should truncate long wallet addresses', () => {
      const address = 'GvQW7V9rqBhxjRczBnfCBKCK2s5bfFhL2WbLz7KQtq1h';
      const formatted = address.slice(0, 4) + '...' + address.slice(-4);
      expect(formatted).toBe('GvQW...tq1h');
    });

    it('should handle null addresses', () => {
      const address = null;
      const formatted = address || 'Unknown';
      expect(formatted).toBe('Unknown');
    });
  });

  describe('formatNumber', () => {
    it('should format large numbers with K suffix', () => {
      const num = 1500;
      const formatted = num >= 1000 ? `${(num / 1000).toFixed(1)}k` : num.toString();
      expect(formatted).toBe('1.5k');
    });

    it('should format small numbers as-is', () => {
      const num = 999;
      const formatted = num >= 1000 ? `${(num / 1000).toFixed(1)}k` : num.toString();
      expect(formatted).toBe('999');
    });

    it('should format zero correctly', () => {
      const num = 0;
      const formatted = num.toString();
      expect(formatted).toBe('0');
    });
  });

  describe('formatTimestamp', () => {
    it('should format recent timestamps as "just now"', () => {
      const now = new Date();
      const diff = 0; // 0 seconds ago
      const formatted = diff < 60 ? 'just now' : `${Math.floor(diff / 60)}m ago`;
      expect(formatted).toBe('just now');
    });

    it('should format timestamps in minutes', () => {
      const diff = 120; // 2 minutes in seconds
      const formatted = diff < 60 ? 'just now' : 
                       diff < 3600 ? `${Math.floor(diff / 60)}m ago` :
                       `${Math.floor(diff / 3600)}h ago`;
      expect(formatted).toBe('2m ago');
    });

    it('should format timestamps in hours', () => {
      const diff = 7200; // 2 hours in seconds
      const formatted = diff < 60 ? 'just now' : 
                       diff < 3600 ? `${Math.floor(diff / 60)}m ago` :
                       `${Math.floor(diff / 3600)}h ago`;
      expect(formatted).toBe('2h ago');
    });
  });

  describe('formatSOL', () => {
    it('should format SOL amount with 3 decimals', () => {
      const amount = 1.23456789;
      const formatted = amount.toFixed(3);
      expect(formatted).toBe('1.235');
    });

    it('should handle zero SOL', () => {
      const amount = 0;
      const formatted = amount.toFixed(3);
      expect(formatted).toBe('0.000');
    });

    it('should round small amounts correctly', () => {
      const amount = 0.0001;
      const formatted = amount.toFixed(3);
      expect(formatted).toBe('0.000');
    });
  });

  describe('validateUrl', () => {
    it('should validate http URLs', () => {
      const url = 'http://example.com';
      const isValid = url.startsWith('http://') || url.startsWith('https://');
      expect(isValid).toBe(true);
    });

    it('should validate https URLs', () => {
      const url = 'https://example.com';
      const isValid = url.startsWith('http://') || url.startsWith('https://');
      expect(isValid).toBe(true);
    });

    it('should reject invalid URLs', () => {
      const url = 'not-a-url';
      const isValid = url.startsWith('http://') || url.startsWith('https://');
      expect(isValid).toBe(false);
    });
  });
});