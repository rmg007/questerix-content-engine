/**
 * HTML email templates for alert notifications.
 */

interface AlertData {
  platform: string;
  errorType: string;
  errorMessage: string;
  context: Record<string, unknown>;
  timestamp: string;
}

export function criticalAlertTemplate(data: AlertData): { subject: string; html: string; text: string } {
  const subject = `🚨 [${data.platform.toUpperCase()}] Critical: ${data.errorType}`;

  const contextRows = Object.entries(data.context)
    .filter(([key]) => key !== 'severity' && key !== 'alert_needed')
    .map(([key, value]) => `<tr><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px;">${key}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;">${String(value)}</td></tr>`)
    .join('\n');

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f3f4f6;">
  <div style="max-width:600px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background:#dc2626;padding:20px 24px;">
      <h1 style="margin:0;color:#fff;font-size:18px;font-weight:600;">🚨 Critical Error Detected</h1>
      <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">${data.timestamp}</p>
    </div>
    <!-- Body -->
    <div style="padding:24px;">
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px;width:120px;">Platform</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;font-weight:600;">${data.platform}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px;">Error Type</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;font-weight:600;color:#dc2626;">${data.errorType}</td>
        </tr>
      </table>
      <!-- Message -->
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin-bottom:16px;">
        <p style="margin:0;font-size:14px;color:#991b1b;line-height:1.5;">${data.errorMessage}</p>
      </div>
      ${contextRows ? `
      <!-- Context -->
      <h3 style="margin:0 0 8px;font-size:14px;color:#374151;">Additional Context</h3>
      <table style="width:100%;border-collapse:collapse;">
        ${contextRows}
      </table>` : ''}
    </div>
    <!-- Footer -->
    <div style="padding:16px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">Questerix Alert System — This is an automated notification.</p>
    </div>
  </div>
</body>
</html>`;

  const text = `CRITICAL ERROR [${data.platform}]
Type: ${data.errorType}
Message: ${data.errorMessage}
Time: ${data.timestamp}
Context: ${JSON.stringify(data.context, null, 2)}`;

  return { subject, html, text };
}
