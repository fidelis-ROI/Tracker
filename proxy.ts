// Next.js 16: arquivo proxy (anteriormente middleware.ts)
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = req.nextUrl;

  const isAdminRoute = pathname.startsWith("/admin") && pathname !== "/admin/login";
  const isOperatorRoute = pathname.startsWith("/operador") && pathname !== "/operador/login";

  // Rotas admin: apenas role "admin"
  if (isAdminRoute) {
    if (!token) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
    if (token.role === "operator") {
      return NextResponse.redirect(new URL("/operador/dashboard", req.url));
    }
  }

  // Rotas operador: role "operator" ou "admin"
  if (isOperatorRoute) {
    if (!token) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/operador/:path*"],
};
