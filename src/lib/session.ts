import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export function getSession() {
  return getServerSession(authOptions);
}

/**
 * Exige una sesión de OWNER. Server Actions son un endpoint alcanzable por cualquiera
 * con sesión, no solo por quien ve el botón en pantalla (la fábrica entra con su propio
 * login OPERADOR), así que las acciones que tocan plata, costos o administración se
 * protegen acá además de no mostrarse en su pantalla.
 * Devuelve la sesión si es OWNER; si no, null (el caller decide cómo responder).
 */
export async function requireOwnerSession() {
  const session = await getSession();
  if (!session) return null;
  if (session.user.role !== "OWNER") return null;
  return session;
}
