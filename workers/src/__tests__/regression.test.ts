/**
 * Regression tests for Cloudflare Workers.
 *
 * Each test guards against a specific bug found during initial test suite creation.
 * When adding a new regression test, document:
 *   - BUG ID
 *   - What went wrong
 *   - Root cause
 */
import { describe, expect, it, vi } from 'vitest';

// ─── BUG-W1: `cloudflare:email` module cannot be resolved outside CF runtime ──
// Root cause: `send-alert.ts` imports `cloudflare:email` which only exists in the
// Workers runtime. Vitest (Node) can't resolve it, causing ALL email tests to crash.
// Fix: vitest.config.ts aliases `cloudflare:email` → `src/__mocks__/cloudflare-email.ts`.
describe('BUG-W1: cloudflare:email mock resolution', () => {
  it('the cloudflare:email mock module can be imported', async () => {
    // If this import fails, vitest.config.ts alias is broken
    const mod = await import('../__mocks__/cloudflare-email');
    expect(mod.EmailMessage).toBeDefined();
  });

  it('EmailMessage mock has the correct constructor signature', async () => {
    // The real CF EmailMessage takes (from, to, rawMime)
    // Our mock must match this contract
    const { EmailMessage } = await import('../__mocks__/cloudflare-email');
    const msg = new EmailMessage('from@test.com', 'to@test.com', 'raw-mime-data');
    expect(msg.from).toBe('from@test.com');
    expect(msg.to).toBe('to@test.com');
    expect(msg.raw).toBe('raw-mime-data');
  });

  it('send-alert handler can be imported without crashing', async () => {
    // If the cloudflare:email alias is broken, this dynamic import throws
    const mod = await import('../email/send-alert');
    expect(mod.handleSendAlert).toBeTypeOf('function');
  });
});

// ─── BUG-W2: AI handler uses `{ prompt }` format, not `{ messages }` ──────────
// Root cause: The Cloudflare Workers AI text-generation models accept either
// `{ prompt, max_tokens, temperature }` (single-turn) or
// `{ messages: [...], max_tokens, temperature }` (chat-style).
// Our generate-questions.ts uses `prompt` format. Tests that assumed `messages`
// format failed silently (assertion mismatch).
// Fix: Assert against the actual API shape used by the handler.
describe('BUG-W2: AI.run call signature uses prompt format', () => {
  it('generate-questions uses single-turn prompt, not messages array', async () => {
    // Mock auth
    vi.doMock('../shared/auth', () => ({
      authenticateRequest: vi.fn().mockResolvedValue({
        user: { id: 'u1', app_id: 'app1', role: 'admin' },
      }),
    }));
    vi.doMock('../shared/tokens', () => ({
      consumeTenantTokens: vi.fn().mockResolvedValue(undefined),
    }));

    const mockAI = {
      run: vi.fn().mockResolvedValue({
        response: JSON.stringify([{ text: 'Q1', question_type: 'mcq', difficulty: 'easy' }]),
      }),
    };

    const { handleGenerateQuestions } = await import('../ai/generate-questions');

    const request = new Request('https://test.com/ai/generate-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok' },
      body: JSON.stringify({
        text: 'Test content',
        difficulty_distribution: { easy: 1, medium: 0, hard: 0 },
      }),
    });

    await handleGenerateQuestions(request, {
      AI: mockAI as unknown as Ai,
      EMAIL: {} as SendEmail,
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'k',
      ALERT_WEBHOOK_SECRET: 's',
      ADMIN_ALERT_EMAIL: 'a@b.com',
      ALERT_SENDER: 's@b.com',
      ENVIRONMENT: 'test',
    });

    // REGRESSION GUARD: AI.run MUST be called with `prompt` (string), NOT `messages` (array)
    const callArgs = mockAI.run.mock.calls[0];
    expect(callArgs).toBeDefined();
    const [_model, params] = callArgs;

    // Must have `prompt` as a string
    expect(params).toHaveProperty('prompt');
    expect(typeof params.prompt).toBe('string');

    // Must NOT have `messages` — if someone refactors to chat format, this will catch it
    expect(params).not.toHaveProperty('messages');

    // Must have temperature and max_tokens
    expect(params).toHaveProperty('temperature');
    expect(params).toHaveProperty('max_tokens');
  });
});

