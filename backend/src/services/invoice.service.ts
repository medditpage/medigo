// invoice service
import PDFDocument from "pdfkit";
import { prisma } from "../utils/prisma";
import { uploadBuffer, STORAGE_BUCKETS } from "../utils/supabase";

interface InvoiceData {
  invoiceNumber: string;
  orderNumber: string;
  patientName: string;
  patientAddress: string;
  storeName: string;
  items: { name: string; quantity: number; unitPrice: number }[];
  medicineCost: number;
  baseCharge: number;
  distanceCharge: number;
  platformCharge: number;
  urgentCharge: number;
  taxAmount: number;
  totalAmount: number;
  createdAt: Date;
}

function buildInvoiceHtml(data: InvoiceData): string {
  const itemRows = data.items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px;border:1px solid #e2e8f0;">${item.name}</td>
        <td style="padding:8px;border:1px solid #e2e8f0;text-align:center;">${item.quantity}</td>
        <td style="padding:8px;border:1px solid #e2e8f0;text-align:right;">₹${item.unitPrice.toFixed(2)}</td>
        <td style="padding:8px;border:1px solid #e2e8f0;text-align:right;">₹${(item.unitPrice * item.quantity).toFixed(2)}</td>
      </tr>`,
    )
    .join("");

  return `
  <!DOCTYPE html>
  <html>
  <head><meta charset="utf-8" /><title>Invoice ${data.invoiceNumber}</title></head>
  <body style="font-family: Arial, sans-serif; color:#0f172a; padding: 24px; max-width: 700px; margin: 0 auto;">
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #0ea5e9;padding-bottom:16px;">
      <h1 style="color:#0ea5e9;margin:0;">MediGo</h1>
      <div style="text-align:right;">
        <p style="margin:0;font-weight:bold;">Invoice #${data.invoiceNumber}</p>
        <p style="margin:0;font-size:12px;color:#64748b;">Order #${data.orderNumber}</p>
        <p style="margin:0;font-size:12px;color:#64748b;">${data.createdAt.toLocaleString("en-IN")}</p>
      </div>
    </div>

    <div style="margin-top:16px;">
      <p style="margin:4px 0;"><strong>Bill To:</strong> ${data.patientName}</p>
      <p style="margin:4px 0;font-size:13px;color:#475569;">${data.patientAddress}</p>
      <p style="margin:4px 0;"><strong>Store:</strong> ${data.storeName}</p>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:13px;">
      <thead>
        <tr style="background:#f1f5f9;">
          <th style="padding:8px;border:1px solid #e2e8f0;text-align:left;">Medicine</th>
          <th style="padding:8px;border:1px solid #e2e8f0;">Qty</th>
          <th style="padding:8px;border:1px solid #e2e8f0;text-align:right;">Unit Price</th>
          <th style="padding:8px;border:1px solid #e2e8f0;text-align:right;">Amount</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    <table style="width:100%;margin-top:16px;font-size:13px;">
      <tr><td style="padding:4px 0;">Medicine Cost</td><td style="text-align:right;">₹${data.medicineCost.toFixed(2)}</td></tr>
      <tr><td style="padding:4px 0;">Base Delivery Charge</td><td style="text-align:right;">₹${data.baseCharge.toFixed(2)}</td></tr>
      <tr><td style="padding:4px 0;">Distance Charge</td><td style="text-align:right;">₹${data.distanceCharge.toFixed(2)}</td></tr>
      <tr><td style="padding:4px 0;">Platform Charge</td><td style="text-align:right;">₹${data.platformCharge.toFixed(2)}</td></tr>
      <tr><td style="padding:4px 0;">Urgent Charge</td><td style="text-align:right;">₹${data.urgentCharge.toFixed(2)}</td></tr>
      <tr><td style="padding:4px 0;">Tax</td><td style="text-align:right;">₹${data.taxAmount.toFixed(2)}</td></tr>
      <tr style="border-top:2px solid #0f172a;font-weight:bold;font-size:15px;">
        <td style="padding:8px 0;">Total (Pay on Delivery)</td>
        <td style="text-align:right;padding:8px 0;">₹${data.totalAmount.toFixed(2)}</td>
      </tr>
    </table>

    <p style="margin-top:24px;font-size:12px;color:#94a3b8;text-align:center;">
      This is a computer-generated invoice from MediGo. Payment Mode: Cash on Delivery.
    </p>
  </body>
  </html>`;
}

function buildInvoicePdf(data: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fillColor("#0ea5e9").fontSize(22).text("MediGo", { continued: false });
    doc.fillColor("#0f172a").fontSize(10);
    doc.text(`Invoice #${data.invoiceNumber}`, { align: "right" });
    doc.text(`Order #${data.orderNumber}`, { align: "right" });
    doc.text(data.createdAt.toLocaleString("en-IN"), { align: "right" });

    doc.moveDown(1.5);
    doc.fontSize(11).fillColor("#0f172a");
    doc.text(`Bill To: ${data.patientName}`);
    doc.fontSize(9).fillColor("#475569").text(data.patientAddress);
    doc.fontSize(11).fillColor("#0f172a").text(`Store: ${data.storeName}`);

    doc.moveDown(1);
    doc.fontSize(10).fillColor("#0f172a");
    const tableTop = doc.y;
    doc.text("Medicine", 50, tableTop, { width: 220 });
    doc.text("Qty", 270, tableTop, { width: 60, align: "center" });
    doc.text("Unit Price", 330, tableTop, { width: 100, align: "right" });
    doc.text("Amount", 430, tableTop, { width: 100, align: "right" });
    doc
      .moveTo(50, tableTop + 15)
      .lineTo(530, tableTop + 15)
      .stroke();

    let y = tableTop + 22;
    for (const item of data.items) {
      doc.text(item.name, 50, y, { width: 220 });
      doc.text(String(item.quantity), 270, y, { width: 60, align: "center" });
      doc.text(`Rs.${item.unitPrice.toFixed(2)}`, 330, y, {
        width: 100,
        align: "right",
      });
      doc.text(`Rs.${(item.unitPrice * item.quantity).toFixed(2)}`, 430, y, {
        width: 100,
        align: "right",
      });
      y += 20;
    }

    doc
      .moveTo(50, y + 5)
      .lineTo(530, y + 5)
      .stroke();
    y += 15;

    const summaryLines: [string, number][] = [
      ["Medicine Cost", data.medicineCost],
      ["Base Delivery Charge", data.baseCharge],
      ["Distance Charge", data.distanceCharge],
      ["Platform Charge", data.platformCharge],
      ["Urgent Charge", data.urgentCharge],
      ["Tax", data.taxAmount],
    ];

    for (const [label, value] of summaryLines) {
      doc.text(label, 330, y, { width: 100 });
      doc.text(`Rs.${value.toFixed(2)}`, 430, y, {
        width: 100,
        align: "right",
      });
      y += 18;
    }

    doc
      .moveTo(330, y + 2)
      .lineTo(530, y + 2)
      .stroke();
    y += 10;

    doc.fontSize(12).font("Helvetica-Bold");
    doc.text("Total (COD)", 330, y, { width: 100 });
    doc.text(`Rs.${data.totalAmount.toFixed(2)}`, 430, y, {
      width: 100,
      align: "right",
    });

    doc.moveDown(4);
    doc.fontSize(8).fillColor("#94a3b8").font("Helvetica");
    doc.text(
      "This is a computer-generated invoice from MediGo. Payment Mode: Cash on Delivery.",
      50,
      doc.y,
      {
        width: 480,
        align: "center",
      },
    );

    doc.end();
  });
}

