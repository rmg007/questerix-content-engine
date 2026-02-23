import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from './shared/types';

// Mock all handlers
vi.mock('./ai/generate-questions', () => ({
  handleGenerateQuestions: vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ questions: [] }), { status: 200 }),
  ),
}));

vi.mock('./ai/validate-content', () => ({
  handleValidateContent: vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ valid: true }), { status: 200 }),
  ),
}));

vi.mock('./email/send-alert', () => ({
  handleSendAlert: vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ message: 'sent' }), { status: 200 }),
  ),
}));

// Import after mocking
import { handleGenerateQuestions } from './ai/generate-questions';
import { handleValidateContent } from './ai/validate-content';
import { handleSendAlert } from './email/send-alert';
import worker from './index';

function mockEnv(): Env {
  return {
    AI: {} as Ai,
    EMAIL: {} as SendEmail,
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-key',
    ALERT_WEBHOOK_SECRET: 'test-secret',
    ADMIN_ALERT_EMAIL: 'admin@test.com',
    ALERT_SENDER: 'alerts@test.com',
    ENVIRONMENT: 'test',
  };
}

function mockCtx(): ExecutionContext {
  return {
    waitUntil: vi.fn(),
    passThroughOnException: vi.fn(),
  } as unknown as ExecutionContext;
}

describe('Router (index.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles CORS preflight with 204', async () => {
    const request = new Request('https://workers.example.com/ai/generate-questions', {
      method: 'OPTIONS',
      headers: new Headers({ Origin: 'http://localhost:3000' }),
    });
    const response = await worker.fetch(request, mockEnv(), mockCtx());
    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
  });

  it('routes POST /ai/generate-questions to handler', async () => {
    const request = new Request('https://workers.example.com/ai/generate-questions', {
      method: 'POST',
      headers: new Headers({ 'Content-Type': 'application/json' }),
    });
    await worker.fetch(request, mockEnv(), mockCtx());
    expect(handleGenerateQuestions).toHaveBeenCalledOnce();
  });

  it('routes POST /ai/validate-content to handler', async () => {
    const request = new Request('https://workers.example.com/ai/validate-content', {
      method: 'POST',
      headers: new Headers({ 'Content-Type': 'application/json' }),
    });
    await worker.fetch(request, mockEnv(), mockCtx());
    expect(handleValidateContent).toHaveBeenCalledOnce();
  });

  it('routes POST /email/send-alert to handler', async () => {
    const request = new Request('https://workers.example.com/email/send-alert', {
      method: 'POST',
      headers: new Headers({ 'Content-Type': 'application/json' }),
    });
    await worker.fetch(request, mockEnv(), mockCtx());
    expect(handleSendAlert).toHaveBeenCalledOnce();
  });

  it('returns health check with routes list', async () => {
    const request = new Request('https://workers.example.com/health', {
      method: 'GET',
    });
    const response = await worker.fetch(request, mockEnv(), mockCtx());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body.environment).toBe('test');
    expect(body.routes).toContain('POST /ai/generate-questions');
    expect(body.routes).toContain('POST /ai/validate-content');
    expect(body.routes).toContain('POST /email/send-alert');
    expect(body.routes).toContain('GET /health');
  });

  it('returns 404 for unknown routes', async () => {
    const request = new Request('https://workers.example.com/unknown', {
      method: 'GET',
    });
    const response = await worker.fetch(request, mockEnv(), mockCtx());
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe('Not found');
  });

  it('rejects wrong HTTP method for AI routes', async () => {
    const request = new Request('https://workers.example.com/ai/generate-questions', {
      method: 'GET',
    });
    const response = await worker.fetch(request, mockEnv(), mockCtx());
    expect(response.status).toBe(404);
    expect(handleGenerateQuestions).not.toHaveBeenCalled();
  });
});
