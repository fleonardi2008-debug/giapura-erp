import { prisma } from "@/lib/db";
import { ZonaSurPedidoForm } from "@/components/zona-sur/pedido-form";
import { parsearDiasColegio } from "@/lib/zona-sur-colegio";
import { parsearTarifasAndreani } from "@/lib/zona-sur-andreani";

export const dynamic = "force-dynamic";

export default async function ZonaSurPage() {
  const [config, skus] = await Promise.all([
    prisma.zonaSurConfig.upsert({
      where: { id: "singleton" },
      create: { id: "singleton" },
      update: {},
    }),
    prisma.sku.findMany({
      where: {
        activo: true,
        nivel: { in: ["PACK", "FRASCO"] },
        // tiene que tener algún precio: el de Zona Sur o, si no, el online
        OR: [{ precioZonaSur: { not: null } }, { precioVenta: { not: null } }],
      },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, precioVenta: true, precioZonaSur: true, imagenUrl: true, nivel: true },
    }),
  ]);

  // Siempre se ofrecen los packs; los frascos sueltos solo si Fran lo prendió en la configuración.
  const habilitados = skus.filter((s) => s.nivel === "PACK" || config.frascosSueltos);
  const visibles = [...habilitados.filter((s) => s.nivel === "PACK"), ...habilitados.filter((s) => s.nivel !== "PACK")];

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
          colegioNombre: config.colegioNombre,
          colegioDias: parsearDiasColegio(config.colegioDias),
          descuentoEfectivo: config.descuentoEfectivo,
          andreaniActivo: config.andreaniActivo,
          andreaniTexto: config.andreaniTexto,
          andreaniTarifas: parsearTarifasAndreani(config.andreaniTarifas).tarifas,
        }}
        skus={visibles.map((s) => ({
          id: s.id,
          nombre: s.nombre,
          precioVenta: Number(s.precioZonaSur ?? s.precioVenta),
          imagenUrl: s.imagenUrl,
          esPack: s.nivel === "PACK",
        }))}
      />
    </div>
  );
}
