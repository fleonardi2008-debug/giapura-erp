import Link from "next/link";
import { prisma } from "@/lib/db";
import { buttonVariants } from "@/components/ui/button";
import { AndreaniLinkForm } from "@/components/zona-sur/andreani-link-form";
import { DatosAndreani } from "@/components/zona-sur/datos-andreani";
import { EstadoPedidoSelect } from "@/components/zona-sur/estado-pedido-select";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AndreaniPage() {
  const pedidos = await prisma.zonaSurPedido.findMany({
    where: { metodoEntrega: "ANDREANI", estado: { in: ["PENDIENTE", "CONFIRMADO"] } },
    orderBy: { createdAt: "asc" },
    include: { items: true },
  });


  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Envíos por Andreani</h1>
          <p className="text-muted-foreground">
            Por cada pedido: revisá el comprobante, copiá los datos a RedChat, cotizá y creá el envío. Después
            avisale el costo y el seguimiento al cliente por WhatsApp.
          </p>
        </div>
        <Link href="/pedidos-zona-sur" className={cn(buttonVariants({ variant: "secondary" }))}>
          Todos los pedidos
        </Link>
      </div>

      {pedidos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No hay pedidos de Andreani pendientes.
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {pedidos.length} {pedidos.length === 1 ? "pedido" : "pedidos"} para despachar
          </p>
          <div className="space-y-2">
            {pedidos.map((pedido) => (
              <div key={pedido.id} className="space-y-3 rounded-xl border border-border p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-0.5">
                    <div className="font-medium">{pedido.clienteNombre}</div>
                    <div className="text-sm text-muted-foreground">
                      {pedido.items.map((i) => `${i.cantidad} × ${i.nombre}`).join(" · ")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {pedido.clienteTelefono} · {pedido.clienteEmail} · $
                      {Number(pedido.total).toLocaleString("es-AR")}
                      {pedido.envioAConfirmar
                        ? " (sin envío: a confirmar)"
                        : ` (incluye envío $${Number(pedido.costoEnvio).toLocaleString("es-AR")})`}
                      {pedido.comprobanteUrl && (
                        <>
                          {" · "}
                          <a href={pedido.comprobanteUrl} target="_blank" rel="noopener noreferrer" className="underline">
                            Ver comprobante
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <EstadoPedidoSelect pedidoId={pedido.id} estado={pedido.estado} />
                  </div>
                </div>
                {pedido.andreaniModalidad ? (
                  <DatosAndreani
                    filas={[
                      { etiqueta: "Nombre del cliente", valor: pedido.clienteNombre },
                      { etiqueta: "Email", valor: pedido.clienteEmail },
                      { etiqueta: "Teléfono", valor: pedido.clienteTelefono },
                      { etiqueta: "DNI", valor: pedido.clienteDni ?? "" },
                      {
                        etiqueta: "Método de envío",
                        valor: pedido.andreaniModalidad === "SUCURSAL" ? "Andreani a sucursal" : "Andreani a domicilio",
                      },
                      { etiqueta: "Calle", valor: pedido.envioCalle ?? "" },
                      { etiqueta: "Número", valor: pedido.envioNumero ?? "" },
                      { etiqueta: "Piso / Dpto", valor: pedido.envioPiso ?? "" },
                      { etiqueta: "Código postal", valor: pedido.envioCp ?? "" },
                      { etiqueta: "Ciudad", valor: pedido.envioCiudad ?? "" },
                      { etiqueta: "Provincia", valor: pedido.envioProvincia ?? "" },
                      {
                        etiqueta: "Productos",
                        valor: pedido.items.map((i) => `${i.cantidad} × ${i.nombre}`).join(", "),
                      },
                      { etiqueta: "Monto total (ARS)", valor: String(Number(pedido.total) - Number(pedido.costoEnvio)) },
                      {
                        etiqueta: "Envío cobrado (ARS)",
                        valor: pedido.envioAConfirmar ? "A confirmar con el cliente" : String(Number(pedido.costoEnvio)),
                      },
                    ]}
                  />
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Pedido anterior: el cliente completa sus datos en el link de Andreani.
                  </p>
                )}
                <p className="text-xs text-muted-foreground">Link de Andreani (opcional, solo si lo usás):</p>
                <AndreaniLinkForm
                  pedidoId={pedido.id}
                  linkGuardado={pedido.andreaniLink}
                  telefono={pedido.clienteTelefono}
                  nombre={pedido.clienteNombre}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
