import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "kassius_session";
const ADMIN_PATHS = ["/painel/fornecedores"];

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return null;
  }
  return new TextEncoder().encode(secret);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const secret = getSecret();

  if (!token || !secret) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const { payload } = await jwtVerify(token, secret);
    const adminOnly = ADMIN_PATHS.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`)
    );
    if (adminOnly && payload.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/painel", request.url));
    }
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: ["/painel", "/painel/:path*"],
};
