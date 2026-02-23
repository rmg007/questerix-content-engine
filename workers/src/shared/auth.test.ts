import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authenticateRequest } from './auth';
import type { Env } from './types';

function mockEnv(overrides?: Partial<Env>): Env {
  return {
    AI: {} as Ai,
    EMAIL: {} as SendEmail,
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
    ALERT_WEBHOOK_SECRET: 'test-webhook-secret',
    ADMIN_ALERT_EMAIL: 'admin@test.com',
    ALERT_SENDER: 'alerts@test.com',
    ENVIRONMENT: 'test',
    ...overrides,
  };
}

function makeRequest(token?: string): Request {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return new Request('https://example.com/test', { headers });
}

describe('authenticateRequest', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects requests without Authorization header', async () => {
    const result = await authenticateRequest(makeRequest(), mockEnv());
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error.status).toBe(401);
      const body = await result.error.json();
      expect(body.error).toBe('Missing authorization header');
    }
  });

  it('rejects invalid tokens (Supabase returns non-200)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Unauthorized', { status: 401 }),
    );

    const result = await authenticateRequest(makeRequest('bad-token'), mockEnv());
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error.status).toBe(401);
      const body = await result.error.json();
      expect(body.error).toBe('Invalid or expired token');
    }
  });

  it('rejects when profile fetch fails', async () => {
    // Auth succeeds
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'user-123' }), { status: 200 }))
      // Profile fetch fails
      .mockResolvedValueOnce(new Response('Server error', { status: 500 }));

    const result = await authenticateRequest(makeRequest('valid-token'), mockEnv());
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error.status).toBe(403);
    }
  });

  it('rejects when no profile found', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'user-123' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));

    const result = await authenticateRequest(makeRequest('valid-token'), mockEnv());
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error.status).toBe(403);
    }
  });

  it('rejects student role users', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'user-123' }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ app_id: 'app-1', role: 'student' }]), { status: 200 }),
      );

    const result = await authenticateRequest(makeRequest('valid-token'), mockEnv());
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error.status).toBe(403);
      const body = await result.error.json();
      expect(body.error).toBe('Access denied');
    }
  });

  it('accepts admin users and returns correct profile', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'user-123' }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ app_id: 'app-abc', role: 'admin' }]), { status: 200 }),
      );

    const result = await authenticateRequest(makeRequest('valid-token'), mockEnv());
    expect('user' in result).toBe(true);
    if ('user' in result) {
      expect(result.user).toEqual({
        id: 'user-123',
        app_id: 'app-abc',
        role: 'admin',
      });
    }
  });

  it('accepts super_admin users', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'user-456' }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ app_id: 'app-xyz', role: 'super_admin' }]), { status: 200 }),
      );

    const result = await authenticateRequest(makeRequest('valid-token'), mockEnv());
    expect('user' in result).toBe(true);
    if ('user' in result) {
      expect(result.user.role).toBe('super_admin');
    }
  });

  it('calls Supabase auth endpoint with correct headers', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'user-123' }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ app_id: 'app-1', role: 'admin' }]), { status: 200 }),
      );

    const env = mockEnv();
    await authenticateRequest(makeRequest('my-jwt'), env);

    // First call: auth verification
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://test.supabase.co/auth/v1/user',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer my-jwt',
          apikey: 'test-service-key',
        }),
      }),
    );
  });
});
