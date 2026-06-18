// utils/mailer.ts
import nodemailer, { Transporter } from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const GMAIL_USER = process.env.GMAIL_USER as string;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD as string;
const APP_NAME = process.env.APP_NAME || "MediGo";

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) return transporter;

  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    throw new Error(
      "Missing GMAIL_USER or GMAIL_APP_PASSWORD in environment variables",
    );
  }

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
  });

  return transporter;
}

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
    const t = getTransporter();
    await t.sendMail({
      from: `"${APP_NAME}" <${GMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments,
    });
    return { success: true };
  } catch (err: any) {
    console.error("Failed to send email:", err.message);
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
