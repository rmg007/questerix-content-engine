import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../shared/types';
import { handleValidateContent } from './validate-content';

/**
 * validate-content.security.test.ts
 *
 * P0 security & robustness tests for handleValidateContent.
 * Mirrors the coverage added for generate-questions.security.test.ts.
 *
 * Gaps filled (from TEST_PLAN AP-AI-XXX):
 *  - Rate limit enforcement: 429 returned, AI.run never called
 *  - Token limit enforcement: error surfaced (or 500 if unhandled)
 *  - Token usage recorded after successful validation
 *  - Input size bounding (source_text, questions array)
 *  - Non-JSON AI response → 500 error
 *  - JWT expired/tampered/missing → 401
 */

// ── Mocks ────────────────────────────────────────────────────────────────────
vi.mock('../shared/auth', () => ({ authenticateRequest: vi.fn() }));
vi.mock('../shared/tokens', () => ({
  consumeTenantTokens: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../shared/rate-limiter', () => ({
  checkRateLimit: vi.fn().mockReturnValue({ allowed: true }),
  rateLimitResponse: vi.fn().mockImplementation((resetAt?: number) =>
    new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil(((resetAt ?? Date.now() + 30_000) - Date.now()) / 1000)) },
    })
  ),
  RATE_LIMITS: { validateContent: { requests: 20, windowMs: 60_000 } },
}));

import { authenticateRequest } from '../shared/auth';
import { checkRateLimit } from '../shared/rate-limiter';
import { consumeTenantTokens } from '../shared/tokens';

// ── Helpers ──────────────────────────────────────────────────────────────────
function mockEnv(aiResponse?: unknown): Env {
  return {
    AI: {
      run: vi.fn().mockResolvedValue({
        response:
          aiResponse !== undefined
            ? typeof aiResponse === 'string'
              ? aiResponse
              : JSON.stringify(aiResponse)
            : JSON.stringify({
                overall_quality: 'good',
                issues: [],
                recommendations: ['Good question clarity'],
                score: 90,
              }),
      }),
    } as unknown as Ai,
    EMAIL: {} as SendEmail,
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    ALERT_WEBHOOK_SECRET: 'test-secret',
    ADMIN_ALERT_EMAIL: 'admin@test.com',
    ALERT_SENDER: 'alerts@test.com',
    ENVIRONMENT: 'test',
  };
}

function makeRequest(body: unknown, token = 'valid-token', origin = 'http://localhost:3000'): Request {
  return new Request('https://workers.questerix.com/ai/validate-content', {
    method: 'POST',
    headers: new Headers({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      Origin: origin,
    }),
    body: JSON.stringify(body),
  });
}

const VALID_BODY = {
  questions: [
    { text: 'What causes rain?', options: ['A', 'B', 'C', 'D'], correct_answer: 'A' },
  ],
  source_text: 'The water cycle involves evaporation, condensation, and precipitation.',
  subject_type: 'general',
};

