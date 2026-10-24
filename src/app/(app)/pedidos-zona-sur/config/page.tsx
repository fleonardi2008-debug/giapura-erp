import { prisma } from "@/lib/db";
import { ZonaSurConfigForm } from "@/components/zona-sur/config-form";
import { leerStockZonaSur } from "@/lib/zona-sur-stock";

export default async function ZonaSurConfigPage() {
  const [{ stock }, config, skus] = await Promise.all([
    leerStockZonaSur(),
    prisma.zonaSurConfig.upsert({
      where: { id: "singleton" },
      create: { id: "singleton" },
      update: {},
    }),
    prisma.sku.findMany({
      where: { activo: true, nivel: { in: ["PACK", "FRASCO"] } },
      orderBy: [{ nivel: "desc" }, { nombre: "asc" }],
      select: { id: true, nombre: true, nivel: true, precioVenta: true, precioZonaSur: true, stockZonaSur: true },
    }),
  ]);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Configuración de Zona Sur</h1>
        <p className="text-muted-foreground">
          Esto define lo que ve el cliente en{" "}
          <a href="/zona-sur" target="_blank" rel="noopener noreferrer" className="underline">
            giapura-erp.vercel.app/zona-sur
          </a>
          .
        </p>
      </div>
      <ZonaSurConfigForm
        config={{
          zonaNombre: config.zonaNombre,
          zonaCentroLat: config.zonaCentroLat,
          zonaCentroLng: config.zonaCentroLng,
          zonaRadioKm: config.zonaRadioKm,
          zonaPrecio: config.zonaPrecio.toString(),
          cbuAlias: config.cbuAlias,
          titularCuenta: config.titularCuenta,
          puntoQuilmesTexto: config.puntoQuilmesTexto,
          puntoBernalTexto: config.puntoBernalTexto,
          colegioNombre: config.colegioNombre,
          colegioDias: config.colegioDias,
          frascosSueltos: config.frascosSueltos,
          descuentoEfectivo: config.descuentoEfectivo,
          andreaniActivo: config.andreaniActivo,
          andreaniTexto: config.andreaniTexto,
          andreaniTarifas: config.andreaniTarifas,
        }}
        productos={skus.map((s) => ({
          id: s.id,
          nombre: s.nombre,
          esPack: s.nivel === "PACK",
          precioOnline: s.precioVenta ? Number(s.precioVenta) : null,
          precioZonaSur: s.precioZonaSur ? Number(s.precioZonaSur) : null,
          stockZonaSur: s.stockZonaSur,
          pedidosHastaAhora: stock.find((f) => f.id === s.id)?.usado ?? 0,
        }))}
      />
    </div>
  );
}
