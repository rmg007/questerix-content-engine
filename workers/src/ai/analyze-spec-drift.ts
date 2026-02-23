import { authenticateRequest } from '../shared/auth';
import { errorResponse, jsonResponse } from '../shared/http';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '../shared/rate-limiter';
import { consumeTenantTokens } from '../shared/tokens';
import type { Env } from '../shared/types';

export interface SpecDriftRequest {
  spec: string;        // The original spec/design document
  implementation: string;  // The current implementation (code or description)
  context?: string;    // Optional extra context
}

/**
 * Analyze drift between a specification and its implementation.
 * Uses DeepSeek R1 (32B) for deep reasoning — replaces the Supabase
 * `analyze-spec-drift` and `generate-test-from-spec` Edge Functions (Gemini).
 */
export async function handleAnalyzeSpecDrift(request: Request, env: Env): Promise<Response> {
  // Rate limit
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const rl = checkRateLimit(`drift:${ip}`, RATE_LIMITS.generateQuestions);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  // Auth (admin+)
  const auth = await authenticateRequest(request, env);
  if ('error' in auth) return auth.error;

  const body = (await request.json()) as SpecDriftRequest;

  if (!body.spec || !body.implementation) {
    return errorResponse('spec and implementation are required', 400, request);
  }

  // DeepSeek R1 for spec drift — needs chain-of-thought reasoning
  const model = '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b';
  const prompt = buildDriftPrompt(
    body.spec.substring(0, 4000),
    body.implementation.substring(0, 4000),
    body.context?.substring(0, 1000),
  );

  const startTime = Date.now();
  const aiResponse = await (env.AI as any).run(model, {
    prompt,
    max_tokens: 2048,
    temperature: 0.0,
  });

  const analysisTime = Date.now() - startTime;
  const generatedText =
    typeof aiResponse === 'string'
      ? aiResponse
      : (aiResponse as { response?: string }).response || '';

  // Parse JSON object from AI response
  const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return errorResponse('AI could not produce a drift analysis', 500, request);
  }

  let driftReport: unknown;
  try {
    driftReport = JSON.parse(jsonMatch[0]);
  } catch {
    return errorResponse('AI returned malformed drift analysis', 500, request);
  }

  const estimatedTokens = Math.ceil((prompt.length + generatedText.length) / 4);
  await consumeTenantTokens(env, auth.user.app_id, estimatedTokens, 'analyze_spec_drift');

  return jsonResponse(
    {
      drift_report: driftReport,
      metadata: {
        model,
        analysis_time_ms: analysisTime,
        token_count: estimatedTokens,
      },
    },
    200,
    request,
  );
}

function buildDriftPrompt(spec: string, implementation: string, context?: string): string {
  return `You are a software quality engineer performing a specification drift analysis.

Compare the SPECIFICATION against the IMPLEMENTATION and identify any divergences.

<specification>
${spec}
</specification>

<implementation>
${implementation}
</implementation>

${context ? `<context>\n${context}\n</context>\n` : ''}

Analyze the drift and return a JSON object with this structure:
{
  "drift_score": 0-100,
  "summary": "brief overall assessment",
  "findings": [
    {
      "type": "missing" | "deviation" | "extra" | "ambiguous",
      "severity": "critical" | "high" | "medium" | "low",
      "description": "what the drift is",
      "spec_excerpt": "relevant spec text",
      "impl_excerpt": "relevant implementation text",
      "recommendation": "how to resolve"
    }
  ],
  "compliant_areas": ["area1", "area2"],
  "recommended_tests": ["test description 1", "test description 2"]
}

Return ONLY valid JSON. No markdown, no preamble.

{`;
}
