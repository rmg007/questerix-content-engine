import { handleAnalyzeSpecDrift } from './ai/analyze-spec-drift';
import { handleGenerateQuestions } from './ai/generate-questions';
import { handleParseImportPrompt } from './ai/parse-import-prompt';
import { handleValidateContent } from './ai/validate-content';
import { handleSendAlert } from './email/send-alert';
import { corsPreflightResponse, errorResponse, jsonResponse } from './shared/http';
import type { Env } from './shared/types';

/**
 * Questerix Cloudflare Workers entry point.
 * Routes requests to AI and Email handlers.
 *
 * AI Routes (all use Workers AI — no external API keys):
 *   POST /ai/generate-questions    — Llama 3.1 8B / DeepSeek R1 (math)
 *   POST /ai/validate-content      — DeepSeek R1 (chain-of-thought validation)
 *   POST /ai/parse-import-prompt   — Llama 3.1 8B (structured extraction)
 *   POST /ai/analyze-spec-drift    — DeepSeek R1 (deep reasoning)
 *
 * Email Routes:
 *   POST /email/send-alert         — Cloudflare Email Routing
 *
 * Health:
 *   GET  /health
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return corsPreflightResponse(request);
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // AI Routes
      if (path === '/ai/generate-questions' && request.method === 'POST') {
        return await handleGenerateQuestions(request, env);
      }

      if (path === '/ai/validate-content' && request.method === 'POST') {
        return await handleValidateContent(request, env);
      }

      if (path === '/ai/parse-import-prompt' && request.method === 'POST') {
        return await handleParseImportPrompt(request, env);
      }

      if (path === '/ai/analyze-spec-drift' && request.method === 'POST') {
        return await handleAnalyzeSpecDrift(request, env);
      }

      // Email Routes
      if (path === '/email/send-alert' && request.method === 'POST') {
        return await handleSendAlert(request, env);
      }

      // Health check
      if (path === '/health') {
        return jsonResponse(
          {
            status: 'ok',
            environment: env.ENVIRONMENT,
            timestamp: new Date().toISOString(),
            routes: [
              'POST /ai/generate-questions',
              'POST /ai/validate-content',
              'POST /ai/parse-import-prompt',
              'POST /ai/analyze-spec-drift',
              'POST /email/send-alert',
              'GET /health',
            ],
          },
          200,
          request,
        );
      }

      return errorResponse('Not found', 404, request);
    } catch (err) {
      console.error('Unhandled worker error:', err);
      return errorResponse('Internal server error', 500, request);
    }
  },
} satisfies ExportedHandler<Env>;
