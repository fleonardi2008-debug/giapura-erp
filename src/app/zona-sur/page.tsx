import { prisma } from "@/lib/db";
import { ZonaSurPedidoForm } from "@/components/zona-sur/pedido-form";

export const dynamic = "force-dynamic";

export default async function ZonaSurPage() {
  const [config, skus] = await Promise.all([
    prisma.zonaSurConfig.upsert({
      where: { id: "singleton" },
      create: { id: "singleton" },
      update: {},
    }),
    prisma.sku.findMany({
      where: { activo: true, precioVenta: { not: null } },
      orderBy: { nombre: "asc" },
    }),
  ]);

  return (
    <div className="gia-zona-sur">
      <ZonaSurPedidoForm
        config={{
          zonaNombre: config.zonaNombre,
          zonaCentroLat: config.zonaCentroLat,
          zonaCentroLng: config.zonaCentroLng,
          zonaRadioKm: config.zonaRadioKm,
          zonaPrecio: Number(config.zonaPrecio),
          cbuAlias: config.cbuAlias,
          titularCuenta: config.titularCuenta,
          puntoQuilmesTexto: config.puntoQuilmesTexto,
          puntoBernalTexto: config.puntoBernalTexto,
        }}
        skus={skus.map((s) => ({ id: s.id, nombre: s.nombre, precioVenta: Number(s.precioVenta) }))}
      />
    </div>
  );
}
