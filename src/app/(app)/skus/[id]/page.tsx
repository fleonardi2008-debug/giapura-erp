import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { calcularCostoUnitario, getCostoFabricaVigente } from "@/lib/costing";
import { RecetaEditor } from "@/components/skus/receta-editor";
import { ActualizarCostoFabricaDialog } from "@/components/skus/actualizar-costo-fabrica-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SkuDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const sku = await prisma.sku.findUnique({ where: { id } });
  if (!sku) notFound();

  const [insumos, costo, costoFabrica] = await Promise.all([
    prisma.insumo.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
    calcularCostoUnitario(id),
    getCostoFabricaVigente(id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{sku.nombre}</h1>
        <p className="text-muted-foreground">Código {sku.codigo}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground">Costo insumos</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">${costo.costoInsumos.toFixed(2)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground">Costo fábrica</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">${costo.costoFabrica.toFixed(2)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground">Costo unitario total</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">${costo.costoTotal.toFixed(2)}</CardContent>
        </Card>
      </div>

      {costo.faltantes.length > 0 && (
        <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
          {costo.faltantes.map((f) => (
            <p key={f}>{f}</p>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Costo de fábrica</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {costoFabrica
              ? `Vigente: $${costoFabrica.costoPorUnidad.toString()} por unidad`
              : "Sin costo de fábrica cargado"}
          </p>
          <ActualizarCostoFabricaDialog skuId={sku.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Receta (BOM)</CardTitle>
        </CardHeader>
        <CardContent>
          <RecetaEditor
            skuId={sku.id}
            insumos={insumos}
            initialItems={
              costo.receta?.items.map((item) => ({
                insumoId: item.insumoId,
                cantidadPorUnidad: item.cantidadPorUnidad.toString(),
              })) ?? []
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
