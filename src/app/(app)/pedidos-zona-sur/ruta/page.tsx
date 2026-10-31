import Link from "next/link";
import { prisma } from "@/lib/db";
import { buttonVariants } from "@/components/ui/button";
import { PlanificadorRuta } from "@/components/zona-sur/planificador-ruta";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function RutaPage() {
  const [config, pedidos] = await Promise.all([
    prisma.zonaSurConfig.upsert({ where: { id: "singleton" }, create: { id: "singleton" }, update: {} }),
    prisma.zonaSurPedido.findMany({
      where: { metodoEntrega: "ENVIO_ZONA", estado: { in: ["PENDIENTE", "PREPARADO"] } },
      orderBy: { createdAt: "asc" },
      select: { id: true, clienteNombre: true, direccion: true, envioLat: true, envioLng: true, estado: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Ruta de reparto</h1>
          <p className="text-muted-foreground">
            Entregas a domicilio sin entregar. Calcula el mejor orden según el tiempo de manejo real.
          </p>
        </div>
        <Link href="/pedidos-zona-sur" className={cn(buttonVariants({ variant: "secondary" }))}>
          Volver a pedidos
        </Link>
      </div>
      <PlanificadorRuta
        centro={{ lat: config.zonaCentroLat, lng: config.zonaCentroLng }}
        inicioInicial={config.rutaInicio}
        finInicial={config.rutaFin}
        pedidos={pedidos.map((p) => ({
          id: p.id,
          nombre: p.clienteNombre,
          direccion: p.direccion ?? "",
          lat: p.envioLat,
          lng: p.envioLng,
          estado: p.estado,
        }))}
      />
    </div>
  );
}
