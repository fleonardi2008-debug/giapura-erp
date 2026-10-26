/**
 * Achica una foto del celular o la cámara (suelen pesar varios MB) a un JPG liviano.
 * Los pedidos tienen un tope de tamaño: una foto sin achicar hace fallar el envío.
 */
export async function achicarImagen(archivo: File, maxLado = 1200, calidad = 0.85): Promise<File> {
  const bitmap = await createImageBitmap(archivo);
  const escala = Math.min(1, maxLado / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", calidad));
  if (!blob) throw new Error("No se pudo procesar la imagen");
  return new File([blob], "foto.jpg", { type: "image/jpeg" });
}
