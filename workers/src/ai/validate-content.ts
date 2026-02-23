import { authenticateRequest } from '../shared/auth';
import { errorResponse, jsonResponse } from '../shared/http';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '../shared/rate-limiter';
import { consumeTenantTokens } from '../shared/tokens';
import type { Env, ValidationRequest } from '../shared/types';
import { getModelForSubject } from '../shared/types';

/**
 * Validate AI-generated questions against source material.
 * Uses the same model routing as generation for consistency.
 */
export async function handleValidateContent(
  request: Request,
  env: Env,
): Promise<Response> {
  // Rate limit by IP
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const rl = checkRateLimit(`val:${ip}`, RATE_LIMITS.validateContent);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  // Authenticate
  const auth = await authenticateRequest(request, env);
  if ('error' in auth) return auth.error;

  // Parse request
  const body = (await request.json()) as ValidationRequest;

  if (!body.questions || !Array.isArray(body.questions) || body.questions.length === 0) {
    return errorResponse('questions array is required and must not be empty', 400, request);
  }

  if (!body.source_text || typeof body.source_text !== 'string') {
    return errorResponse('source_text is required', 400, request);
  }

  // Use a stronger model for validation — always use DeepSeek R1 for
  // its chain-of-thought reasoning regardless of subject
  const model = getModelForSubject('math');
  const prompt = buildValidationPrompt(body.questions, body.source_text, body.rules || []);

  let aiResponse: unknown;
  const startTime = Date.now();
  try {
    // Type assertion needed: @cloudflare/workers-types may lag behind available models
    aiResponse = await (env.AI as any).run(model, {
      prompt,
      max_tokens: 4096,
      temperature: 0.1,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI model unavailable';
    return errorResponse(`AI inference failed: ${message}`, 500, request);
  }

  const duration = Date.now() - startTime;
  const validationText =
    typeof aiResponse === 'string'
      ? aiResponse
      : (aiResponse as { response?: string }).response || '';

  // Parse JSON response
  const jsonMatch = validationText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return errorResponse('Failed to process AI response', 500, request);
  }

  let validationReport: unknown;
  try {
    validationReport = JSON.parse(jsonMatch[0]);
  } catch {
    return errorResponse('AI returned invalid JSON', 500, request);
  }

  // Consume tenant tokens
  const estimatedTokens = Math.ceil((prompt.length + validationText.length) / 4);
  await consumeTenantTokens(env, auth.user.app_id, estimatedTokens, 'validate_content');

  return jsonResponse(
    {
      ...(validationReport as Record<string, unknown>),
      metadata: {
        model,
        validation_time_ms: duration,
        token_count: estimatedTokens,
      },
    },
    200,
    request,
  );
}

function buildValidationPrompt(
  questions: unknown[],
  sourceText: string,
  rules: unknown[],
): string {
  return `You are an expert educational content auditor. Your task is to validate AI-generated questions against source material and specific quality rules.

**Source Material:**
${sourceText.substring(0, 5000)}

**Generated Questions to Validate:**
${JSON.stringify(questions, null, 2)}

**Validation Rules:**
${rules.length > 0 ? JSON.stringify(rules, null, 2) : 'Default: Accuracy, Safety, and Formatting'}

**Evaluation Criteria:**
1. **Accuracy**: Are the questions factually correct based ONLY on the source?
2. **Pedagogy**: Is the difficulty distribution actually appropriate?
3. **Safety**: Any sensitive, biased, or inappropriate content?
4. **Formatting**: Does it strictly follow the required schema?

**Output Format (JSON Object ONLY):**
{
  "overall_score": 0.0 to 1.0,
  "status": "approved" | "flagged" | "rejected",
  "consensus_reached": boolean,
  "findings": [
    {
      "question_id": number (index),
      "score": 0.0 to 1.0,
      "issues": string[],
      "suggestions": string
    }
  ],
  "summary": "Executive summary of validation"
}

Return ONLY the JSON object.`;
}
