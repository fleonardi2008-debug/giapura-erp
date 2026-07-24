import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "no-store",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * Endpoint público (sin auth, CORS abierto) que consume la página del Club Fundadores
 * (otro dominio, la del QR). Devuelve el contenido editable: config del hero/footer,
 * los bloques visibles y el historial del ticket. Solo lectura. Todo se edita desde el
 * backoffice sin tocar código y sin que cambie la URL del QR.
 */
export async function GET() {
  const [config, bloques, historial] = await Promise.all([
    prisma.clubConfig.findUnique({ where: { id: "singleton" } }),
    prisma.clubBloque.findMany({ where: { visible: true }, orderBy: { orden: "asc" } }),
    prisma.clubHistorialItem.findMany({ orderBy: { orden: "asc" } }),
  ]);

  return NextResponse.json(
    {
      config: config ?? {
        heroTitulo: "Bienvenido al Club Fundadores",
        heroSubtitulo: null,
        heroVideoUrl: null,
        introTitulo: "Qué es este acceso",
        introTexto: null,
        novedadesTexto: null,
        footerTexto: "Gracias por haber estado desde el principio. — Fran",
      },
      bloques: bloques.map((b) => ({
        id: b.id,
        tipo: b.tipo,
        titulo: b.titulo,
        cuerpo: b.cuerpo,
        codigo: b.codigo,
        ctaTexto: b.ctaTexto,
        ctaUrl: b.ctaUrl,
        mediaUrl: b.mediaUrl,
      })),
      historial: historial.map((h) => ({
        id: h.id,
        titulo: h.titulo,
        desbloqueado: h.desbloqueado,
      })),
    },
    { headers: CORS_HEADERS }
  );
}