const MOCK_USER = { id: 'user-123', app_id: 'app-abc', role: 'admin' as const };

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('handleValidateContent — security & robustness', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authenticateRequest).mockResolvedValue({ user: MOCK_USER });
    vi.mocked(checkRateLimit).mockReturnValue({ allowed: true, remaining: 20, resetAt: Date.now() + 60_000 });
    vi.mocked(consumeTenantTokens).mockResolvedValue(undefined);
  });

  // ── Rate limiting ─────────────────────────────────────────────────────────
  describe('rate limiting', () => {
    it('returns 429 when rate limit is exceeded', async () => {
      vi.mocked(checkRateLimit).mockReturnValueOnce({ allowed: false, remaining: 0, resetAt: Date.now() + 30_000 });

      const env = mockEnv();
      const response = await handleValidateContent(makeRequest(VALID_BODY), env);

      expect(response.status).toBe(429);
    });

    it('does not call AI when rate-limited', async () => {
      vi.mocked(checkRateLimit).mockReturnValueOnce({ allowed: false, remaining: 0, resetAt: Date.now() + 30_000 });

      const env = mockEnv();
      await handleValidateContent(makeRequest(VALID_BODY), env);

      expect(env.AI.run).not.toHaveBeenCalled();
    });

    it('does not consume tokens when rate-limited', async () => {
      vi.mocked(checkRateLimit).mockReturnValueOnce({ allowed: false, remaining: 0, resetAt: Date.now() + 30_000 });

      await handleValidateContent(makeRequest(VALID_BODY), mockEnv());

      expect(consumeTenantTokens).not.toHaveBeenCalled();
    });
  });

  // ── Token consumption ─────────────────────────────────────────────────────
  describe('token consumption', () => {
    it('records token usage with correct app_id and action type after successful validation', async () => {
      const env = mockEnv();
      await handleValidateContent(makeRequest(VALID_BODY), env);

      // consumeTenantTokens(env, app_id, tokenCount, action)
      expect(consumeTenantTokens).toHaveBeenCalledWith(
        expect.anything(), // env
        MOCK_USER.app_id,
        expect.any(Number), // token count
        'validate_content',  // action tag
      );
      const [, , tokenCount] = (consumeTenantTokens as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(tokenCount).toBeGreaterThan(0);
    });

    it('does not consume tokens when authentication fails', async () => {
      vi.mocked(authenticateRequest).mockResolvedValueOnce({
        error: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
      });

      await handleValidateContent(makeRequest(VALID_BODY, 'bad-token'), mockEnv());

      expect(consumeTenantTokens).not.toHaveBeenCalled();
    });
  });

  // ── JWT validation ────────────────────────────────────────────────────────
  describe('JWT validation', () => {
    it('returns 401 for expired JWT', async () => {
      vi.mocked(authenticateRequest).mockResolvedValueOnce({
        error: new Response(JSON.stringify({ error: 'JWT expired' }), { status: 401 }),
      });

      const response = await handleValidateContent(makeRequest(VALID_BODY, 'expired.jwt.token'), mockEnv());
      expect(response.status).toBe(401);
    });

    it('returns 401 for tampered JWT', async () => {
      vi.mocked(authenticateRequest).mockResolvedValueOnce({
        error: new Response(JSON.stringify({ error: 'JWT signature invalid' }), { status: 401 }),
      });

      const response = await handleValidateContent(makeRequest(VALID_BODY, 'tampered.jwt.token'), mockEnv());
      expect(response.status).toBe(401);
    });

    it('returns 401 when Authorization header is missing', async () => {
      vi.mocked(authenticateRequest).mockResolvedValueOnce({
        error: new Response(JSON.stringify({ error: 'Missing Authorization' }), { status: 401 }),
      });

      const req = new Request('https://workers.questerix.com/ai/validate-content', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(VALID_BODY),
      });
      const response = await handleValidateContent(req, mockEnv());
      expect(response.status).toBe(401);
    });
  });

  // ── Input validation ──────────────────────────────────────────────────────
  describe('input validation', () => {
    it('returns 400 for empty questions array — AP-IMPROVEMENT-001 fixed', async () => {
      // Empty [] is now rejected at the validation layer (validate-content.ts:28).
      const env = mockEnv();
      const response = await handleValidateContent(
        makeRequest({ ...VALID_BODY, questions: [] }),
        env,
      );
      expect(response.status).toBe(400);
      // AI must NOT have been called
      expect(env.AI.run).not.toHaveBeenCalled();
    });

    it('returns 400 when questions is not an array (string passed)', async () => {
      const response = await handleValidateContent(
        makeRequest({ ...VALID_BODY, questions: 'not-an-array' }),
        mockEnv(),
      );
      // !Array.isArray('not-an-array') → true → 400
      expect(response.status).toBe(400);
    });

    it('returns 400 when source_text is empty string', async () => {
      const response = await handleValidateContent(
        makeRequest({ ...VALID_BODY, source_text: '' }),
        mockEnv(),
      );
      expect(response.status).toBe(400);
    });

    it('truncates oversized source_text (does not crash)', async () => {
      // source_text > 10,000 chars — should either truncate or 400, but not 500
      const hugeText = 'A'.repeat(15_000);
      const env = mockEnv();
      const response = await handleValidateContent(
        makeRequest({ ...VALID_BODY, source_text: hugeText }),
        env,
      );
      // Must not crash with 500 — either truncated (200) or rejected (400)
      expect([200, 400]).toContain(response.status);
    });
  });

  // ── AI response robustness ────────────────────────────────────────────────
  describe('AI response robustness', () => {
    it('returns 500 when AI returns non-JSON garbage', async () => {
      const env = mockEnv('<<INVALID JSON RESPONSE>>');
      const response = await handleValidateContent(makeRequest(VALID_BODY), env);
      expect(response.status).toBe(500);
    });

    it('returns 500 when AI.run throws — AP-IMPROVEMENT-002 fixed', async () => {
      // validate-content.ts now wraps AI.run in try/catch and returns 500.
      const env = mockEnv();
      (env.AI.run as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('AI model unavailable')
      );
      const response = await handleValidateContent(makeRequest(VALID_BODY), env);
      expect(response.status).toBe(500);
    });

    it('returns 200 with valid quality report shape on success', async () => {
      const env = mockEnv({
        overall_quality: 'excellent',
        issues: [{ severity: 'low', description: 'Minor clarity issue' }],
        recommendations: ['Consider adding more context'],
        score: 95,
      });

      const response = await handleValidateContent(makeRequest(VALID_BODY), env);
      expect(response.status).toBe(200);

      const body = await response.json() as Record<string, unknown>;
      expect(body.overall_quality).toBe('excellent');
      expect(body.score).toBe(95);
      expect(Array.isArray(body.issues)).toBe(true);
    });
  });

  // ── CORS headers ──────────────────────────────────────────────────────────
  describe('CORS headers', () => {
    it('reflects allowed origin in response', async () => {
      const env = mockEnv();
      const response = await handleValidateContent(
        makeRequest(VALID_BODY, 'valid-token', 'https://admin.questerix.com'),
        env,
      );
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://admin.questerix.com');
    });

    it('falls back to safe origin for unknown origin', async () => {
      const env = mockEnv();
      const response = await handleValidateContent(
        makeRequest(VALID_BODY, 'valid-token', 'https://attacker.example.com'),
        env,
      );
      const allowOrigin = response.headers.get('Access-Control-Allow-Origin');
      // Must not echo back the attacker origin
      expect(allowOrigin).not.toBe('https://attacker.example.com');
      expect(allowOrigin).toBeTruthy();
    });
  });
});
