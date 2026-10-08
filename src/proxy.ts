import { NextRequest, NextResponse } from "next/server";
import { resolveTrustedClientIp, TrustedProxyError } from "@/lib/admin/client-ip";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (request.method === "POST") {
    try {
      resolveTrustedClientIp(request.headers, process.env);
    } catch (error) {
      if (error instanceof TrustedProxyError) {
        return NextResponse.json({ error: "Request gateway verification failed." }, {
          status: error.status,
          headers: { "Cache-Control": "no-store" }
        });
      }
      throw error;
    }
  }
  if (!pathname.startsWith("/admin") || pathname === "/admin/login") return NextResponse.next();
  const cookieName = process.env.NODE_ENV === "production" ? "__Host-tis_admin_session" : "tis_admin_session";
  if (!request.cookies.has(cookieName)) {
    const loginUrl = new URL("/admin/login", request.url);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/api/contact"] };
