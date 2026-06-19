// utils/mailer.ts
import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

const RESEND_API_KEY = process.env.RESEND_API_KEY as string;
const APP_NAME = process.env.APP_NAME || "Medzink";

// Initialize Resend
const resend = new Resend(RESEND_API_KEY);

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: {
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }[];
}

export async function sendMail(
  options: SendMailOptions,
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!RESEND_API_KEY) {
      throw new Error("Missing RESEND_API_KEY in environment variables");
    }

    const { data, error } = await resend.emails.send({
      // ⚠️ IMPORTANT: Apna verified domain yahan daalo
      // Note: Agar Hostinger me DNS verify nahi hua h, toh temporarily isko 'onboarding@resend.dev' kar dena testing k liye.
      from: `${APP_NAME} <otp@medzink.in>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments,
    });

    if (error) {
      console.error("Resend API Error:", error);
      return { success: false, error: error.message };
    }

    console.log(`✉️ Email OTP sent successfully via Resend to ${options.to}`);
    return { success: true };
  } catch (err: any) {
    console.error("Failed to send email via Resend:", err.message);
    return { success: false, error: err.message };
  }
}

export function wrapEmailTemplate(title: string, bodyHtml: string): string {
  return `
  <!DOCTYPE html>
  <html>
    <head><meta charset="utf-8" /></head>
    <body style="margin:0;padding:0;background-color:#f4f6f8;font-family:Arial, sans-serif;">
      <table role="presentation" width="100%" style="padding:24px 0;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">
              <tr>
                <td style="background-color:#0ea5e9;padding:20px 24px;">
                  <h1 style="color:#ffffff;font-size:20px;margin:0;">${APP_NAME}</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:24px;">
                  <h2 style="font-size:18px;color:#0f172a;margin-top:0;">${title}</h2>
                  <div style="font-size:14px;color:#334155;line-height:1.6;">${bodyHtml}</div>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 24px;background-color:#f8fafc;font-size:12px;color:#94a3b8;text-align:center;">
                  &copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;
}

export default { sendMail, wrapEmailTemplate };
