import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { exchangeCodeForToken, guardarConexion, registerWebhooks } from "@/lib/tiendanube/client";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/integraciones?error=sin_code", request.url));
  }

  try {
    const token = await exchangeCodeForToken(code);
    await guardarConexion(String(token.user_id), token.access_token, token.scope);

    const callbackUrl = new URL("/api/webhooks/tiendanube", request.url).toString();
    await registerWebhooks(
      { storeId: String(token.user_id), accessToken: token.access_token },
      callbackUrl
    );

    return NextResponse.redirect(new URL("/integraciones?conectado=1", request.url));
  } catch (error) {
    console.error("Error conectando Tienda Nube:", error);
    return NextResponse.redirect(new URL("/integraciones?error=conexion", request.url));
  }
}
