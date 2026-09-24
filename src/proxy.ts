import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const RUTA_FABRICA = "/produccion";

export async function proxy(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // El operador de fábrica tiene un login limitado: solo ve /produccion, sin costos,
  // plata ni el resto del sistema. Un Server Action llega acá como POST a la URL de
  // la página actual, así que esto también bloquea que dispare la acción de otra ruta.
  if (token.role === "OPERADOR" && request.nextUrl.pathname !== RUTA_FABRICA) {
    return NextResponse.redirect(new URL(RUTA_FABRICA, request.url));
  }

  return NextResponse.next();
}

export const config = {
  // api/webhooks y api/cron quedan fuera del login: los llama Tienda Nube y Vercel Cron,
  // no un usuario con sesión. Cada uno valida su propia autenticidad (firma HMAC y
  // CRON_SECRET respectivamente). api/public es de lectura y lo consume la landing
  // (otro dominio), así que tampoco pasa por login. zona-sur es la página pública
  // donde un cliente (sin cuenta del ERP) hace su pedido, así que tampoco pasa por login.
  matcher: [
    "/((?!api/auth|api/webhooks|api/cron|api/public|zona-sur|login|_next/static|_next/image|favicon.ico).*)",
  ],
};
