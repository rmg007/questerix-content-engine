import { EmailMessage } from 'cloudflare:email';
import { createMimeMessage } from 'mimetext';
import { errorResponse, jsonResponse } from '../shared/http';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '../shared/rate-limiter';
import type { AlertRequest, Env } from '../shared/types';
import { criticalAlertTemplate } from './templates';

/**
 * Send critical alert email via Cloudflare Email Workers.
 * Authenticated via webhook secret (same as existing critical-alert edge function).
 */
export async function handleSendAlert(
  request: Request,
  env: Env,
): Promise<Response> {
  // Rate limit
  const ip = request.headers.get('CF-Connecting-IP') || 'webhook';
  const rl = checkRateLimit(`alert:${ip}`, RATE_LIMITS.sendAlert);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  // Webhook secret authentication (matches existing critical-alert pattern)
  const incomingSecret = request.headers.get('x-webhook-secret');
  if (!env.ALERT_WEBHOOK_SECRET) {
    console.error('ALERT_WEBHOOK_SECRET is not set in environment.');
    return errorResponse('Configuration error', 500, request);
  }
  if (!timingSafeEqual(incomingSecret || '', env.ALERT_WEBHOOK_SECRET)) {
    console.warn('Unauthorized alert attempt detected.');
    return errorResponse('Unauthorized', 401, request);
  }

  // Parse payload
  let payload: AlertRequest;
  try {
    payload = (await request.json()) as AlertRequest;
  } catch {
    return errorResponse('Invalid JSON', 400, request);
  }

  const { record, type } = payload;

  if (!record || !type) {
    return errorResponse(
      'Invalid payload: expected {record: {error_type, error_message, platform, ...}, type: "INSERT"}',
      400,
      request,
    );
  }

  // Check if it's a critical error
  const isCritical =
    record.error_type?.toLowerCase().includes('critical') ||
    record.extra_context?.severity === 'critical' ||
    record.extra_context?.alert_needed === 'true';

  if (type !== 'INSERT' || !isCritical) {
    return jsonResponse({ message: 'No alert needed' }, 200, request);
  }

  // Build email
  const template = criticalAlertTemplate({
    platform: record.platform,
    errorType: record.error_type,
    errorMessage: record.error_message,
    context: record.extra_context,
    timestamp: new Date().toISOString(),
  });

  const adminEmail = env.ADMIN_ALERT_EMAIL;
  const senderEmail = env.ALERT_SENDER;

  if (!adminEmail || !senderEmail) {
    console.error('ADMIN_ALERT_EMAIL or ALERT_SENDER not configured.');
    // Still log the alert even if email fails
    console.log(`🚨 CRITICAL ERROR: [${record.platform}] ${record.error_type}: ${record.error_message}`);
    return jsonResponse({ message: 'Alert logged (email not configured)', id: record.id }, 200, request);
  }

  try {
    const msg = createMimeMessage();
    msg.setSender({ name: 'Questerix Alerts', addr: senderEmail });
    msg.setRecipient(adminEmail);
    msg.setSubject(template.subject);
    msg.addMessage({ contentType: 'text/html', data: template.html });
    msg.addMessage({ contentType: 'text/plain', data: template.text });

    const emailMessage = new EmailMessage(senderEmail, adminEmail, msg.asRaw());
    await env.EMAIL.send(emailMessage);

    console.log(`✅ Alert email sent for [${record.platform}] ${record.error_type}`);
    return jsonResponse({ message: 'Alert sent', id: record.id }, 200, request);
  } catch (err) {
    console.error('Failed to send alert email:', err);
    // Log the alert even if email send fails
    console.log(`🚨 CRITICAL ERROR (email failed): [${record.platform}] ${record.error_type}: ${record.error_message}`);
    return jsonResponse(
      { message: 'Alert logged (email delivery failed)', id: record.id, error: String(err) },
      200,
      request,
    );
  }
}

/**
 * Constant-time comparison for strings to prevent timing attacks.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
