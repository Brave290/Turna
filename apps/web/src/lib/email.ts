import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.SMTP_FROM_EMAIL ?? 'Turna <noreply@turna.name.ng>';
const APP_NAME = 'Turna';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    return { success: true };
  } catch (error: any) {
    console.error('[Email] Failed to send:', error.message);
    return { success: false, error: error.message };
  }
}

export function emailTemplates {
  emailConfirmation(email: string, displayName: string, token: string) {
    const confirmUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?token=${token}`;
    return {
      subject: `Confirm your ${APP_NAME} account`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin:0;padding:0;background:#0F0F0F;font-family:Inter,-apple-system,BlinkMacSystemFont,sans-serif;">
          <div style="max-width:480px;margin:0 auto;padding:40px 20px;">
            <div style="text-align:center;margin-bottom:32px;">
              <h1 style="font-size:32px;font-weight:700;color:#FFFFFF;margin:0;">
                Turna<span style="color:#B45309;">.</span>
              </h1>
            </div>
            <div style="background:#1A1A1A;border-radius:16px;padding:32px;border:1px solid #333333;">
              <h2 style="font-size:20px;font-weight:600;color:#FFFFFF;margin:0 0 16px 0;">
                Welcome to ${APP_NAME}!
              </h2>
              <p style="font-size:14px;color:#A3A3A3;line-height:1.6;margin:0 0 24px 0;">
                Hi ${displayName}, confirm your email to start using ${APP_NAME}.
              </p>
              <a href="${confirmUrl}" style="display:inline-block;background:#B45309;color:#FFFFFF;padding:12px 32px;border-radius:9999px;font-weight:600;text-decoration:none;font-size:14px;">
                Confirm Email
              </a>
              <p style="font-size:12px;color:#A3A3A3;margin:24px 0 0 0;">
                This link expires in 24 hours. If you didn't create this account, ignore this email.
              </p>
            </div>
            <p style="font-size:11px;color:#666666;text-align:center;margin-top:24px;">
              Built by Akanji Mus'ab • Brave hx Technology • Founda Technologies
            </p>
          </div>
        </body>
        </html>
      `,
    };
  },

  passwordReset(email: string, token: string) {
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/update-password?token=${token}`;
    return {
      subject: `Reset your ${APP_NAME} password`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin:0;padding:0;background:#0F0F0F;font-family:Inter,-apple-system,BlinkMacSystemFont,sans-serif;">
          <div style="max-width:480px;margin:0 auto;padding:40px 20px;">
            <div style="text-align:center;margin-bottom:32px;">
              <h1 style="font-size:32px;font-weight:700;color:#FFFFFF;margin:0;">
                Turna<span style="color:#B45309;">.</span>
              </h1>
            </div>
            <div style="background:#1A1A1A;border-radius:16px;padding:32px;border:1px solid #333333;">
              <h2 style="font-size:20px;font-weight:600;color:#FFFFFF;margin:0 0 16px 0;">
                Reset your password
              </h2>
              <p style="font-size:14px;color:#A3A3A3;line-height:1.6;margin:0 0 24px 0;">
                Click the button below to reset your password.
              </p>
              <a href="${resetUrl}" style="display:inline-block;background:#B45309;color:#FFFFFF;padding:12px 32px;border-radius:9999px;font-weight:600;text-decoration:none;font-size:14px;">
                Reset Password
              </a>
              <p style="font-size:12px;color:#A3A3A3;margin:24px 0 0 0;">
                This link expires in 1 hour. If you didn't request this, ignore this email.
              </p>
            </div>
            <p style="font-size:11px;color:#666666;text-align:center;margin-top:24px;">
              Built by Akanji Mus'ab • Brave hx Technology • Founda Technologies
            </p>
          </div>
        </body>
        </html>
      `,
    };
  },

  circleInvitation(email: string, circleName: string, inviterName: string, token: string) {
    const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL}/circles/join?token=${token}`;
    return {
      subject: `You've been invited to "${circleName}" on ${APP_NAME}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin:0;padding:0;background:#0F0F0F;font-family:Inter,-apple-system,BlinkMacSystemFont,sans-serif;">
          <div style="max-width:480px;margin:0 auto;padding:40px 20px;">
            <div style="text-align:center;margin-bottom:32px;">
              <h1 style="font-size:32px;font-weight:700;color:#FFFFFF;margin:0;">
                Turna<span style="color:#B45309;">.</span>
              </h1>
            </div>
            <div style="background:#1A1A1A;border-radius:16px;padding:32px;border:1px solid #333333;">
              <h2 style="font-size:20px;font-weight:600;color:#FFFFFF;margin:0 0 16px 0;">
                Circle Invitation
              </h2>
              <p style="font-size:14px;color:#A3A3A3;line-height:1.6;margin:0 0 24px 0;">
                ${inviterName} has invited you to join "<strong style="color:#FFFFFF;">${circleName}</strong>".
              </p>
              <a href="${acceptUrl}" style="display:inline-block;background:#B45309;color:#FFFFFF;padding:12px 32px;border-radius:9999px;font-weight:600;text-decoration:none;font-size:14px;">
                Accept Invitation
              </a>
              <p style="font-size:12px;color:#A3A3A3;margin:24px 0 0 0;">
                This invitation expires in 72 hours.
              </p>
            </div>
            <p style="font-size:11px;color:#666666;text-align:center;margin-top:24px;">
              Built by Akanji Mus'ab • Brave hx Technology • Founda Technologies
            </p>
          </div>
        </body>
        </html>
      `,
    };
  },

  contributionReminder(email: string, circleName: string, amount: string, dueDate: string) {
    return {
      subject: `Contribution due for "${circleName}"`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin:0;padding:0;background:#0F0F0F;font-family:Inter,-apple-system,BlinkMacSystemFont,sans-serif;">
          <div style="max-width:480px;margin:0 auto;padding:40px 20px;">
            <div style="text-align:center;margin-bottom:32px;">
              <h1 style="font-size:32px;font-weight:700;color:#FFFFFF;margin:0;">
                Turna<span style="color:#B45309;">.</span>
              </h1>
            </div>
            <div style="background:#1A1A1A;border-radius:16px;padding:32px;border:1px solid #333333;">
              <h2 style="font-size:20px;font-weight:600;color:#FFFFFF;margin:0 0 16px 0;">
                Contribution Due
              </h2>
              <p style="font-size:14px;color:#A3A3A3;line-height:1.6;margin:0 0 24px 0;">
                Your contribution of <strong style="color:#D97706;">${amount}</strong> for "<strong style="color:#FFFFFF;">${circleName}</strong>" is due on <strong style="color:#FFFFFF;">${dueDate}</strong>.
              </p>
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display:inline-block;background:#B45309;color:#FFFFFF;padding:12px 32px;border-radius:9999px;font-weight:600;text-decoration:none;font-size:14px;">
                View Circle
              </a>
            </div>
            <p style="font-size:11px;color:#666666;text-align:center;margin-top:24px;">
              Built by Akanji Mus'ab • Brave hx Technology • Founda Technologies
            </p>
          </div>
        </body>
        </html>
      `,
    };
  },

  payoutNotification(email: string, circleName: string, amount: string, recipientName: string) {
    return {
      subject: `Payout initiated for "${circleName}"`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin:0;padding:0;background:#0F0F0F;font-family:Inter,-apple-system,BlinkMacSystemFont,sans-serif;">
          <div style="max-width:480px;margin:0 auto;padding:40px 20px;">
            <div style="text-align:center;margin-bottom:32px;">
              <h1 style="font-size:32px;font-weight:700;color:#FFFFFF;margin:0;">
                Turna<span style="color:#B45309;">.</span>
              </h1>
            </div>
            <div style="background:#1A1A1A;border-radius:16px;padding:32px;border:1px solid #333333;">
              <h2 style="font-size:20px;font-weight:600;color:#FFFFFF;margin:0 0 16px 0;">
                Payout Initiated
              </h2>
              <p style="font-size:14px;color:#A3A3A3;line-height:1.6;margin:0 0 24px 0;">
                A payout of <strong style="color:#22C55E;">${amount}</strong> to <strong style="color:#FFFFFF;">${recipientName}</strong> has been initiated for "<strong style="color:#FFFFFF;">${circleName}</strong>".
              </p>
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display:inline-block;background:#B45309;color:#FFFFFF;padding:12px 32px;border-radius:9999px;font-weight:600;text-decoration:none;font-size:14px;">
                View Details
              </a>
            </div>
            <p style="font-size:11px;color:#666666;text-align:center;margin-top:24px;">
              Built by Akanji Mus'ab • Brave hx Technology • Founda Technologies
            </p>
          </div>
        </body>
        </html>
      `,
    };
  },
}