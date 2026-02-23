import { describe, expect, it } from 'vitest';
import { AI_MODELS, getModelForSubject } from './types';

describe('AI_MODELS', () => {
  it('has math model pointing to DeepSeek R1', () => {
    expect(AI_MODELS.math).toBe('@cf/deepseek-ai/deepseek-r1-distill-qwen-32b');
  });

  it('has default model pointing to Llama 3.1 8B', () => {
    expect(AI_MODELS.default).toBe('@cf/meta/llama-3.1-8b-instruct');
  });
});

describe('getModelForSubject', () => {
  it('returns DeepSeek R1 for math subjects', () => {
    expect(getModelForSubject('math')).toBe(AI_MODELS.math);
  });

  it('returns Llama 8B for english subjects', () => {
    expect(getModelForSubject('english')).toBe(AI_MODELS.default);
  });

  it('returns Llama 8B for general subjects', () => {
    expect(getModelForSubject('general')).toBe(AI_MODELS.default);
  });

  it('returns Llama 8B when subject_type is undefined', () => {
    expect(getModelForSubject(undefined)).toBe(AI_MODELS.default);
  });

  it('returns Llama 8B for unknown subject types', () => {
    expect(getModelForSubject('science')).toBe(AI_MODELS.default);
  });
});
