import { prisma } from "@/lib/db";
import { ZonaSurPedidoForm } from "@/components/zona-sur/pedido-form";
import { parsearDiasColegio } from "@/lib/zona-sur-colegio";
import { parsearTarifasAndreani } from "@/lib/zona-sur-andreani";
import { leerStockZonaSur } from "@/lib/zona-sur-stock";

export const dynamic = "force-dynamic";

export default async function ZonaSurPage() {
  const [{ stock, consumo }, config, skus] = await Promise.all([
    leerStockZonaSur(),
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
      select: { id: true, nombre: true, precioVenta: true, precioZonaSur: true, imagenUrl: true, imagenPosX: true, imagenPosY: true, imagenZoom: true, nivel: true },
    }),
  ]);

  // Siempre se ofrecen los packs; los frascos sueltos solo si Fran lo prendió en la configuración.
  const habilitados = skus.filter((s) => s.nivel === "PACK" || config.frascosSueltos);
  // Cuánto se ahorra comprando el pack en vez de los frascos sueltos (a precio de Zona Sur). Solo si hay ahorro.
  const precioDe = (id: string) => {
    const s = skus.find((x) => x.id === id);
    return s ? Number(s.precioZonaSur ?? s.precioVenta ?? 0) : 0;
  };
  const ahorroDe = (s: (typeof skus)[number]) => {
    if (s.nivel !== "PACK") return null;
    const partes = Object.entries(consumo[s.id] ?? {});
    if (partes.length === 0 || partes.some(([id]) => precioDe(id) <= 0)) return null;
    const suelto = partes.reduce((acc, [id, n]) => acc + n * precioDe(id), 0);
    const monto = suelto - Number(s.precioZonaSur ?? s.precioVenta);
    return monto > 0 ? { monto, pct: Math.round((monto / suelto) * 100) } : null;
  };
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
          imagenPosicion: `${s.imagenPosX}% ${s.imagenPosY}%`,
          imagenZoom: s.imagenZoom / 100,
          esPack: s.nivel === "PACK",
          consumo: consumo[s.id] ?? {},
          ahorro: ahorroDe(s),
        }))}
        stock={stock}
      />
    </div>
  );
}
