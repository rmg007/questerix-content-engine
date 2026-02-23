import type { Env } from './types';

/**
 * Consume tenant AI tokens via Supabase RPC.
 * Logs but does not throw on failure — quota enforcement is non-blocking.
 */
export async function consumeTenantTokens(
  env: Env,
  appId: string,
  tokensUsed: number,
  operation: string,
): Promise<void> {
  try {
    await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/consume_tenant_tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        p_app_id: appId,
        p_tokens_used: tokensUsed,
        p_operation: operation,
      }),
    });
  } catch (err) {
    console.error('Quota enforcement error:', err);
    // Log but don't fail — quota exceeded should be checked before generation
  }
}
