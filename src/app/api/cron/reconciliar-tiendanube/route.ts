import { NextRequest, NextResponse } from "next/server";
import { getCredentials, listOrders } from "@/lib/tiendanube/client";
import { procesarOrdenTiendaNube } from "@/lib/tiendanube/procesarPedido";
import { reenviarStock } from "@/lib/tiendanube/sync";

const DIAS_HACIA_ATRAS = 7;

/**
 * Respaldo de los webhooks: importa cualquier pedido reciente que no haya entrado
 * (por ejemplo si la app estuvo caída más allá de la ventana de reintentos de
 * Tienda Nube) y reenvía el stock. Es idempotente: procesarOrdenTiendaNube ignora
 * los pedidos ya existentes.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const creds = await getCredentials();
  if (!creds) {
    return NextResponse.json({ ok: true, mensaje: "Sin conexión activa con Tienda Nube" });
  }

  const desde = new Date(Date.now() - DIAS_HACIA_ATRAS * 24 * 60 * 60 * 1000);
  const ordenes = await listOrders(creds, desde);

  let importados = 0;
  const errores: string[] = [];

  for (const orden of ordenes) {
    try {
      const { creado } = await procesarOrdenTiendaNube(String(orden.id));
      if (creado) importados++;
    } catch (error) {
      errores.push(`${orden.id}: ${error instanceof Error ? error.message : "error"}`);
    }
  }

  await reenviarStock();

  return NextResponse.json({ ok: true, revisados: ordenes.length, importados, errores });
}
