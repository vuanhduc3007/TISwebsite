import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { consumeRateLimit } from "@/lib/admin/rate-limit";
import { getRequestIp } from "@/lib/admin/request";

const MAX_BODY_BYTES = 20_000;

class RequestBodyError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function readJsonBody(request: Request) {
  const contentLength = request.headers.get("content-length");
  if (contentLength && (!/^\d+$/.test(contentLength) || Number(contentLength) > MAX_BODY_BYTES)) {
    throw new RequestBodyError(413, "Dữ liệu gửi lên quá lớn.");
  }
  if (!request.body) throw new RequestBodyError(400, "Dữ liệu không hợp lệ.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new RequestBodyError(413, "Dữ liệu gửi lên quá lớn.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    const parsed: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid object");
    return parsed as Record<string, unknown>;
  } catch {
    throw new RequestBodyError(400, "Dữ liệu không hợp lệ.");
  }
}

export async function POST(request: Request) {
  try {
    const ip = await getRequestIp();
    const rateLimit = await consumeRateLimit("contact", ip, 5, 15 * 60);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau." }, { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter) } });
    }
    const body = await readJsonBody(request);
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

    if (name.length > 120 || phone.length > 40 || need.length > 4_000 || !/^[0-9+().\s-]{7,40}$/.test(phone)) {
      return NextResponse.json({ error: "Thông tin liên hệ không hợp lệ." }, { status: 400 });
    }

    // --- Configure transporter ---
    const smtpHost = process.env.SMTP_HOST?.trim();
    const smtpUser = process.env.SMTP_USER?.trim();
    const smtpPass = process.env.SMTP_PASS;
    const contactEmail = process.env.CONTACT_EMAIL?.trim() || smtpUser;
    const smtpPort = Number(process.env.SMTP_PORT ?? 587);
    const configuredEmailPattern = /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/;
    if (!smtpHost || !smtpUser || !smtpPass || !contactEmail || !configuredEmailPattern.test(smtpUser) || !configuredEmailPattern.test(contactEmail)
      || !Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65_535) {
      throw new Error("SMTP configuration is incomplete.");
    }
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: process.env.SMTP_SECURE === "true" || smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    // --- Build email ---
    const safeName = name.replace(/[\r\n]+/g, " ");
    const subject = `[TIS Website] Yêu cầu mới từ ${safeName}`;

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
              <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 14px; font-weight: 600;">${escapeHtml(safeName)}</td>
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

    const text = `Yêu cầu liên hệ mới từ website TIS\n\nHọ và tên: ${safeName}\nSố điện thoại: ${phone}\nNhu cầu:\n${need}`;

    // --- Send ---
    await transporter.sendMail({
      from: `"TIS Website" <${smtpUser}>`,
      to: contactEmail,
      replyTo: "noreply@tis.vn",
      subject,
      text,
      html,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof RequestBodyError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const safeError = err && typeof err === "object"
      ? { name: "name" in err ? String(err.name) : "Error", code: "code" in err ? String(err.code) : undefined }
      : { name: "Error" };
    console.error("[contact API]", safeError);
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
