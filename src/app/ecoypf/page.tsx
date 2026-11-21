import { prisma } from "@/lib/db";
import { ZonaSurPedidoForm } from "@/components/zona-sur/pedido-form";
import { parsearTarifasAndreani } from "@/lib/zona-sur-andreani";

export const dynamic = "force-dynamic";

/**
 * Página del Desafío Eco YPF: misma forma de pedir que Zona Sur, con los precios del IMPA (y su precio tachado),
 * envío a domicilio dentro de un radio propio o Andreani, entrega en una fecha fija y sin límite de stock.
 */
export default async function EcoYpfPage() {
  const [config, skus] = await Promise.all([
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
      <ZonaSurPedidoForm
        eco={{ fechaEntrega: config.ecoFechaEntrega }}
        config={{
          zonaNombre: config.zonaNombre,
          zonaCentroLat: config.zonaCentroLat,
          zonaCentroLng: config.zonaCentroLng,
          zonaRadioKm: config.ecoRadioKm,
          zonaPrecio: Number(config.ecoPrecioEnvio),
          cbuAlias: config.cbuAlias,
          titularCuenta: config.titularCuenta,
          colegioNombre: null,
          colegioDias: [],
          ventanaTexto: "",
          whatsappContacto: config.whatsappContacto,
          retiroCasa: config.rutaInicio,
          descuentoEfectivo: 0,
          andreaniActivo: config.andreaniActivo,
          andreaniTexto: config.andreaniTexto,
          andreaniTarifas: parsearTarifasAndreani(config.andreaniTarifas).tarifas,
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
          consumo: {},
          ahorro: null,
        }))}
        stock={[]}
      />
    </div>
  );
}
