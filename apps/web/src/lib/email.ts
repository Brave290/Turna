import nodemailer from 'nodemailer';

const APP_NAME = 'Turna';
const SUPPORT_EMAIL = process.env.SMTP_FROM_EMAIL ?? 'support.turna@gmail.com';
const BASE_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://turnaapp.vercel.app').replace(/\/$/, '');
const LOGO_URL = `${BASE_URL}/logo.png`;

/** Rebrand v2 palette — single source for email (matches globals.css / tailwind). */
const C = {
  forest: '#0A1628',
  primary: '#007A65',
  primaryLight: '#7CE8D7',
  muted: '#4A5D73',
  mutedSoft: '#6B7C93',
  border: '#D8E1EC',
  cream: '#F4F7FB',
  white: '#FFFFFF',
  codeOnDark: '#7CE8D7',
  footerLink: '#7CE8D7',
} as const;

// Gmail SMTP via app password
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER ?? 'support.turna@gmail.com',
    pass: (process.env.SMTP_PASS ?? '').replace(/\s+/g, ''),
  },
});

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    const now = new Date();
    const dateHeader = now.toUTCString();
    const messageId = `<turna-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 10)}@turnaapp.vercel.app>`;
    const textPart =
      options.text ??
      options.html.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    await transporter.sendMail({
      from: `"${APP_NAME}" <${SUPPORT_EMAIL}>`,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: options.html,
      text: textPart,
      messageId,
      date: dateHeader,
      replyTo: SUPPORT_EMAIL,
      headers: {
        'X-Entity-Ref-ID': messageId,
        'X-Priority': '3',
        'X-MSMail-Priority': 'Normal',
        'Importance': 'Normal',
        'X-Mailer': 'Turna',
        'List-Unsubscribe': `<mailto:${SUPPORT_EMAIL}?subject=unsubscribe>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    });
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send email';
    console.error('[Email] Failed to send:', message);
    return { success: false, error: message };
  }
}

/** Shared tip so users check Spam/Junk before saying "email never arrived". */
function spamHint(): string {
  return `<p style="margin:20px 0 0;font-size:12px;color:${C.mutedSoft};line-height:1.55;background:${C.cream};border:1px solid ${C.border};border-radius:10px;padding:12px 14px;">
    <strong style="color:${C.forest};">Not in your inbox?</strong>
    Check <strong>Spam</strong>, <strong>Junk</strong>, or <strong>Promotions</strong> — then mark Turna as &ldquo;Not spam&rdquo; so future codes arrive faster.
    Emails come from <strong style="color:${C.forest};">${SUPPORT_EMAIL}</strong>.
  </p>`;
}

function shell(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${C.cream};font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <a href="${BASE_URL}" style="text-decoration:none;display:inline-flex;align-items:center;gap:10px;">
                <img src="${LOGO_URL}" alt="${APP_NAME}" width="40" height="40" style="display:block;width:40px;height:40px;border-radius:10px;" />
                <span style="font-size:22px;font-weight:700;color:${C.forest};letter-spacing:-0.5px;">${APP_NAME}</span>
              </a>
            </td>
          </tr>
          <tr>
            <td style="background:${C.white};border-radius:16px;border:1px solid ${C.border};overflow:hidden;">
              <div style="padding:36px 32px 32px;">
                ${bodyHtml}
              </div>
              <div style="background:${C.forest};padding:20px 32px;text-align:center;">
                <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.72);line-height:1.6;">
                  Questions? Contact <a href="mailto:${SUPPORT_EMAIL}" style="color:${C.footerLink};text-decoration:none;">${SUPPORT_EMAIL}</a><br>
                  &copy; ${new Date().getFullYear()} ${APP_NAME} by Brave hx Technology. All rights reserved.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 0;text-align:center;">
              <p style="margin:0;font-size:11px;color:${C.muted};">
                Save Together. Grow Together.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:${C.primary};color:${C.white};padding:14px 36px;border-radius:12px;font-weight:600;font-size:15px;text-decoration:none;text-align:center;mso-padding-alt:0;">${label}</a>`;
}

function codeBlock(code: string): string {
  return `<div style="background:${C.forest};border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
    <p style="margin:0 0 8px;font-size:13px;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:2px;">Your verification code</p>
    <p style="margin:0;font-size:40px;font-weight:800;color:${C.codeOnDark};letter-spacing:12px;font-family:'Courier New',monospace;">${code}</p>
  </div>`;
}

export const emailTemplates = {
  otpCode(_email: string, code: string, displayName?: string) {
    return {
      subject: `Your ${APP_NAME} verification code`,
      html: shell('Verification code', `
        <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:${C.forest};">Verify your email</h1>
        <p style="margin:0 0 4px;font-size:15px;color:${C.muted};line-height:1.6;">Hi ${displayName ?? 'there'}, use this code to finish signing up:</p>
        ${codeBlock(code)}
        <p style="margin:8px 0 0;font-size:13px;color:${C.muted};line-height:1.5;">This code expires in 5 minutes. If you didn't request this, ignore this email — your account is safe.</p>
        ${spamHint()}
      `),
      text: `Your ${APP_NAME} verification code is: ${code}\n\nExpires in 5 minutes. If you didn't request this, ignore this email.\n\nNot in your inbox? Check Spam/Junk/Promotions for mail from ${SUPPORT_EMAIL}.`,
    };
  },

  passwordReset(_email: string, token: string) {
    const resetUrl = `${BASE_URL}/auth/reset-password?token=${token}`;
    return {
      subject: `Reset your ${APP_NAME} password`,
      html: shell('Reset your password', `
        <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:${C.forest};">Reset your password</h1>
        <p style="margin:0 0 24px;font-size:15px;color:${C.muted};line-height:1.6;">Click the button below to choose a new password for your ${APP_NAME} account.</p>
        ${button(resetUrl, 'Reset Password')}
        <p style="margin:24px 0 0;font-size:13px;color:${C.muted};line-height:1.5;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
        ${spamHint()}
      `),
      text: `Reset your ${APP_NAME} password:\n\n${resetUrl}\n\nThis link expires in 1 hour.\n\nNot in your inbox? Check Spam/Junk/Promotions for mail from ${SUPPORT_EMAIL}.`,
    };
  },

  circleInvitation(_email: string, circleName: string, inviterName: string, token: string) {
    const acceptUrl = `${BASE_URL}/circles/join?token=${token}`;
    return {
      subject: `You've been invited to "${circleName}" on ${APP_NAME}`,
      html: shell('Circle invitation', `
        <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:${C.forest};">Circle Invitation</h1>
        <p style="margin:0 0 24px;font-size:15px;color:${C.muted};line-height:1.6;">
          <strong style="color:${C.forest};">${inviterName}</strong> has invited you to join
          <strong style="color:${C.forest};">"${circleName}"</strong>.
        </p>
        ${button(acceptUrl, 'Accept Invitation')}
        <p style="margin:24px 0 0;font-size:13px;color:${C.muted};line-height:1.5;">This invitation expires in 7 days.</p>
        ${spamHint()}
      `),
      text: `${inviterName} invited you to join "${circleName}" on ${APP_NAME}.\n\nAccept: ${acceptUrl}\n\nNot in your inbox? Check Spam/Junk/Promotions for mail from ${SUPPORT_EMAIL}.`,
    };
  },

  contributionReminder(_email: string, circleName: string, amount: string, dueDate: string) {
    return {
      subject: `Contribution due for "${circleName}"`,
      html: shell('Contribution due', `
        <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:${C.forest};">Contribution Due</h1>
        <p style="margin:0 0 24px;font-size:15px;color:${C.muted};line-height:1.6;">
          Your contribution of <strong style="color:${C.primary};">${amount}</strong> for
          <strong style="color:${C.forest};">"${circleName}"</strong> is due on
          <strong style="color:${C.forest};">${dueDate}</strong>.
        </p>
        ${button(`${BASE_URL}/`, 'View Circle')}
        ${spamHint()}
      `),
      text: `Your contribution of ${amount} for "${circleName}" is due on ${dueDate}.`,
    };
  },

  payoutNotification(_email: string, circleName: string, amount: string, recipientName: string) {
    return {
      subject: `Payout initiated for "${circleName}"`,
      html: shell('Payout initiated', `
        <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:${C.forest};">Payout Initiated</h1>
        <p style="margin:0 0 24px;font-size:15px;color:${C.muted};line-height:1.6;">
          A payout of <strong style="color:${C.primary};">${amount}</strong> to
          <strong style="color:${C.forest};">${recipientName}</strong> has been initiated for
          <strong style="color:${C.forest};">"${circleName}"</strong>.
        </p>
        ${button(`${BASE_URL}/`, 'View Details')}
        ${spamHint()}
      `),
      text: `Payout of ${amount} to ${recipientName} initiated for "${circleName}".`,
    };
  },

  welcome(_email: string, displayName: string) {
    return {
      subject: `Welcome to ${APP_NAME} — Let's get started`,
      html: shell('Welcome to Turna', `
        <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:${C.forest};">You're in, ${displayName}!</h1>
        <p style="margin:0 0 24px;font-size:15px;color:${C.muted};line-height:1.6;">
          Your ${APP_NAME} account is ready. Create your first savings circle or join one with an invite.
        </p>
        ${button(`${BASE_URL}/`, 'Open Turna')}
        <p style="margin:24px 0 0;font-size:13px;color:${C.muted};line-height:1.5;">
          Need help? Reply to this email or contact ${SUPPORT_EMAIL}.
        </p>
        ${spamHint()}
      `),
      text: `Welcome to ${APP_NAME}, ${displayName}! Your account is ready.\n\nNot in your inbox? Check Spam/Junk/Promotions for mail from ${SUPPORT_EMAIL}.`,
    };
  },

  moneyEvent(
    _email: string,
    title: string,
    amount: string,
    circleName: string,
    detail?: string
  ) {
    return {
      subject: `${title} — ${amount} · ${circleName}`,
      html: shell(title, `
        <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:${C.forest};">${title}</h1>
        <p style="margin:0 0 4px;font-size:15px;color:${C.muted};line-height:1.6;">
          Circle: <strong style="color:${C.forest};">${circleName}</strong>
        </p>
        <p style="margin:16px 0;font-size:28px;font-weight:700;color:${C.primary};">${amount}</p>
        ${detail ? `<p style="margin:0 0 20px;font-size:13px;color:${C.muted};line-height:1.5;">${detail}</p>` : ''}
        ${button(`${BASE_URL}/`, 'View Payments')}
        ${spamHint()}
      `),
      text: `${title}: ${amount} for ${circleName}${detail ? `. ${detail}` : ''}`,
    };
  },

  moneyDigest(_email: string, events: string[], displayName?: string) {
    const items = events
      .map(
        (e) =>
          `<li style="padding:10px 0;border-bottom:1px solid #E8EEF5;font-size:14px;color:${C.forest};">${e}</li>`
      )
      .join('');
    const day = new Date().toLocaleDateString('en-NG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    return {
      subject: `Your ${APP_NAME} activity digest — ${events.length} money event${events.length === 1 ? '' : 's'}`,
      html: shell('Money activity digest', `
        <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:${C.forest};">Activity digest</h1>
        <p style="margin:0 0 4px;font-size:15px;color:${C.muted};line-height:1.6;">
          Hi ${displayName ?? 'there'}, here's what moved on ${day}:
        </p>
        <ul style="margin:20px 0;padding:0;list-style:none;">
          ${items}
        </ul>
        ${button(`${BASE_URL}/`, 'Open Payments')}
        <p style="margin:24px 0 0;font-size:13px;color:${C.muted};line-height:1.5;">
          You get one digest per day when money moves — not one email per swipe.
        </p>
        ${spamHint()}
      `),
      text: `Activity digest (${day}):\n\n${events.join('\n')}`,
    };
  },

  /** Platform-wide broadcast from the in-app admin dashboard. */
  adminBroadcast(title: string, message: string) {
    const safeTitle = title.replace(/[<>]/g, '');
    const paragraphs = message
      .split(/\n{2,}/)
      .map(
        (line) =>
          `<p style="margin:0 0 14px;font-size:15px;color:${C.muted};line-height:1.6;">${line
            .replace(/[<>]/g, '')
            .replace(/\n/g, '<br>')}</p>`
      )
      .join('');
    return {
      subject: safeTitle,
      html: shell(safeTitle, `
        <h1 style="margin:0 0 12px;font-size:24px;font-weight:700;color:${C.forest};">${safeTitle}</h1>
        ${paragraphs}
        ${button(`${BASE_URL}/`, 'Open Turna')}
        <p style="margin:24px 0 0;font-size:13px;color:${C.muted};line-height:1.5;">
          This is a message from the Turna team. Need help? Reply to this email or contact ${SUPPORT_EMAIL}.
        </p>
      `),
      text: `${safeTitle}\n\n${message}`,
    };
  },
};
