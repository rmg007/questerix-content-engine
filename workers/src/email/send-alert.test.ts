import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../shared/types';
import { handleSendAlert } from './send-alert';

// Mock rate limiter to prevent cross-test contamination
vi.mock('../shared/rate-limiter', () => ({
  checkRateLimit: vi.fn().mockReturnValue({ allowed: true, remaining: 5, resetAt: Date.now() + 60000 }),
  RATE_LIMITS: { sendAlert: { maxRequests: 5, windowMs: 60000 } },
  rateLimitResponse: vi.fn(),
}));

function mockEnv(overrides?: Partial<Env>): Env {
  return {
    AI: {} as Ai,
    EMAIL: { send: vi.fn().mockResolvedValue(undefined) } as unknown as SendEmail,
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
    ALERT_WEBHOOK_SECRET: 'correct-secret',
    ADMIN_ALERT_EMAIL: 'admin@test.com',
    ALERT_SENDER: 'alerts@test.com',
    ENVIRONMENT: 'test',
    ...overrides,
  };
}

function makeAlertRequest(
  body: unknown,
  webhookSecret?: string,
): Request {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (webhookSecret) headers.set('x-webhook-secret', webhookSecret);
  return new Request('https://example.com/email/send-alert', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

const validCriticalPayload = {
  type: 'INSERT',
  record: {
    id: 'err-001',
    platform: 'admin-panel',
    error_type: 'CRITICAL_AUTH_FAILURE',
    error_message: 'Test critical error',
    extra_context: { severity: 'critical' },
  },
};

const nonCriticalPayload = {
  type: 'INSERT',
  record: {
    id: 'err-002',
    platform: 'admin-panel',
    error_type: 'warning_slow_query',
    error_message: 'Query took 2s',
    extra_context: { severity: 'warning' },
  },
};

import { checkRateLimit } from '../shared/rate-limiter';

describe('handleSendAlert', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkRateLimit).mockReturnValue({ allowed: true, remaining: 5, resetAt: Date.now() + 60000 });
  });

  it('rejects requests without webhook secret', async () => {
    const response = await handleSendAlert(
      makeAlertRequest(validCriticalPayload),
      mockEnv(),
    );
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('rejects requests with wrong webhook secret', async () => {
    const response = await handleSendAlert(
      makeAlertRequest(validCriticalPayload, 'wrong-secret'),
      mockEnv(),
    );
    expect(response.status).toBe(401);
  });

  it('returns 500 when ALERT_WEBHOOK_SECRET is not configured', async () => {
    const response = await handleSendAlert(
      makeAlertRequest(validCriticalPayload, 'any'),
      mockEnv({ ALERT_WEBHOOK_SECRET: '' }),
    );
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Configuration error');
  });

  it('returns 400 for malformed payload (missing record)', async () => {
    const response = await handleSendAlert(
      makeAlertRequest({ type: 'INSERT' }, 'correct-secret'),
      mockEnv(),
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Invalid payload');
  });

  it('returns 400 for malformed payload (missing type)', async () => {
    const response = await handleSendAlert(
      makeAlertRequest({ record: { id: '1' } }, 'correct-secret'),
      mockEnv(),
    );
    expect(response.status).toBe(400);
  });

  it('skips non-critical alerts (no alert needed)', async () => {
    const response = await handleSendAlert(
      makeAlertRequest(nonCriticalPayload, 'correct-secret'),
      mockEnv(),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.message).toBe('No alert needed');
  });

  it('skips non-INSERT types', async () => {
    const payload = { ...validCriticalPayload, type: 'UPDATE' };
    const response = await handleSendAlert(
      makeAlertRequest(payload, 'correct-secret'),
      mockEnv(),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.message).toBe('No alert needed');
  });

  it('detects critical by error_type containing "critical"', async () => {
    const payload = {
      type: 'INSERT',
      record: {
        id: 'err-003',
        platform: 'student-app',
        error_type: 'critical_sync_failure',
        error_message: 'Sync failed',
        extra_context: {},
      },
    };
    const env = mockEnv({ ADMIN_ALERT_EMAIL: '', ALERT_SENDER: '' });
    const response = await handleSendAlert(
      makeAlertRequest(payload, 'correct-secret'),
      env,
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    // Detected as critical, but email not configured → logged
    expect(body.message).toContain('Alert logged');
  });

  it('detects critical by extra_context.alert_needed', async () => {
    const payload = {
      type: 'INSERT',
      record: {
        id: 'err-004',
        platform: 'admin-panel',
        error_type: 'auth_error',
        error_message: 'Login failed',
        extra_context: { alert_needed: 'true' },
      },
    };
    const env = mockEnv({ ADMIN_ALERT_EMAIL: '', ALERT_SENDER: '' });
    const response = await handleSendAlert(
      makeAlertRequest(payload, 'correct-secret'),
      env,
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.message).toContain('Alert logged');
  });

  it('gracefully degrades when email config is missing', async () => {
    const env = mockEnv({ ADMIN_ALERT_EMAIL: '', ALERT_SENDER: '' });
    const response = await handleSendAlert(
      makeAlertRequest(validCriticalPayload, 'correct-secret'),
      env,
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.message).toBe('Alert logged (email not configured)');
    expect(body.id).toBe('err-001');
  });
});
