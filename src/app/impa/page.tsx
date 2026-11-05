import { prisma } from "@/lib/db";
import { ImpaPedidoForm } from "@/components/zona-sur/impa-form";
import { parsearDiasImpa, parsearOpcionesImpa } from "@/lib/impa";
import { leerStockZonaSur } from "@/lib/zona-sur-stock";

export const dynamic = "force-dynamic";

export default async function ImpaPage() {
  const [{ stock, consumo }, config, skus] = await Promise.all([
    leerStockZonaSur(),
    prisma.zonaSurConfig.upsert({ where: { id: "singleton" }, create: { id: "singleton" }, update: {} }),
    prisma.sku.findMany({
      where: { activo: true, nivel: { in: ["PACK", "FRASCO"] }, precioImpa: { not: null } },
      orderBy: { nombre: "asc" },
      select: {
        id: true,
        nombre: true,
        precioImpa: true,
        precioImpaTachado: true,
        imagenUrl: true,
        imagenPosX: true,
        imagenPosY: true,
        imagenZoom: true,
        nivel: true,
      },
    }),
  ]);

  // Primero los packs y después los frascos sueltos.
  const ordenados = [...skus.filter((s) => s.nivel === "PACK"), ...skus.filter((s) => s.nivel !== "PACK")];

  return (
    <div className="gia-zona-sur">
      <ImpaPedidoForm
        config={{
          dias: parsearDiasImpa(config.impaDias, parsearOpcionesImpa(config.impaOpciones)),
          lugar: config.impaLugar,
          cbuAlias: config.cbuAlias,
          titularCuenta: config.titularCuenta,
          whatsappContacto: config.whatsappContacto,
        }}
        skus={ordenados.map((s) => ({
          id: s.id,
          nombre: s.nombre,
          precioVenta: Number(s.precioImpa),
          precioTachado: s.precioImpaTachado ? Number(s.precioImpaTachado) : null,
          imagenUrl: s.imagenUrl,
          imagenPosicion: `${s.imagenPosX}% ${s.imagenPosY}%`,
          imagenZoom: s.imagenZoom / 100,
          esPack: s.nivel === "PACK",
          consumo: consumo[s.id] ?? {},
        }))}
        stock={stock}
      />
    </div>
  );
}
