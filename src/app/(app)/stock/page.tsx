import { prisma } from "@/lib/db";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AjustarStockDialog } from "@/components/stock/ajustar-stock-dialog";

export default async function StockPage() {
  const [insumos, skus] = await Promise.all([
    prisma.insumo.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
      include: { stockActual: true },
    }),
    prisma.sku.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
      include: { stockActual: true },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Stock</h1>
        <p className="text-muted-foreground">Materia prima y producto terminado disponible.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Materia prima</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Insumo</TableHead>
                <TableHead>Stock actual</TableHead>
                <TableHead>Stock mínimo</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {insumos.map((insumo) => {
                const cantidad = insumo.stockActual?.cantidadActual;
                const bajoStock = cantidad != null && cantidad.lt(insumo.stockMinimo);
                return (
                  <TableRow key={insumo.id}>
                    <TableCell className="font-medium">{insumo.nombre}</TableCell>
                    <TableCell>
                      {cantidad?.toString() ?? "0"} {insumo.unidadMedida}
                    </TableCell>
                    <TableCell>
                      {insumo.stockMinimo.toString()} {insumo.unidadMedida}
                    </TableCell>
                    <TableCell>
                      {bajoStock && <Badge variant="destructive">Stock bajo</Badge>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Producto terminado</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Stock actual</TableHead>
                <TableHead>Costo promedio ponderado</TableHead>
                <TableHead>Valor de stock</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {skus.map((sku) => {
                const cantidad = sku.stockActual?.cantidadActual;
                const costo = sku.stockActual?.costoPromedioPonderado;
                return (
                  <TableRow key={sku.id}>
                    <TableCell className="font-medium">{sku.nombre}</TableCell>
                    <TableCell>{cantidad?.toString() ?? "0"}</TableCell>
                    <TableCell>{costo ? `$${costo.toString()}` : "—"}</TableCell>
                    <TableCell>
                      {cantidad && costo ? `$${cantidad.times(costo).toFixed(2)}` : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <AjustarStockDialog
                        skuId={sku.id}
                        skuNombre={sku.nombre}
                        stockActual={cantidad?.toString() ?? "0"}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
