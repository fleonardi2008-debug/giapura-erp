import { get } from "@vercel/blob";
import { getSession } from "@/lib/session";

/**
 * Muestra el comprobante de una transferencia. El almacén de archivos es privado, así que
 * solo lo ve quien inició sesión como dueño: pasa por acá en lugar de abrir el archivo directo.
 */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.user.role !== "OWNER") return new Response("No autorizado", { status: 401 });

  const ruta = new URL(request.url).searchParams.get("p") ?? "";
  if (!ruta.startsWith("zona-sur/comprobantes/") || ruta.includes("..")) {
    return new Response("No encontrado", { status: 404 });
  }

  const archivo = await get(ruta, { access: "private" });
  if (!archivo || archivo.statusCode !== 200) return new Response("No encontrado", { status: 404 });

  return new Response(archivo.stream, {
    headers: {
      "Content-Type": archivo.blob.contentType,
      "Cache-Control": "private, no-store",
    },
  });
}
