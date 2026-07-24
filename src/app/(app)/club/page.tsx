import { prisma } from "@/lib/db";
import { ConfigForm } from "@/components/club/config-form";
import { BloquesPanel } from "@/components/club/bloques-panel";
import { HistorialPanel } from "@/components/club/historial-panel";

const CLUB_URL = process.env.NEXT_PUBLIC_CLUB_URL ?? "https://club.giapura.com.ar";

export default async function ClubPage() {
  const [config, bloques, historial, fundadores, totalFundadores] = await Promise.all([
    prisma.clubConfig.findUnique({ where: { id: "singleton" } }),
    prisma.clubBloque.findMany({ orderBy: { orden: "asc" } }),
    prisma.clubHistorialItem.findMany({ orderBy: { orden: "asc" } }),
    prisma.fundador.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.fundador.count(),
  ]);

  const configData = {
    heroTitulo: config?.heroTitulo ?? "Bienvenido al Club Fundadores",
    heroSubtitulo: config?.heroSubtitulo ?? null,
    heroVideoUrl: config?.heroVideoUrl ?? null,
    introTitulo: config?.introTitulo ?? "Qué es este acceso",
    introTexto: config?.introTexto ?? null,
    novedadesTexto: config?.novedadesTexto ?? null,
    footerTexto: config?.footerTexto ?? "Gracias por haber estado desde el principio. — Fran",
  };

  return (
    <div className="max-w-4xl space-y-10">
      <div>
        <h1 className="text-2xl font-semibold">Club Fundadores</h1>
        <p className="text-muted-foreground">
          Editás acá el contenido de la página a la que llega el fundador por QR. Los cambios
          se ven al instante y la URL del QR nunca cambia.
        </p>
        <a
          href={CLUB_URL}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block text-sm text-primary underline-offset-4 hover:underline"
        >
          Ver la página pública →
        </a>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Hero, intro y footer</h2>
          <p className="text-sm text-muted-foreground">Las partes fijas de la página.</p>
        </div>
        <ConfigForm config={configData} />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Contenido dinámico</h2>
          <p className="text-sm text-muted-foreground">
            Lo que cambia con el tiempo. Podés reemplazarlo por completo sin rediseñar nada.
          </p>
        </div>
        <BloquesPanel bloques={bloques} />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Historial del Ticket</h2>
        </div>
        <HistorialPanel items={historial} />
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Lista Fundadores</h2>
            <p className="text-sm text-muted-foreground">
              Mails de &quot;Activar novedades&quot;. Separada del newsletter. Total:{" "}
              <strong>{totalFundadores}</strong>.
            </p>
          </div>
          {totalFundadores > 0 && (
            <a
              href="/club/export"
              className="inline-flex h-8 items-center rounded-lg border border-input px-3 text-sm hover:bg-muted"
            >
              Exportar CSV
            </a>
          )}
        </div>
        <div className="space-y-1">
          {fundadores.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
            >
              <span>{f.email}</span>
              <span className="text-muted-foreground">
                {f.createdAt.toLocaleDateString("es-AR")}
              </span>
            </div>
          ))}
          {fundadores.length === 0 && (
            <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Todavía no se anotó ningún fundador.
            </p>
          )}
          {totalFundadores > fundadores.length && (
            <p className="pt-1 text-xs text-muted-foreground">
              Mostrando los {fundadores.length} más recientes. Exportá el CSV para verlos todos.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
