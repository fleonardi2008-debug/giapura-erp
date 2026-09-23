import { prisma } from "@/lib/db";
import { ZonaSurConfigForm } from "@/components/zona-sur/config-form";

export default async function ZonaSurConfigPage() {
  const config = await prisma.zonaSurConfig.upsert({
    where: { id: "singleton" },
    create: { id: "singleton" },
    update: {},
  });

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
        }}
      />
    </div>
  );
}
