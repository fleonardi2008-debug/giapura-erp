import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

const schema = z.object({
  email: z.string().email(),
});

/**
 * Endpoint público (sin auth, CORS abierto) que recibe los mails de "Activar novedades"
 * desde la página del Club Fundadores y los guarda en la lista Fundadores del ERP,
 * separada del newsletter. Idempotente: si el mail ya existe, no falla ni duplica.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400, headers: CORS_HEADERS });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Mail inválido" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const email = parsed.data.email.trim().toLowerCase();

  await prisma.fundador.upsert({
    where: { email },
    create: { email, origen: "club" },
    update: {},
  });

  return NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
}
