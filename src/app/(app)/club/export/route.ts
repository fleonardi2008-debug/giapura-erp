import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

/**
 * Descarga la lista Fundadores como CSV. Protegida por login (no está en api/public).
 */
export async function GET() {
  const session = await getSession();
  if (!session) return new Response("No autorizado", { status: 401 });

  const fundadores = await prisma.fundador.findMany({ orderBy: { createdAt: "asc" } });

  const filas = [
    "email,alta",
    ...fundadores.map((f) => `${f.email},${f.createdAt.toISOString()}`),
  ];
  const csv = filas.join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="fundadores.csv"`,
    },
  });
}