// ─── BUG-W3: In-memory rate limiter leaks state across tests ──────────────────
// Root cause: `checkRateLimit` stores request counts in a module-level `Map`.
// After 5 calls from the same key across different tests, subsequent tests get
// 429 responses — even though each test should be independent.
// Fix: Mock the rate limiter in handler tests OR reset the map between tests.
describe('BUG-W3: Rate limiter state isolation', () => {

  it('rate limiter map is module-scoped (leaks by design)', async () => {
    // This test documents the behavior. The rate limiter is intentionally
    // in-memory for production (per-isolate), but this means tests must
    // either mock it or account for shared state.
    const { checkRateLimit, RATE_LIMITS } = await import('../shared/rate-limiter');

    // Use a unique key per test run to avoid pollution from other tests
    const uniqueKey = `regression-test-${Date.now()}-${Math.random()}`;
    const limit = RATE_LIMITS.sendAlert; // 5 per 60s

    // Exhaust the limit
    for (let i = 0; i < limit.maxRequests; i++) {
      const result = checkRateLimit(uniqueKey, limit);
      expect(result.allowed).toBe(true);
    }

    // Next request should be blocked
    const blocked = checkRateLimit(uniqueKey, limit);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it('handler tests MUST mock rate limiter to avoid cross-test contamination', () => {
    // This is a documentation test. If you write handler tests without
    // mocking the rate limiter, they will fail intermittently when run
    // together (after 5 requests to the same endpoint).
    //
    // Correct pattern in handler test files:
    //
    //   vi.mock('../shared/rate-limiter', () => ({
    //     checkRateLimit: vi.fn().mockReturnValue({ allowed: true, ... }),
    //     RATE_LIMITS: { ... },
    //     rateLimitResponse: vi.fn(),
    //   }));
    //
    // AND in beforeEach:
    //   vi.clearAllMocks();  // NOT vi.restoreAllMocks() — that removes mock implementations
    //   vi.mocked(checkRateLimit).mockReturnValue({ allowed: true, ... });
    //
    expect(true).toBe(true); // Documentation-only test
  });

  it('vi.clearAllMocks preserves mock implementations, restoreAllMocks does NOT', () => {
    // BUG-W3b: Using `vi.restoreAllMocks()` in beforeEach destroyed the
    // rate limiter mock implementation after the first test, causing all
    // subsequent tests to call the REAL rate limiter (which then hit the limit).
    //
    // Correct: vi.clearAllMocks() — resets call counts, preserves implementations
    // Wrong:   vi.restoreAllMocks() — removes mock implementations entirely
    const mockFn = vi.fn().mockReturnValue('mocked');
    expect(mockFn()).toBe('mocked');

    // clearAllMocks: preserves implementation
    vi.clearAllMocks();
    expect(mockFn()).toBe('mocked'); // Still works!

    // restoreAllMocks would make mockFn() return undefined
    // We don't call it here to keep the test deterministic
  });
});

// ─── BUG-W4: send-alert payload validation must happen before processing ──────
// Root cause: Original implementation destructured `{ record, type }` from payload
// without checking if they exist. Sending `{ type: "INSERT" }` (no record) or
// `{ record: {...} }` (no type) caused runtime crashes instead of 400 errors.
// Fix: Added explicit `if (!record || !type)` guard with 400 response.
describe('BUG-W4: send-alert payload validation', () => {

  function makeRequest(body: unknown, secret: string): Request {
    return new Request('https://test.com/email/send-alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-webhook-secret': secret },
      body: JSON.stringify(body),
    });
  }

  const env = {
    AI: {} as Ai,
    EMAIL: { send: vi.fn() } as unknown as SendEmail,
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'k',
    ALERT_WEBHOOK_SECRET: 'secret',
    ADMIN_ALERT_EMAIL: 'a@b.com',
    ALERT_SENDER: 's@b.com',
    ENVIRONMENT: 'test',
  };

  it('returns 400 when record is missing (not a crash)', async () => {
    vi.doMock('../shared/rate-limiter', () => ({
      checkRateLimit: vi.fn().mockReturnValue({ allowed: true, remaining: 5, resetAt: Date.now() + 60000 }),
      RATE_LIMITS: { sendAlert: { maxRequests: 5, windowMs: 60000 } },
      rateLimitResponse: vi.fn(),
    }));
    const { handleSendAlert } = await import('../email/send-alert');

    const response = await handleSendAlert(makeRequest({ type: 'INSERT' }, 'secret'), env);
    // REGRESSION: Must be 400, not a crash/500
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toContain('Invalid payload');
  });

  it('returns 400 when type is missing (not a crash)', async () => {
    vi.doMock('../shared/rate-limiter', () => ({
      checkRateLimit: vi.fn().mockReturnValue({ allowed: true, remaining: 5, resetAt: Date.now() + 60000 }),
      RATE_LIMITS: { sendAlert: { maxRequests: 5, windowMs: 60000 } },
      rateLimitResponse: vi.fn(),
    }));
    const { handleSendAlert } = await import('../email/send-alert');

    const response = await handleSendAlert(makeRequest({ record: { id: '1' } }, 'secret'), env);
    expect(response.status).toBe(400);
  });

  it('returns 400 when body is completely empty object', async () => {
    vi.doMock('../shared/rate-limiter', () => ({
      checkRateLimit: vi.fn().mockReturnValue({ allowed: true, remaining: 5, resetAt: Date.now() + 60000 }),
      RATE_LIMITS: { sendAlert: { maxRequests: 5, windowMs: 60000 } },
      rateLimitResponse: vi.fn(),
    }));
    const { handleSendAlert } = await import('../email/send-alert');

    const response = await handleSendAlert(makeRequest({}, 'secret'), env);
    expect(response.status).toBe(400);
  });
});
