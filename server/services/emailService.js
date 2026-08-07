const { Resend } = require('resend');
const config = require('../config/env');

const resend = new Resend(config.resend.apiKey);

function buildPasswordResetEmail(resetLink) {
  return `
  <div style="background:#F7FAFC;padding:40px 16px;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:480px;margin:0 auto;background:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #D9E2EC;">

      <div style="background:#102A43;padding:28px 32px;text-align:center;">
        <span style="color:#F7FAFC;font-size:20px;font-weight:700;letter-spacing:0.2px;">MediSphere</span>
      </div>

      <div style="padding:32px;">
        <h1 style="margin:0 0 12px;color:#172B4D;font-size:20px;">Reset your password</h1>
        <p style="margin:0 0 24px;color:#627D98;font-size:15px;line-height:1.6;">
          We received a request to reset the password for your MediSphere account. Click the button below to choose a new one. This link expires in 1 hour.
        </p>

        <div style="text-align:center;margin:32px 0;">
          <a href="${resetLink}" style="background:#0F766E;color:#F7FAFC;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:600;display:inline-block;">
            Reset password
          </a>
        </div>

        <p style="margin:0 0 8px;color:#627D98;font-size:13px;line-height:1.6;">
          If you didn't request this, you can safely ignore this email — your password won't be changed.
        </p>

        <p style="margin:24px 0 0;color:#A9BCCF;font-size:12px;line-height:1.5;word-break:break-all;">
          Or paste this link into your browser:<br>${resetLink}
        </p>
      </div>

    </div>
  </div>`;
}

async function sendPasswordResetEmail(toEmail, resetLink) {
  await resend.emails.send({
    from: config.resend.fromEmail,
    to: toEmail,
    subject: 'Reset your MediSphere password',
    html: buildPasswordResetEmail(resetLink)
  });
}

module.exports = { sendPasswordResetEmail };