import Link from "next/link";
import { prisma } from "@/lib/db";
import { buttonVariants } from "@/components/ui/button";
import { EcoYpfConfigForm } from "@/components/zona-sur/ecoypf-config-form";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function EcoYpfConfigPage() {
  const config = await prisma.zonaSurConfig.upsert({ where: { id: "singleton" }, create: { id: "singleton" }, update: {} });
  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Configurar Desafío Eco YPF</h1>
          <p className="text-muted-foreground">
            Lo que se ve en{" "}
            <a href="/ecoypf" target="_blank" rel="noopener noreferrer" className="underline">
              /ecoypf
            </a>
            . El alias, tu WhatsApp, Andreani y los precios (los de IMPA) se cargan en las otras pantallas.
          </p>
        </div>
        <Link href="/pedidos-ecoypf" className={cn(buttonVariants({ variant: "secondary" }))}>
          Volver
        </Link>
      </div>
      <EcoYpfConfigForm
        config={{
          radioKm: String(config.ecoRadioKm),
          precioEnvio: String(Number(config.ecoPrecioEnvio)),
          fechaEntrega: config.ecoFechaEntrega,
        }}
      />
    </div>
  );
}
