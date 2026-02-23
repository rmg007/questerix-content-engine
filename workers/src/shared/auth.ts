import type { AuthenticatedUser, Env } from './types';

/**
 * Verify a Supabase JWT and return the authenticated user's profile.
 * Rejects non-admin users (only admin/super_admin can use AI endpoints).
 */
export async function authenticateRequest(
  request: Request,
  env: Env,
): Promise<{ user: AuthenticatedUser } | { error: Response }> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return {
      error: new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    };
  }

  const token = authHeader.replace('Bearer ', '');

  // Verify JWT via Supabase Auth API
  const authResponse = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    },
  });

  if (!authResponse.ok) {
    return {
      error: new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    };
  }

  const userData = (await authResponse.json()) as { id: string };

  // Fetch profile for app_id and role
  const profileResponse = await fetch(
    `${env.SUPABASE_URL}/rest/v1/profiles?id=eq.${userData.id}&select=app_id,role`,
    {
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    },
  );

  if (!profileResponse.ok) {
    return {
      error: new Response(JSON.stringify({ error: 'Access denied' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    };
  }

  const profiles = (await profileResponse.json()) as Array<{
    app_id: string;
    role: string;
  }>;

  if (!profiles.length || !profiles[0].app_id) {
    return {
      error: new Response(JSON.stringify({ error: 'Access denied' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    };
  }

  const profile = profiles[0];

  if (profile.role !== 'admin' && profile.role !== 'super_admin') {
    return {
      error: new Response(JSON.stringify({ error: 'Access denied' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    };
  }

  return {
    user: {
      id: userData.id,
      app_id: profile.app_id,
      role: profile.role as 'admin' | 'super_admin',
    },
  };
}
