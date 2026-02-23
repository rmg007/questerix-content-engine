import { beforeEach, describe, expect, it } from 'vitest';
import { checkRateLimit, RATE_LIMITS } from './rate-limiter';

describe('RATE_LIMITS', () => {
  it('defines generateQuestions limit', () => {
    expect(RATE_LIMITS.generateQuestions).toEqual({ maxRequests: 10, windowMs: 60_000 });
  });

  it('defines validateContent limit', () => {
    expect(RATE_LIMITS.validateContent).toEqual({ maxRequests: 20, windowMs: 60_000 });
  });

  it('defines sendAlert limit', () => {
    expect(RATE_LIMITS.sendAlert).toEqual({ maxRequests: 5, windowMs: 60_000 });
  });
});

describe('checkRateLimit', () => {
  // Use unique keys per test to avoid cross-test contamination
  let testKey: string;

  beforeEach(() => {
    testKey = `test-${Date.now()}-${Math.random()}`;
  });

  it('allows first request', () => {
    const result = checkRateLimit(testKey, { maxRequests: 3, windowMs: 60_000 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it('decrements remaining on subsequent requests', () => {
    const config = { maxRequests: 3, windowMs: 60_000 };
    checkRateLimit(testKey, config);
    const result = checkRateLimit(testKey, config);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);
  });

  it('blocks when limit is exceeded', () => {
    const config = { maxRequests: 2, windowMs: 60_000 };
    checkRateLimit(testKey, config);
    checkRateLimit(testKey, config);
    const result = checkRateLimit(testKey, config);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('resets after window expires', () => {
    const config = { maxRequests: 1, windowMs: 1 }; // 1ms window
    checkRateLimit(testKey, config);

    // Wait just past the window
    const start = Date.now();
    while (Date.now() - start < 5) {
      /* spin */
    }

    const result = checkRateLimit(testKey, config);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it('returns resetAt timestamp in the future', () => {
    const now = Date.now();
    const result = checkRateLimit(testKey, { maxRequests: 5, windowMs: 60_000 });
    expect(result.resetAt).toBeGreaterThan(now);
    expect(result.resetAt).toBeLessThanOrEqual(now + 60_001);
  });
});
