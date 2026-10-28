import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { ListaEtiquetas, type FilaEtiqueta } from "@/components/etiquetas/lista-etiquetas";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ENTREGA_LABEL, INCLUDE_ETIQUETA, destinoPedido } from "@/lib/etiquetas";
import type { ZonaSurEstado } from "@/generated/prisma/client";

const FILTROS: { valor: ZonaSurEstado | "TODOS"; label: string }[] = [
  { valor: "PENDIENTE", label: "Para preparar (pendientes)" },
  { valor: "PREPARADO", label: "Preparados" },
  { valor: "ENTREGADO", label: "Entregados" },
  { valor: "TODOS", label: "Todos" },
];

export default async function EtiquetasPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const rol = session.user.role;
  if (rol !== "OWNER" && rol !== "OPERADOR") redirect("/");

  // El operador solo trabaja con los pedidos para preparar (pendientes); el dueño puede mirar el resto.
  const pedido = (await searchParams).estado;
  const pedidoEstado = Array.isArray(pedido) ? pedido[0] : pedido;
  const filtro = rol === "OWNER" ? (FILTROS.find((f) => f.valor === pedidoEstado)?.valor ?? "PENDIENTE") : "PENDIENTE";

  const pedidos = await prisma.zonaSurPedido.findMany({
    where: filtro === "TODOS" ? {} : { estado: filtro },
    orderBy: { createdAt: "asc" },
    take: 300,
    include: INCLUDE_ETIQUETA,
  });

  const filas: FilaEtiqueta[] = pedidos.map((p) => ({
    id: p.id,
    fecha: p.createdAt.toLocaleDateString("es-AR"),
    cliente: p.clienteNombre,
    entrega: ENTREGA_LABEL[p.metodoEntrega],
    destino: destinoPedido(p),
    productos: p.items.map((i) => `${i.cantidad} × ${i.nombre}`),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Etiquetas Zona Sur</h1>
        <p className="text-muted-foreground">
          Una etiqueta chica por pedido, con el nombre, adónde va y qué frascos lleva cada pack. Marcá los pedidos que
          querés imprimir.
        </p>
      </div>

      {rol === "OWNER" && (
        <div className="flex flex-wrap gap-2">
          {FILTROS.map((f) => (
            <Link
              key={f.valor}
              href={f.valor === "PENDIENTE" ? "/etiquetas" : `/etiquetas?estado=${f.valor}`}
              className={cn(buttonVariants({ variant: filtro === f.valor ? "default" : "outline", size: "sm" }))}
            >
              {f.label}
            </Link>
          ))}
        </div>
      )}

      <ListaEtiquetas filas={filas} />
    </div>
  );
}
