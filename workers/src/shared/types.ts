/**
 * Cloudflare Workers environment bindings.
 */
export interface Env {
  AI: Ai;
  EMAIL: SendEmail;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  ALERT_WEBHOOK_SECRET: string;
  ADMIN_ALERT_EMAIL: string;
  ALERT_SENDER: string;
  ENVIRONMENT: string;
}

export interface AuthenticatedUser {
  id: string;
  app_id: string;
  role: 'admin' | 'super_admin' | 'student';
}

export interface GenerationRequest {
  text: string;
  subject_type?: 'math' | 'english' | 'general';
  difficulty_distribution: {
    easy: number;
    medium: number;
    hard: number;
  };
  custom_instructions?: string;
}

export interface ValidationRequest {
  questions: unknown[];
  source_text: string;
  subject_type?: 'math' | 'english' | 'general';
  rules?: {
    name: string;
    rule_type: string;
    params: unknown;
  }[];
}

export interface AlertRequest {
  record: {
    id: string;
    platform: string;
    error_type: string;
    error_message: string;
    extra_context: {
      severity?: string;
      alert_needed?: string;
      [key: string]: unknown;
    };
  };
  type: string;
}

/**
 * Model routing: DeepSeek R1 for math (multi-step reasoning),
 * Llama 3.1 8B for everything else (cost-effective).
 */
export const AI_MODELS = {
  math: '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b',
  default: '@cf/meta/llama-3.1-8b-instruct',
} as const;

export type AiModelId = (typeof AI_MODELS)[keyof typeof AI_MODELS];

export function getModelForSubject(subjectType?: string): AiModelId {
  if (subjectType === 'math') {
    return AI_MODELS.math;
  }
  return AI_MODELS.default;
}
