// Test setup file
import { jest } from '@jest/globals';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-min-32-characters!!';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-32-chars!!!!';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

// Increase timeout for async tests
jest.setTimeout(30000);

// Global teardown
afterAll(async () => {
  // Clean up any open handles
  await new Promise(resolve => setTimeout(resolve, 500));
});
