import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { Prisma } from "@/generated/prisma/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TransferirDialog } from "@/components/mi-zona/transferir-dialog";
import { AjustarZonaDialog } from "@/components/mi-zona/ajustar-zona-dialog";

export default async function MiZonaPage() {
  const session = await getSession();
  // El proxy ya bloquea a un OPERADOR; esto es una segunda barrera (es stock del dueño).
  if (!session || session.user.role !== "OWNER") redirect("/");

  const productos = await prisma.sku.findMany({
    where: { nivel: { in: ["FRASCO", "PACK"] }, activo: true },
    orderBy: { nombre: "asc" },
    select: {
      id: true,
      nombre: true,
      nivel: true,
      stockActual: { select: { cantidadActual: true, costoPromedioPonderado: true } },
      stockZona: { select: { cantidadActual: true } },
    },
  });

  const filas = productos.map((p) => {
    const fabrica = p.stockActual?.cantidadActual ?? new Prisma.Decimal(0);
    const zona = p.stockZona?.cantidadActual ?? 0;
    const costo = p.stockActual?.costoPromedioPonderado ?? null;
    return {
      id: p.id,
      nombre: p.nombre,
      fabrica: fabrica.toString(),
      zona,
      valorZona: costo ? costo.times(zona).toFixed(2) : null,
    };
  });

  const totalValorZona = filas.reduce((sum, f) => sum + (f.valorZona ? Number(f.valorZona) : 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Mi zona</h1>
          <p className="text-muted-foreground">
            Frascos y packs que te llevaste del depósito para vender por tu cuenta.
          </p>
        </div>
        <TransferirDialog
          productos={productos.map((p) => ({
            id: p.id,
            nombre: p.nombre,
            stockFabrica: p.stockActual?.cantidadActual.toString() ?? "0",
          }))}
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Producto</TableHead>
            <TableHead>En fábrica</TableHead>
            <TableHead>En mi zona</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filas.map((f) => (
            <TableRow key={f.id}>
              <TableCell className="font-medium">{f.nombre}</TableCell>
              <TableCell className="text-muted-foreground">{f.fabrica}</TableCell>
              <TableCell className="font-semibold">{f.zona}</TableCell>
              <TableCell className="text-right">
                <AjustarZonaDialog skuId={f.id} skuNombre={f.nombre} stockActual={String(f.zona)} />
              </TableCell>
            </TableRow>
          ))}
          {filas.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                Todavía no hay frascos ni packs cargados.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {totalValorZona > 0 && (
        <p className="text-sm text-muted-foreground">
          Valor del stock en mi zona (a costo): ${totalValorZona.toFixed(2)}
        </p>
      )}
    </div>
  );
}
