import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { EtiquetaEstilos, EtiquetaPack, EtiquetasEnHojas } from "@/components/etiquetas/etiqueta-pack";
import { BotonImprimir } from "@/components/etiquetas/boton-imprimir";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ETIQUETAS_POR_HOJA_A4,
  ETIQUETA_ALTO_MM,
  ETIQUETA_ANCHO_MM,
  INCLUDE_ETIQUETA,
  armarEtiquetas,
  type FormatoEtiqueta,
} from "@/lib/etiquetas";

export const dynamic = "force-dynamic";

const MAX_PEDIDOS = 200;

export default async function ImprimirEtiquetasPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const rol = session.user.role;
  if (rol !== "OWNER" && rol !== "OPERADOR") redirect("/");

  const crudo = (await searchParams).ids;
  const ids = (Array.isArray(crudo) ? crudo.join(",") : (crudo ?? ""))
    .split(",")
    .map((id) => id.trim())
    .filter((id) => /^[A-Za-z0-9]+$/.test(id))
    .slice(0, MAX_PEDIDOS);

  const pedidos =
    ids.length === 0
      ? []
      : await prisma.zonaSurPedido.findMany({
          // El operador solo puede imprimir pedidos confirmados, aunque pida otro id a mano.
          where: { id: { in: ids }, ...(rol === "OPERADOR" ? { estado: "CONFIRMADO" } : {}) },
          orderBy: { createdAt: "asc" },
          include: INCLUDE_ETIQUETA,
        });

  const etiquetas = armarEtiquetas(pedidos);

  const formatoCrudo = (await searchParams).formato;
  const formato: FormatoEtiqueta = (Array.isArray(formatoCrudo) ? formatoCrudo[0] : formatoCrudo) === "a4" ? "a4" : "etiquetera";
  const hojas = Math.ceil(etiquetas.length / ETIQUETAS_POR_HOJA_A4);
  const hrefFormato = (f: FormatoEtiqueta) => `/imprimir-etiquetas?ids=${ids.join(",")}${f === "a4" ? "&formato=a4" : ""}`;

  return (
    <div className="etq-pagina p-6">
      <EtiquetaEstilos formato={formato} />

      <div className="no-imprimir mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">
            {etiquetas.length} {etiquetas.length === 1 ? "etiqueta" : "etiquetas"}
          </h1>
          {formato === "a4" ? (
            <p className="text-sm text-muted-foreground">
              {ETIQUETAS_POR_HOJA_A4} etiquetas por hoja A4 ({hojas} {hojas === 1 ? "hoja" : "hojas"}), con borde fino para
              recortarlas. En el cuadro de impresión elegí papel A4, márgenes &quot;Predeterminados&quot;, escala 100 % y
              desactivá &quot;Encabezados y pies de página&quot;.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Tamaño {ETIQUETA_ANCHO_MM} × {ETIQUETA_ALTO_MM} mm, una por página (impresora de etiquetas). En el cuadro de
              impresión poné márgenes en &quot;Ninguno&quot; y desactivá &quot;Encabezados y pies de página&quot;.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Formato de impresión">
            <Link
              href={hrefFormato("etiquetera")}
              aria-current={formato === "etiquetera" ? "true" : undefined}
              className={cn(buttonVariants({ variant: formato === "etiquetera" ? "default" : "outline", size: "sm" }))}
            >
              Una por página
            </Link>
            <Link
              href={hrefFormato("a4")}
              aria-current={formato === "a4" ? "true" : undefined}
              className={cn(buttonVariants({ variant: formato === "a4" ? "default" : "outline", size: "sm" }))}
            >
              Varias por hoja (A4)
            </Link>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/etiquetas" className="inline-flex h-8 items-center rounded-lg border px-3 text-sm hover:bg-muted">
            Volver
          </Link>
          {etiquetas.length > 0 && <BotonImprimir />}
        </div>
      </div>

      {etiquetas.length === 0 ? (
        <p className="no-imprimir text-muted-foreground">No se encontraron pedidos para imprimir.</p>
      ) : formato === "a4" ? (
        <EtiquetasEnHojas etiquetas={etiquetas} />
      ) : (
        <div className="etq-hoja">
          {etiquetas.map((e) => (
            <EtiquetaPack key={e.clave} etiqueta={e} />
          ))}
        </div>
      )}
    </div>
  );
}
