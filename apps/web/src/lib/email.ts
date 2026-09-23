import nodemailer from 'nodemailer';

const APP_NAME = 'Turna';
const SUPPORT_EMAIL = process.env.SMTP_FROM_EMAIL ?? 'support.turna@gmail.com';

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
    await transporter.sendMail({
      from: `"${APP_NAME}" <${SUPPORT_EMAIL}>`,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send email';
    console.error('[Email] Failed to send:', message);
    return { success: false, error: message };
  }
}

// ─── Rebrand v2 email shell ───
function shell(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#F4F7FB;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F7FB;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <div style="display:inline-flex;align-items:center;gap:8px;">
                <span style="display:inline-block;width:32px;height:32px;border-radius:8px;background:#00C2A8;color:#fff;font-weight:800;font-size:18px;line-height:32px;text-align:center;">T</span>
                <span style="font-size:22px;font-weight:700;color:#0A1628;letter-spacing:-0.5px;">Turna</span>
              </div>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background:#FFFFFF;border-radius:16px;border:1px solid #D8E1EC;overflow:hidden;">
              <div style="padding:36px 32px 32px;">
                ${bodyHtml}
              </div>
              <div style="background:#0A1628;padding:20px 32px;text-align:center;">
                <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.55);line-height:1.6;">
                  Questions? Contact <a href="mailto:support.turna@gmail.com" style="color:#5EEAD4;text-decoration:none;">support.turna@gmail.com</a><br>
                  &copy; ${new Date().getFullYear()} Turna by Brave hx Technology. All rights reserved.
                </p>
              </div>
            </td>
          </tr>
          <!-- Spacer -->
          <tr>
            <td style="padding:20px 0;text-align:center;">
              <p style="margin:0;font-size:11px;color:#6B7C93;">
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
  return `<a href="${href}" style="display:inline-block;background:#00C2A8;color:#FFFFFF;padding:14px 36px;border-radius:12px;font-weight:600;font-size:15px;text-decoration:none;text-align:center;mso-padding-alt:0;">${label}</a>`;
}

function codeBlock(code: string): string {
  return `<div style="background:#0A1628;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
    <p style="margin:0 0 8px;font-size:13px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:2px;">Your verification code</p>
    <p style="margin:0;font-size:40px;font-weight:800;color:#5EEAD4;letter-spacing:12px;font-family:'Courier New',monospace;">${code}</p>
  </div>`;
}

export const emailTemplates = {
  emailConfirmation(email: string, displayName: string, token: string) {
    const confirmUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?token=${token}`;
    return {
      subject: `Confirm your ${APP_NAME} account`,
      html: shell('Confirm your account', `
        <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#0A1628;">Welcome to ${APP_NAME}!</h1>
        <p style="margin:0 0 24px;font-size:15px;color:#6B7C93;line-height:1.6;">Hi ${displayName}, confirm your email to start using ${APP_NAME}.</p>
        ${button(confirmUrl, 'Confirm Email')}
        <p style="margin:24px 0 0;font-size:13px;color:#6B7C93;line-height:1.5;">This link expires in 24 hours. If you didn't create this account, you can safely ignore this email.</p>
      `),
    };
  },

  otpCode(email: string, code: string, displayName?: string) {
    return {
      subject: `${code} is your ${APP_NAME} verification code`,
      html: shell('Verification code', `
        <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#0A1628;">Verify your email</h1>
        <p style="margin:0 0 4px;font-size:15px;color:#6B7C93;line-height:1.6;">Hi ${displayName ?? 'there'}, use this code to finish signing up:</p>
        ${codeBlock(code)}
        <p style="margin:8px 0 0;font-size:13px;color:#6B7C93;line-height:1.5;">This code does not expire. If you didn't request this, ignore this email — your account is safe.</p>
      `),
      text: `Your ${APP_NAME} verification code is: ${code}\n\nThis code does not expire. If you didn't request this, ignore this email.`,
    };
  },

  passwordReset(email: string, token: string) {
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/update-password?token=${token}`;
    return {
      subject: `Reset your ${APP_NAME} password`,
      html: shell('Reset your password', `
        <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#0A1628;">Reset your password</h1>
        <p style="margin:0 0 24px;font-size:15px;color:#6B7C93;line-height:1.6;">Click the button below to choose a new password for your ${APP_NAME} account.</p>
        ${button(resetUrl, 'Reset Password')}
        <p style="margin:24px 0 0;font-size:13px;color:#6B7C93;line-height:1.5;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
      `),
    };
  },

  circleInvitation(email: string, circleName: string, inviterName: string, token: string) {
    const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL}/circles/join?token=${token}`;
    return {
      subject: `You've been invited to "${circleName}" on ${APP_NAME}`,
      html: shell('Circle invitation', `
        <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#0A1628;">Circle Invitation</h1>
        <p style="margin:0 0 24px;font-size:15px;color:#6B7C93;line-height:1.6;">
          <strong style="color:#0A1628;">${inviterName}</strong> has invited you to join
          <strong style="color:#0A1628;">"${circleName}"</strong>.
        </p>
        ${button(acceptUrl, 'Accept Invitation')}
        <p style="margin:24px 0 0;font-size:13px;color:#6B7C93;line-height:1.5;">This invitation expires in 7 days.</p>
      `),
    };
  },

  contributionReminder(email: string, circleName: string, amount: string, dueDate: string) {
    return {
      subject: `Contribution due for "${circleName}"`,
      html: shell('Contribution due', `
        <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#0A1628;">Contribution Due</h1>
        <p style="margin:0 0 24px;font-size:15px;color:#6B7C93;line-height:1.6;">
          Your contribution of <strong style="color:#00C2A8;">${amount}</strong> for
          <strong style="color:#0A1628;">"${circleName}"</strong> is due on
          <strong style="color:#0A1628;">${dueDate}</strong>.
        </p>
        ${button(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard`, 'View Circle')}
      `),
    };
  },

  payoutNotification(email: string, circleName: string, amount: string, recipientName: string) {
    return {
      subject: `Payout initiated for "${circleName}"`,
      html: shell('Payout initiated', `
        <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#0A1628;">Payout Initiated</h1>
        <p style="margin:0 0 24px;font-size:15px;color:#6B7C93;line-height:1.6;">
          A payout of <strong style="color:#00C2A8;">${amount}</strong> to
          <strong style="color:#0A1628;">${recipientName}</strong> has been initiated for
          <strong style="color:#0A1628;">"${circleName}"</strong>.
        </p>
        ${button(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard`, 'View Details')}
      `),
    };
  },

  welcome(email: string, displayName: string) {
    return {
      subject: `Welcome to ${APP_NAME} — Let's get started`,
      html: shell('Welcome to Turna', `
        <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#0A1628;">You're in, ${displayName}!</h1>
        <p style="margin:0 0 24px;font-size:15px;color:#6B7C93;line-height:1.6;">
          Your ${APP_NAME} account is ready. Create your first savings circle or join one with an invite.
        </p>
        ${button(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard`, 'Go to Dashboard')}
        <p style="margin:24px 0 0;font-size:13px;color:#6B7C93;line-height:1.5;">
          Need help? Reply to this email or contact support.turna@gmail.com.
        </p>
      `),
    };
  },
};
