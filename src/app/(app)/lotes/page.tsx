import { prisma } from "@/lib/db";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { NuevoLoteDialog } from "@/components/lotes/nuevo-lote-dialog";
import { MarcarRecibidoButton } from "@/components/lotes/marcar-recibido-button";

const ESTADO_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  PLANIFICADO: "outline",
  EN_FABRICA: "secondary",
  RECIBIDO: "default",
};

export default async function LotesPage() {
  const [lotes, skus] = await Promise.all([
    prisma.loteProduccion.findMany({
      orderBy: { fecha: "desc" },
      include: { sku: true },
    }),
    prisma.sku.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Lotes de producción</h1>
          <p className="text-muted-foreground">
            Cargá los lotes que manda la fábrica y marcalos como recibidos cuando lleguen.
          </p>
        </div>
        <NuevoLoteDialog skus={skus} />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Lote</TableHead>
            <TableHead>Producto</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Cantidad</TableHead>
            <TableHead>Costo unitario</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lotes.map((lote) => (
            <TableRow key={lote.id}>
              <TableCell className="font-medium">{lote.numeroLote}</TableCell>
              <TableCell>{lote.sku.nombre}</TableCell>
              <TableCell>{lote.fecha.toLocaleDateString("es-AR")}</TableCell>
              <TableCell>{lote.cantidadUnidades.toString()}</TableCell>
              <TableCell>
                {lote.costoUnitarioSnapshot ? `$${lote.costoUnitarioSnapshot.toString()}` : "—"}
              </TableCell>
              <TableCell>
                <Badge variant={ESTADO_VARIANT[lote.estado]}>{lote.estado}</Badge>
              </TableCell>
              <TableCell className="text-right">
                {lote.estado !== "RECIBIDO" && <MarcarRecibidoButton loteId={lote.id} />}
              </TableCell>
            </TableRow>
          ))}
          {lotes.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                Todavía no cargaste lotes de producción.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
