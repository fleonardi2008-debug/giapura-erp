import { prisma } from "@/lib/db";
import { getCostoInsumoVigente } from "@/lib/costing";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { NuevoInsumoDialog } from "@/components/insumos/nuevo-insumo-dialog";
import { ActualizarCostoDialog } from "@/components/insumos/actualizar-costo-dialog";
import { RegistrarCompraDialog } from "@/components/insumos/registrar-compra-dialog";
import { DesactivarInsumoButton } from "@/components/insumos/desactivar-insumo-button";

const TIPO_LABEL: Record<string, string> = {
  INGREDIENTE: "Ingrediente",
  PACKAGING: "Packaging",
  OTRO: "Otro",
};

export default async function InsumosPage() {
  const insumos = await prisma.insumo.findMany({
    where: { activo: true },
    orderBy: { nombre: "asc" },
    include: { stockActual: true },
  });

  const costos = await Promise.all(insumos.map((i) => getCostoInsumoVigente(i.id)));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Insumos</h1>
          <p className="text-muted-foreground">Ingredientes y packaging, con su costo vigente.</p>
        </div>
        <NuevoInsumoDialog />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Unidad</TableHead>
            <TableHead>Stock actual</TableHead>
            <TableHead>Stock mínimo</TableHead>
            <TableHead>Costo vigente</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {insumos.map((insumo, i) => {
            const costo = costos[i];
            const bajoStock =
              insumo.stockActual && insumo.stockActual.cantidadActual.lt(insumo.stockMinimo);
            return (
              <TableRow key={insumo.id}>
                <TableCell className="font-medium">{insumo.nombre}</TableCell>
                <TableCell>{TIPO_LABEL[insumo.tipo]}</TableCell>
                <TableCell>{insumo.unidadMedida}</TableCell>
                <TableCell>
                  <span className={bajoStock ? "font-medium text-destructive" : ""}>
                    {insumo.stockActual?.cantidadActual.toString() ?? "0"}
                  </span>
                  {bajoStock && (
                    <Badge variant="destructive" className="ml-2">
                      Bajo stock
                    </Badge>
                  )}
                </TableCell>
                <TableCell>{insumo.stockMinimo.toString()}</TableCell>
                <TableCell>
                  {costo ? (
                    `$${costo.costoUnitario.toString()} / ${insumo.unidadMedida}`
                  ) : (
                    <span className="text-muted-foreground">Sin costo cargado</span>
                  )}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <RegistrarCompraDialog
                    insumoId={insumo.id}
                    insumoNombre={insumo.nombre}
                    unidadMedida={insumo.unidadMedida}
                  />
                  <ActualizarCostoDialog insumoId={insumo.id} insumoNombre={insumo.nombre} />
                  <DesactivarInsumoButton insumoId={insumo.id} />
                </TableCell>
              </TableRow>
            );
          })}
          {insumos.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                Todavía no cargaste insumos.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
