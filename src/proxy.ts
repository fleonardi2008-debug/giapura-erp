import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // api/webhooks y api/cron quedan fuera del login: los llama Tienda Nube y Vercel Cron,
  // no un usuario con sesión. Cada uno valida su propia autenticidad (firma HMAC y
  // CRON_SECRET respectivamente).
  matcher: [
    "/((?!api/auth|api/webhooks|api/cron|login|_next/static|_next/image|favicon.ico).*)",
  ],
};
