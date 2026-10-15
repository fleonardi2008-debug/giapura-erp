import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { EtiquetaEstilos, EtiquetaPack } from "@/components/etiquetas/etiqueta-pack";
import { BotonImprimir } from "@/components/etiquetas/boton-imprimir";
import { INCLUDE_ETIQUETA, armarEtiquetas, ETIQUETA_ALTO_MM, ETIQUETA_ANCHO_MM } from "@/lib/etiquetas";

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

  return (
    <div className="etq-pagina p-6">
      <EtiquetaEstilos />

      <div className="no-imprimir mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">
            {etiquetas.length} {etiquetas.length === 1 ? "etiqueta" : "etiquetas"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Tamaño {ETIQUETA_ANCHO_MM} × {ETIQUETA_ALTO_MM} mm, una por página. En el cuadro de impresión poné márgenes
            en &quot;Ninguno&quot; y desactivá &quot;Encabezados y pies de página&quot;.
          </p>
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
