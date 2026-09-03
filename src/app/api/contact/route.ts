import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const need = String(body.need ?? "").trim();

    // --- Validate ---
    if (!name || !phone || !need) {
      return NextResponse.json(
        { error: "Vui lòng điền đầy đủ họ tên, số điện thoại và nhu cầu." },
        { status: 400 }
      );
    }

    // --- Configure transporter ---
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: false, // STARTTLS
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const contactEmail = process.env.CONTACT_EMAIL ?? process.env.SMTP_USER;

    // --- Build email ---
    const subject = `[TIS Website] Yêu cầu mới từ ${name}`;

    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 24px 32px; border-radius: 12px 12px 0 0;">
          <h2 style="color: #ffffff; margin: 0; font-size: 20px;">📩 Yêu cầu liên hệ mới</h2>
          <p style="color: #94a3b8; margin: 8px 0 0; font-size: 14px;">Từ website TIS</p>
        </div>
        <div style="background: #ffffff; padding: 28px 32px; border: 1px solid #e2e8f0; border-top: none;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px; width: 140px;">Họ và tên</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 14px; font-weight: 600;">${escapeHtml(name)}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px;">Số điện thoại</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 14px; font-weight: 600;">
                <a href="tel:${escapeHtml(phone.replace(/\s+/g, ""))}" style="color: #2563eb; text-decoration: none;">${escapeHtml(phone)}</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0; color: #64748b; font-size: 14px; vertical-align: top;">Nhu cầu</td>
              <td style="padding: 12px 0; color: #1e293b; font-size: 14px; line-height: 1.6;">${escapeHtml(need).replace(/\n/g, "<br>")}</td>
            </tr>
          </table>
        </div>
        <div style="background: #f8fafc; padding: 16px 32px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">Email này được gửi tự động từ form liên hệ trên website TIS.</p>
        </div>
      </div>
    `;

    const text = `Yêu cầu liên hệ mới từ website TIS\n\nHọ và tên: ${name}\nSố điện thoại: ${phone}\nNhu cầu:\n${need}`;

    // --- Send ---
    await transporter.sendMail({
      from: `"TIS Website" <${process.env.SMTP_USER}>`,
      to: contactEmail,
      replyTo: `"${name}" <noreply@tis.vn>`,
      subject,
      text,
      html,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[contact API]", err);
    return NextResponse.json(
      { error: "Không thể gửi yêu cầu. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}

/** Escape HTML to prevent XSS in email body */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
