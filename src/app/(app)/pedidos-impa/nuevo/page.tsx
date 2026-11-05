import Link from "next/link";
import { prisma } from "@/lib/db";
import { buttonVariants } from "@/components/ui/button";
import { PedidoImpaManual } from "@/components/zona-sur/pedido-impa-manual";
import { parsearDiasImpa, parsearOpcionesImpa } from "@/lib/impa";
import { leerStockZonaSur } from "@/lib/zona-sur-stock";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function NuevoPedidoImpaPage() {
  const [config, skus, { stock, consumo }] = await Promise.all([
    prisma.zonaSurConfig.upsert({ where: { id: "singleton" }, create: { id: "singleton" }, update: {} }),
    prisma.sku.findMany({
      where: { activo: true, nivel: { in: ["PACK", "FRASCO"] }, precioImpa: { not: null } },
      orderBy: [{ nivel: "asc" }, { nombre: "asc" }],
      select: { id: true, nombre: true, precioImpa: true },
    }),
    leerStockZonaSur(),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Cargar pedido del IMPA</h1>
          <p className="text-muted-foreground">
            Para alguien que te pidió por WhatsApp. Se descuenta del mismo stock que los pedidos de la página.
          </p>
        </div>
        <Link href="/pedidos-impa" className={cn(buttonVariants({ variant: "secondary" }))}>
          Volver
        </Link>
      </div>
      <PedidoImpaManual
        dias={parsearDiasImpa(config.impaDias, parsearOpcionesImpa(config.impaOpciones))}
        productos={skus.map((s) => ({ id: s.id, nombre: s.nombre, precio: Number(s.precioImpa), consumo: consumo[s.id] ?? {} }))}
        stock={stock}
      />
    </div>
  );
}
