import Link from "next/link";
import { prisma } from "@/lib/db";
import { calcularCostoUnitario } from "@/lib/costing";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { NuevoSkuDialog } from "@/components/skus/nuevo-sku-dialog";
import { ToggleSkuActivoButton } from "@/components/skus/toggle-sku-activo-button";

const NIVEL_LABEL: Record<string, string> = { FRASCO: "Frasco", PACK: "Pack" };

export default async function SkusPage() {
  const todos = await prisma.sku.findMany({ orderBy: { nombre: "asc" } });
  const skus = todos.filter((s) => s.activo);
  const desactivados = todos.filter((s) => !s.activo);
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
            <TableHead>Tipo</TableHead>
            <TableHead>Costo variable</TableHead>
            <TableHead>Precio</TableHead>
            <TableHead>Margen</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {skus.map((sku, i) => {
            const costo = costos[i];
            return (
              <TableRow key={sku.id}>
                <TableCell className="font-medium">{sku.codigo}</TableCell>
                <TableCell>{sku.nombre}</TableCell>
                <TableCell>
                  <Badge variant={sku.nivel === "PACK" ? "default" : "secondary"}>
                    {NIVEL_LABEL[sku.nivel] ?? sku.nivel}
                  </Badge>
                </TableCell>
                <TableCell>
                  ${costo.costoTotal.toFixed(2)}
                  {costo.faltantes.length > 0 && (
                    <span className="ml-2 text-xs font-normal text-destructive">incompleto</span>
                  )}
                </TableCell>
                <TableCell>{costo.precioVenta ? `$${costo.precioVenta.toFixed(2)}` : "—"}</TableCell>
                <TableCell className="font-semibold">
                  {costo.margenUnitario ? `$${costo.margenUnitario.toFixed(2)}` : "—"}
                </TableCell>
                <TableCell className="text-right space-x-2 whitespace-nowrap">
                  <Link href={`/skus/${sku.id}`} className="text-sm underline">
                    Ver detalle
                  </Link>
                  <ToggleSkuActivoButton skuId={sku.id} activo={true} />
                </TableCell>
              </TableRow>
            );
          })}
          {skus.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                Todavía no cargaste productos.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {desactivados.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Desactivados</h2>
          <Table>
            <TableBody>
              {desactivados.map((sku) => (
                <TableRow key={sku.id} className="opacity-60">
                  <TableCell className="font-medium">{sku.codigo}</TableCell>
                  <TableCell>{sku.nombre}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{NIVEL_LABEL[sku.nivel] ?? sku.nivel}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <ToggleSkuActivoButton skuId={sku.id} activo={false} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
