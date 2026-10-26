import { get } from "@vercel/blob";

/**
 * Sirve las fotos de producto (para /zona-sur). El almacén es privado, así que las fotos se entregan
 * desde acá. Solo salen archivos de la carpeta "skus/": nada más del almacén es público.
 */
export async function GET(request: Request) {
  const ruta = new URL(request.url).searchParams.get("p") ?? "";
  if (!ruta.startsWith("skus/") || ruta.includes("..")) return new Response("No encontrado", { status: 404 });

  const archivo = await get(ruta, { access: "private" });
  if (!archivo || archivo.statusCode !== 200) return new Response("No encontrado", { status: 404 });

  return new Response(archivo.stream, {
    headers: {
      "Content-Type": archivo.blob.contentType,
      // Cada subida lleva un sufijo aleatorio en el nombre, así que una foto nueva es otra dirección.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
