import Link from "next/link";
import { prisma } from "@/lib/db";
import { buttonVariants } from "@/components/ui/button";
import { ImpaConfigForm } from "@/components/zona-sur/impa-config-form";
import { leerStockZonaSur } from "@/lib/zona-sur-stock";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ImpaConfigPage() {
  const [config, skus, { stock }] = await Promise.all([
    prisma.zonaSurConfig.upsert({ where: { id: "singleton" }, create: { id: "singleton" }, update: {} }),
    prisma.sku.findMany({
      where: { activo: true, nivel: { in: ["PACK", "FRASCO"] } },
      orderBy: [{ nivel: "asc" }, { nombre: "asc" }],
      select: { id: true, nombre: true, nivel: true, precioImpa: true, precioImpaTachado: true },
    }),
    leerStockZonaSur(),
  ]);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Precios, días y stock del IMPA</h1>
          <p className="text-muted-foreground">
            Lo que se ve en{" "}
            <a href="/impa" target="_blank" rel="noopener noreferrer" className="underline">
              /impa
            </a>
            . El alias para transferir y tu WhatsApp son los mismos de Zona Sur.
          </p>
        </div>
        <Link href="/pedidos-impa" className={cn(buttonVariants({ variant: "secondary" }))}>
          Volver
        </Link>
      </div>
      <ImpaConfigForm
        config={{ dias: config.impaDias ?? "", opciones: config.impaOpciones, lugar: config.impaLugar ?? "" }}
        productos={skus.map((s) => ({
          id: s.id,
          nombre: s.nombre,
          esPack: s.nivel === "PACK",
          precio: s.precioImpa ? String(Number(s.precioImpa)) : "",
          tachado: s.precioImpaTachado ? String(Number(s.precioImpaTachado)) : "",
          quedan: (() => {
            const f = stock.find((x) => x.id === s.id);
            return f ? String(Math.max(0, f.total - f.usado)) : null;
          })(),
        }))}
      />
    </div>
  );
}
