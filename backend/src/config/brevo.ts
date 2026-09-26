import { BrevoClient } from "@getbrevo/brevo";
import { env } from "./env.js";

// Initialize Brevo client singleton
let brevoClient: BrevoClient | null = null;

export function getBrevoClient(): BrevoClient {
  if (!brevoClient) {
    if (!env.BREVO_API_KEY) {
      throw new Error("BREVO_API_KEY is not configured. Email verification will not work.");
    }
    brevoClient = new BrevoClient({ apiKey: env.BREVO_API_KEY });
  }
  return brevoClient;
}

/**
 * Send a transactional email via Brevo.
 */
export async function sendTransactionalEmail(options: {
  to: { email: string; name?: string };
  subject: string;
  htmlContent: string;
}): Promise<void> {
  const client = getBrevoClient();

  try {
    await client.transactionalEmails.sendTransacEmail({
      sender: {
        email: env.BREVO_SENDER_EMAIL,
        name: env.BREVO_SENDER_NAME,
      },
      to: [
        {
          email: options.to.email,
          name: options.to.name,
        },
      ],
      subject: options.subject,
      htmlContent: options.htmlContent,
    });
  } catch (err: any) {
    const errorBody = err?.body || err?.response?.data || {};
    const message =
      typeof errorBody === "object" && errorBody?.message
        ? errorBody.message
        : err?.message || "Failed to send email via Brevo";
    console.error("⚠️ Brevo Transactional Email Error:", message);
    throw new Error(message);
  }
}

/**
 * Send the email-verification link to a newly registered user.
 */
export async function sendVerificationEmail(
  recipientEmail: string,
  recipientName: string,
  verificationToken: string
): Promise<{ verificationUrl: string }> {
  const verificationUrl = `${env.CORS_ORIGIN}/verify-email?token=${verificationToken}`;

  console.log(`\n======================================================`);
  console.log(`✉️ [ZUNO EMAIL VERIFICATION LINK]`);
  console.log(`   To:      ${recipientEmail} (${recipientName})`);
  console.log(`   URL:     ${verificationUrl}`);
  console.log(`======================================================\n`);

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#0f0f23;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f0f23;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#1a1a3e 0%,#16213e 100%);border-radius:16px;border:1px solid rgba(99,102,241,0.2);overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:40px 40px 20px 40px;text-align:center;">
              <div style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:12px;padding:12px 16px;margin-bottom:20px;">
                <span style="color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-0.5px;">⚡ Zuno</span>
              </div>
              <h1 style="color:#ffffff;font-size:24px;font-weight:700;margin:16px 0 8px 0;letter-spacing:-0.3px;">
                Verify Your Email
              </h1>
              <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0;">
                Hey <strong style="color:#c7d2fe;">${recipientName}</strong>, welcome to Zuno! 🎉<br/>
                Please confirm your email address to get started.
              </p>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding:10px 40px 20px 40px;text-align:center;">
              <a href="${verificationUrl}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 40px;border-radius:12px;letter-spacing:0.3px;">
                ✅ Verify My Email
              </a>
            </td>
          </tr>

          <!-- Alternative Link -->
          <tr>
            <td style="padding:0 40px 20px 40px;text-align:center;">
              <p style="color:#64748b;font-size:12px;line-height:1.5;margin:0;">
                Or copy and paste this link in your browser:
              </p>
              <p style="color:#818cf8;font-size:11px;word-break:break-all;margin:8px 0 0 0;background:rgba(99,102,241,0.1);padding:10px 14px;border-radius:8px;border:1px solid rgba(99,102,241,0.15);">
                ${verificationUrl}
              </p>
            </td>
          </tr>

          <!-- Expiry Notice -->
          <tr>
            <td style="padding:0 40px 30px 40px;text-align:center;">
              <p style="color:#f59e0b;font-size:11px;margin:0;background:rgba(245,158,11,0.08);padding:8px 14px;border-radius:8px;border:1px solid rgba(245,158,11,0.15);">
                ⏳ This link expires in <strong>24 hours</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid rgba(99,102,241,0.15);text-align:center;">
              <p style="color:#475569;font-size:11px;line-height:1.5;margin:0;">
                If you didn't create a Zuno account, please ignore this email.<br/>
                &copy; ${new Date().getFullYear()} Zuno Chat — Real-time messaging, evolved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  await sendTransactionalEmail({
    to: { email: recipientEmail, name: recipientName },
    subject: "✅ Verify your Zuno account",
    htmlContent,
  });

  return { verificationUrl };
}
