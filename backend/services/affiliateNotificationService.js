import { sendEmail } from './emailService.js';

function getMainSiteUrl() {
  const configured = String(process.env.SITE_URL || process.env.APP_URL || '').trim();
  if (configured) return configured.replace(/\/$/, '');
  return `http://localhost:${process.env.PORT || 3001}`;
}

function getAffiliatePanelUrl() {
  const configured = String(process.env.AFFILIATE_PANEL_URL || '').trim();
  if (configured) return configured.replace(/\/$/, '');
  return getMainSiteUrl();
}

export async function notifyAffiliateApproved({ name, email, referralCode }) {
  const loginUrl = `${getAffiliatePanelUrl()}/affiliate/login`;
  const subject = 'Your JowaBuzz Affiliate Account Has Been Approved';
  const text = [
    `Hello ${name || 'Affiliate'},`,
    '',
    'Great news! Your JowaBuzz affiliate application has been approved.',
    referralCode ? `Your referral code: ${referralCode}` : null,
    '',
    `You can now sign in to your affiliate panel here: ${loginUrl}`,
    '',
    'Thank you for partnering with JowaBuzz.',
  ]
    .filter(Boolean)
    .join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a;">
      <h2 style="color:#16a34a;">Affiliate Account Approved</h2>
      <p>Hello ${name || 'Affiliate'},</p>
      <p>Great news! Your JowaBuzz affiliate application has been approved.</p>
      ${referralCode ? `<p><strong>Referral code:</strong> ${referralCode}</p>` : ''}
      <p>
        <a href="${loginUrl}" style="display:inline-block;padding:10px 16px;background:#22c55e;color:#ffffff;text-decoration:none;border-radius:8px;">
          Open Affiliate Panel
        </a>
      </p>
      <p style="color:#64748b;font-size:13px;">If the button does not work, open this link: ${loginUrl}</p>
    </div>
  `;

  return sendEmail({ to: email, subject, text, html });
}