export async function generateInvoice(
  orderId: string,
): Promise<{ invoiceId: string; pdfUrl: string }> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      patient: true,
      address: true,
      store: true,
    },
  });

  if (!order) {
    throw new Error("Order not found");
  }

  const medicineCost = Number(order.medicineCost ?? 0);
  const baseCharge = Number(order.baseCharge ?? 0);
  const platformCharge = Number(order.platformCharge ?? 0);
  const urgentCharge = Number(order.urgentCharge ?? 0);
  const taxAmount = Number(order.taxAmount ?? 0);
  const totalDeliveryCharge = Number(order.deliveryCharge ?? 0);
  const distanceCharge =
    totalDeliveryCharge - baseCharge - platformCharge - urgentCharge;
  const totalAmount = Number(order.totalAmount ?? 0);

  const invoiceNumber = `INV-${order.orderNumber}`;

  const invoiceData: InvoiceData = {
    invoiceNumber,
    orderNumber: order.orderNumber,
    patientName: order.patient.fullName,
    patientAddress: `${order.address.addressLine}, ${order.address.city}, ${order.address.state} - ${order.address.pincode}`,
    storeName: order.store?.name ?? "MediGo Partner Store",
    items: order.items.map((item) => ({
      name: item.medicineName,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice ?? 0),
    })),
    medicineCost,
    baseCharge,
    distanceCharge: distanceCharge > 0 ? distanceCharge : 0,
    platformCharge,
    urgentCharge,
    taxAmount,
    totalAmount,
    createdAt: new Date(),
  };

  if (invoiceData.items.length === 0) {
    invoiceData.items.push({
      name: "Medicines as per prescription",
      quantity: 1,
      unitPrice: medicineCost,
    });
  }

  const html = buildInvoiceHtml(invoiceData);
  const pdfBuffer = await buildInvoicePdf(invoiceData);

  const pdfUrl = await uploadBuffer(
    STORAGE_BUCKETS.INVOICES,
    `${order.id}/${invoiceNumber}.pdf`,
    pdfBuffer,
    "application/pdf",
  );

  const invoice = await prisma.invoice.upsert({
    where: { orderId: order.id },
    update: {
      medicineCost,
      deliveryCharge: totalDeliveryCharge,
      baseCharge,
      platformCharge,
      urgentCharge,
      taxAmount,
      totalAmount,
      pdfUrl,
      htmlContent: html,
    },
    create: {
      orderId: order.id,
      invoiceNumber,
      medicineCost,
      deliveryCharge: totalDeliveryCharge,
      baseCharge,
      platformCharge,
      urgentCharge,
      taxAmount,
      totalAmount,
      pdfUrl,
      htmlContent: html,
    },
  });

  return { invoiceId: invoice.id, pdfUrl };
}
