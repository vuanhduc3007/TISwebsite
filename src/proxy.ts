import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (!pathname.startsWith("/admin") || pathname === "/admin/login") return NextResponse.next();
  const cookieName = process.env.NODE_ENV === "production" ? "__Host-tis_admin_session" : "tis_admin_session";
  if (!request.cookies.has(cookieName)) {
    const loginUrl = new URL("/admin/login", request.url);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
