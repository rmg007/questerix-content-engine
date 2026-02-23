import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../shared/types';
import { handleValidateContent } from './validate-content';

// Mock the auth module
vi.mock('../shared/auth', () => ({
  authenticateRequest: vi.fn(),
}));

// Mock the tokens module
vi.mock('../shared/tokens', () => ({
  consumeTenantTokens: vi.fn().mockResolvedValue(undefined),
}));

import { authenticateRequest } from '../shared/auth';

function mockEnv(): Env {
  return {
    AI: {
      run: vi.fn().mockResolvedValue({
        response: JSON.stringify({
          overall_quality: 'good',
          issues: [],
          recommendations: ['Add more distractors'],
          score: 85,
        }),
      }),
    } as unknown as Ai,
    EMAIL: {} as SendEmail,
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
    ALERT_WEBHOOK_SECRET: 'test-webhook-secret',
    ADMIN_ALERT_EMAIL: 'admin@test.com',
    ALERT_SENDER: 'alerts@test.com',
    ENVIRONMENT: 'test',
  };
}

function makeRequest(body: unknown, token = 'valid-token'): Request {
  return new Request('https://example.com/ai/validate-content', {
    method: 'POST',
    headers: new Headers({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    }),
    body: JSON.stringify(body),
  });
}

const validBody = {
  questions: [
    { text: 'What causes rain?', options: ['A', 'B', 'C', 'D'], correct_answer: 'A' },
  ],
  source_text: 'The water cycle involves evaporation, condensation, and precipitation.',
  subject_type: 'general',
};

describe('handleValidateContent', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(authenticateRequest).mockResolvedValue({
      user: { id: 'user-123', app_id: 'app-abc', role: 'admin' },
    });
  });

  it('rejects unauthenticated requests', async () => {
    vi.mocked(authenticateRequest).mockResolvedValueOnce({
      error: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    });

    const response = await handleValidateContent(makeRequest(validBody), mockEnv());
    expect(response.status).toBe(401);
  });

  it('rejects requests with missing questions field', async () => {
    const response = await handleValidateContent(
      makeRequest({ source_text: 'Some text' }),
      mockEnv(),
    );
    expect(response.status).toBe(400);
  });

  it('rejects requests with missing source_text field', async () => {
    const response = await handleValidateContent(
      makeRequest({ questions: [{ text: 'Q1' }] }),
      mockEnv(),
    );
    expect(response.status).toBe(400);
  });

  it('always uses DeepSeek R1 model regardless of subject', async () => {
    const env = mockEnv();
    await handleValidateContent(makeRequest(validBody), env);

    // Validate-content always uses DeepSeek R1 for reasoning
    expect(env.AI.run).toHaveBeenCalledWith(
      '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b',
      expect.anything(),
    );
  });

  it('uses DeepSeek R1 even for general subject type', async () => {
    const env = mockEnv();
    const body = { ...validBody, subject_type: 'general' };
    await handleValidateContent(makeRequest(body), env);

    expect(env.AI.run).toHaveBeenCalledWith(
      '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b',
      expect.anything(),
    );
  });

  it('returns validation report with metadata on success', async () => {
    const env = mockEnv();
    const response = await handleValidateContent(makeRequest(validBody), env);
    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.overall_quality).toBe('good');
    expect(body.metadata).toBeDefined();
    expect(body.metadata.model).toBe('@cf/deepseek-ai/deepseek-r1-distill-qwen-32b');
    expect(body.metadata.validation_time_ms).toBeTypeOf('number');
    expect(body.metadata.token_count).toBeTypeOf('number');
  });
});
