import type { Env } from './types';

/**
 * Check if platform-wide AI generation limits are nearing.
 * Logs an alert to Supabase if thresholds are exceeded.
 */
export async function checkGlobalAiQuota(env: Env): Promise<void> {
  try {
    await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/check_global_ai_quota`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({}),
    });
  } catch (err) {
    console.error('Global quota check failed:', err);
  }
}
