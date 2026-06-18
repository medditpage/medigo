import { prisma } from "../utils/prisma";
import { sendMail, wrapEmailTemplate } from "../utils/mailer";
import { NotificationType } from "@prisma/client";

interface NotifyParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  orderId?: string;
  sendEmail?: boolean;
  emailTitle?: string;
  emailBodyHtml?: string;
}

const NOTIFICATION_TEMPLATES: Record<
  NotificationType,
  { title: string; body: (msg: string) => string }
> = {
  registration: {
    title: "Welcome to Medzink!",
    body: (msg) =>
      `<p>${msg}</p><p>Thank you for joining Medzink, your trusted medicine delivery partner.</p>`,
  },
  order_placed: {
    title: "Order Placed Successfully",
    body: (msg) =>
      `<p>${msg}</p><p>We are finding the nearest delivery agent for your order.</p>`,
  },
  order_accepted: {
    title: "Order Accepted",
    body: (msg) =>
      `<p>${msg}</p><p>A delivery agent has accepted your order and is heading to the store.</p>`,
  },
  bill_generated: {
    title: "Invoice Generated",
    body: (msg) =>
      `<p>${msg}</p><p>Your invoice is ready. You can view and download it from your order details.</p>`,
  },
  out_for_delivery: {
    title: "Order Out for Delivery",
    body: (msg) => `<p>${msg}</p><p>Your medicines are on the way!</p>`,
  },
  delivered: {
    title: "Order Delivered",
    body: (msg) =>
      `<p>${msg}</p><p>Thank you for using Medzink. Please rate your delivery experience.</p>`,
  },
  complaint: {
    title: "Complaint Update",
    body: (msg) => `<p>${msg}</p>`,
  },
  general: {
    title: "Notification",
    body: (msg) => `<p>${msg}</p>`,
  },
};

export async function notify(params: NotifyParams): Promise<void> {
  const { userId, type, title, message, orderId, sendEmail = true } = params;

  await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      orderId: orderId ?? null,
    },
  });

  if (!sendEmail) return;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  const template =
    NOTIFICATION_TEMPLATES[type] ?? NOTIFICATION_TEMPLATES.general;
  const emailTitle = params.emailTitle ?? template.title;
  const emailBody = params.emailBodyHtml ?? template.body(message);
  const html = wrapEmailTemplate(emailTitle, emailBody);

  const result = await sendMail({
    to: user.email,
    subject: `${emailTitle} - Medzink`,
    html,
  });

  await prisma.emailLog.create({
    data: {
      userId,
      toEmail: user.email,
      subject: emailTitle,
      body: emailBody,
      notificationType: type,
      status: result.success ? "sent" : "failed",
      errorMessage: result.error ?? null,
    },
  });
}

export async function notifyAdmins(
  title: string,
  message: string,
  type: NotificationType = "general",
): Promise<void> {
  const admins = await prisma.user.findMany({ where: { role: "admin" } });

  for (const admin of admins) {
    await notify({
      userId: admin.id,
      type,
      title,
      message,
      sendEmail: false,
    });
  }
}
