import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../shared/types';
import { handleGenerateQuestions } from './generate-questions';

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
        response: JSON.stringify([
          {
            text: 'What causes evaporation?',
            question_type: 'multiple_choice',
            difficulty: 'easy',
            options: ['Sun', 'Moon', 'Stars', 'Wind'],
            correct_answer: 'Sun',
          },
        ]),
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
  return new Request('https://example.com/ai/generate-questions', {
    method: 'POST',
    headers: new Headers({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    }),
    body: JSON.stringify(body),
  });
}

const validBody = {
  text: 'The water cycle begins when the sun heats water.',
  subject_type: 'general',
  difficulty_distribution: { easy: 1, medium: 1, hard: 1 },
};

describe('handleGenerateQuestions', () => {
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

    const response = await handleGenerateQuestions(makeRequest(validBody), mockEnv());
    expect(response.status).toBe(401);
  });

  it('rejects requests with missing text field', async () => {
    const response = await handleGenerateQuestions(
      makeRequest({ difficulty_distribution: { easy: 1, medium: 1, hard: 1 } }),
      mockEnv(),
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('text');
  });

  it('rejects requests with missing difficulty_distribution', async () => {
    const response = await handleGenerateQuestions(
      makeRequest({ text: 'Some text' }),
      mockEnv(),
    );
    expect(response.status).toBe(400);
  });

  it('calls AI with correct model for general subjects', async () => {
    const env = mockEnv();
    await handleGenerateQuestions(makeRequest(validBody), env);

    expect(env.AI.run).toHaveBeenCalledWith(
      '@cf/meta/llama-3.1-8b-instruct',
      expect.objectContaining({
        max_tokens: expect.any(Number),
        temperature: expect.any(Number),
      }),
    );
  });

  it('calls AI with DeepSeek R1 for math subjects', async () => {
    const env = mockEnv();
    const mathBody = { ...validBody, subject_type: 'math' };
    await handleGenerateQuestions(makeRequest(mathBody), env);

    expect(env.AI.run).toHaveBeenCalledWith(
      '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b',
      expect.anything(),
    );
  });

  it('returns generated questions with metadata on success', async () => {
    const env = mockEnv();
    const response = await handleGenerateQuestions(makeRequest(validBody), env);
    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.questions).toBeDefined();
    expect(body.metadata).toBeDefined();
    expect(body.metadata.model).toBe('@cf/meta/llama-3.1-8b-instruct');
    expect(body.metadata.subject_type).toBe('general');
    expect(body.metadata.generation_time_ms).toBeTypeOf('number');
    expect(body.metadata.token_count).toBeTypeOf('number');
  });

  it('returns CORS headers', async () => {
    const response = await handleGenerateQuestions(makeRequest(validBody), mockEnv());
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeDefined();
  });
});
