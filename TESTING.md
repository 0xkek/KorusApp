# Testing Guide

## Overview

The Korus app now has a basic test suite to ensure critical functionality works correctly.

## Backend Tests

### Setup

```bash
cd korus-backend
npm install --save-dev jest @types/jest supertest @types/supertest ts-jest
```

### Running Tests

```bash
# Run all tests
npm test

# Watch mode (re-runs on file changes)
npm run test:watch

# Coverage report
npm run test:coverage
```

### Test Coverage

Current test files:
- `src/__tests__/health.test.ts` - Health endpoint tests
- `src/__tests__/auth.test.ts` - Authentication tests (critical security)
- `src/__tests__/sanitization.test.ts` - Input sanitization tests
- `src/__tests__/rateLimiter.test.ts` - Rate limiting tests

### What's Tested

✅ **Security Critical**
- Authentication cannot be bypassed
- JWT secret strength requirements
- Input sanitization (XSS prevention)
- SQL injection prevention
- Rate limiting enforcement

✅ **API Endpoints**
- Health checks
- Authentication flow
- Error responses

## Frontend Tests

### Setup

```bash
npm install --save-dev jest @testing-library/react-native
```

### Running Tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch
```

### Current Coverage

- Basic smoke tests
- Environment configuration tests

## Important Security Tests

These tests ensure our security fixes are working:

1. **No Authentication Bypass**
   ```typescript
   // auth.test.ts verifies ALLOW_AUTH_BYPASS doesn't work
   ```

2. **Input Sanitization**
   ```typescript
   // sanitization.test.ts verifies XSS and SQL injection prevention
   ```

3. **Rate Limiting**
   ```typescript
   // rateLimiter.test.ts verifies request limits are enforced
   ```

## Adding New Tests

When adding new features, always include tests for:
1. Happy path (normal operation)
2. Error cases
3. Security edge cases
4. Rate limiting

Example test structure:
```typescript
describe('Feature Name', () => {
  it('should handle normal case', async () => {
    // Test implementation
  });

  it('should handle error case', async () => {
    // Test error handling
  });

  it('should prevent security issue', async () => {
    // Test security
  });
});
```

## CI/CD Integration

Add to your deployment pipeline:

```yaml
# GitHub Actions example
- name: Run tests
  run: |
    cd korus-backend
    npm test
    
- name: Check coverage
  run: |
    cd korus-backend
    npm run test:coverage
```

## Coverage Goals

Minimum coverage for production:
- Critical paths: 80%
- Authentication: 90%
- Security functions: 100%
- Overall: 60%

## Test Database

For integration tests, use a separate test database:

```env
# .env.test
DATABASE_URL=postgresql://user:pass@localhost:5432/korus_test
JWT_SECRET=test-secret-key-for-testing-only-32-characters-long
NODE_ENV=test
```

## Troubleshooting

**Tests timing out**: Increase jest timeout in jest.config.js
```javascript
testTimeout: 10000 // 10 seconds
```

**Database connection errors**: Ensure test database exists
```bash
createdb korus_test
```

**Module not found**: Clear jest cache
```bash
jest --clearCache
```