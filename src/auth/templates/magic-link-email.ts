interface MagicLinkEmailParams {
  propertyName?: string | null;
  propertyCode: string;
  link: string;
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const buildMagicLinkEmail = ({
  propertyName,
  propertyCode,
  link,
}: MagicLinkEmailParams) => {
  const rawName = propertyName ? propertyName.trim() : null;
  const safeName = rawName ? escapeHtml(rawName) : null;
  const safeCode = escapeHtml(propertyCode);
  const safeLink = escapeHtml(link);

  const humanLabelHtml = safeName || `Property ID ${safeCode}`;
  const humanLabelText = rawName || `Property ID ${propertyCode}`;
  const subject = `${humanLabelText} • TimeTracker magic link`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${subject}</title>
</head>
<body style="margin:0;background-color:#f8fafc;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0b1d13;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f8fafc;padding:32px 0;">
    <tr>
      <td align="center" style="padding:0 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;background-color:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 16px 48px rgba(22,162,73,0.18);">
          <tr>
            <td style="padding:36px 28px;text-align:center;background:linear-gradient(135deg,#16a249,#35e375);color:#ffffff;">
              <div style="font-size:14px;letter-spacing:0.12em;text-transform:uppercase;opacity:0.85;">TimeTracker</div>
              <h1 style="margin:16px 0 4px;font-size:28px;font-weight:700;">Magic link ready</h1>
              <p style="margin:0;font-size:16px;font-weight:500;">${safeName ? `${safeName} kiosk` : 'Your kiosk'} is waiting.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 12px;">
              <p style="margin:0 0 18px;font-size:16px;line-height:1.6;">Tap the button below on the device you requested from, or copy the URL into a browser. This link expires in <strong>15 minutes</strong> and can be used once.</p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#1f2937;">
                <span style="display:inline-block;padding:10px 18px;border-radius:999px;background-color:#ecfdf5;font-weight:600;font-size:14px;color:#047857;">Property ID: ${safeCode}</span>
              </p>
              <div style="margin:32px 0;text-align:center;">
                <a href="${safeLink}"
                  style="display:inline-block;padding:14px 28px;border-radius:999px;background:linear-gradient(135deg,#16a249,#35e375);color:#ffffff;font-weight:600;font-size:16px;text-decoration:none;box-shadow:0 12px 24px rgba(22,162,73,0.25);">
                  Open magic link
                </a>
              </div>
              <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#4b5563;">If the button does not work, copy and paste this URL:</p>
              <p style="margin:0;padding:12px 16px;background-color:#f1f5f9;border-radius:16px;font-size:13px;line-height:1.6;word-break:break-word;">
                <a href="${safeLink}" style="color:#047857;text-decoration:none;">${safeLink}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 32px;background-color:#f1f5f9;color:#4b5563;font-size:12px;line-height:1.6;text-align:center;">
              <p style="margin:0 0 10px;">You received this email because a login was requested for <strong>${humanLabelHtml}</strong>.</p>
              <p style="margin:0;">If you did not initiate this request, ignore this message or alert your administrator.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `TimeTracker magic link\n\n${humanLabelText}\nProperty ID: ${propertyCode}\n\nOpen the link: ${link}\n\nThe link expires in 15 minutes and may only be used once. If you did not request it, you can ignore this email.`;

  return { subject, html, text };
};
