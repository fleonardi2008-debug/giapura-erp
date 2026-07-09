import Link from "next/link";
import { prisma } from "@/lib/db";
import { calcularCostoUnitario } from "@/lib/costing";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NuevoSkuDialog } from "@/components/skus/nuevo-sku-dialog";

export default async function SkusPage() {
  const skus = await prisma.sku.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } });
  const costos = await Promise.all(skus.map((s) => calcularCostoUnitario(s.id)));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Productos (SKU)</h1>
          <p className="text-muted-foreground">Recetas y costo unitario vigente de cada producto.</p>
        </div>
        <NuevoSkuDialog />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Costo insumos</TableHead>
            <TableHead>Costo fábrica</TableHead>
            <TableHead>Costo unitario total</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {skus.map((sku, i) => {
            const costo = costos[i];
            return (
              <TableRow key={sku.id}>
                <TableCell className="font-medium">{sku.codigo}</TableCell>
                <TableCell>{sku.nombre}</TableCell>
                <TableCell>${costo.costoInsumos.toFixed(2)}</TableCell>
                <TableCell>${costo.costoFabrica.toFixed(2)}</TableCell>
                <TableCell className="font-semibold">
                  ${costo.costoTotal.toFixed(2)}
                  {costo.faltantes.length > 0 && (
                    <span className="ml-2 text-xs font-normal text-destructive">incompleto</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`/skus/${sku.id}`} className="text-sm underline">
                    Ver detalle
                  </Link>
                </TableCell>
              </TableRow>
            );
          })}
          {skus.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                Todavía no cargaste productos.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
