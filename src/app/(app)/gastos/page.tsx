import { prisma } from "@/lib/db";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NuevoGastoDialog } from "@/components/gastos/nuevo-gasto-dialog";
import { EliminarGastoButton } from "@/components/gastos/eliminar-gasto-button";

const CATEGORIA_LABEL: Record<string, string> = {
  COMISION_TIENDANUBE: "Comisión Tienda Nube",
  COMISION_MERCADOPAGO: "Comisión Mercado Pago",
  ENVIO: "Envío",
  MARKETING: "Marketing",
  FIJO: "Gasto fijo",
  OTRO: "Otro",
};

export default async function GastosPage() {
  const gastos = await prisma.gasto.findMany({ orderBy: { fecha: "desc" }, take: 200 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Gastos</h1>
          <p className="text-muted-foreground">Comisiones, envíos, marketing y otros gastos operativos.</p>
        </div>
        <NuevoGastoDialog />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead>Monto</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {gastos.map((gasto) => (
            <TableRow key={gasto.id}>
              <TableCell>{gasto.fecha.toLocaleDateString("es-AR")}</TableCell>
              <TableCell>{CATEGORIA_LABEL[gasto.categoria]}</TableCell>
              <TableCell>{gasto.descripcion}</TableCell>
              <TableCell>${gasto.monto.toFixed(2)}</TableCell>
              <TableCell className="text-right">
                <EliminarGastoButton gastoId={gasto.id} />
              </TableCell>
            </TableRow>
          ))}
          {gastos.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                Todavía no cargaste gastos.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
