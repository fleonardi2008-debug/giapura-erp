import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { calcularCostoUnitario, getCostoFabricaVigente } from "@/lib/costing";
import { RecetaEditor } from "@/components/skus/receta-editor";
import { ActualizarCostoFabricaDialog } from "@/components/skus/actualizar-costo-fabrica-dialog";
import { EditarEconomiaDialog } from "@/components/skus/editar-economia-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Prisma } from "@/generated/prisma/client";

function fmt(n: { toFixed: (d: number) => string } | null) {
  return n ? `$${n.toFixed(2)}` : "—";
}

const TIPO_LABEL: Record<string, string> = {
  INGREDIENTE: "Materia prima",
  PACKAGING: "Packaging",
  OTRO: "Otros insumos",
};

const TIPO_ORDEN = ["INGREDIENTE", "PACKAGING", "OTRO"];

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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{sku.nombre}</h1>
          <p className="text-muted-foreground">Código {sku.codigo}</p>
        </div>
        <EditarEconomiaDialog
          skuId={sku.id}
          precioVenta={sku.precioVenta?.toString() ?? null}
          perdidaPct={sku.perdidaPct.toString()}
          gastosGeneralesMensuales={sku.gastosGeneralesMensuales?.toString() ?? null}
          produccionMensualEstimada={sku.produccionMensualEstimada}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground">Costo insumos (con merma)</CardTitle>
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
            <CardTitle className="text-sm font-normal text-muted-foreground">Costo variable (marginal)</CardTitle>
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
          <CardTitle>Desglose de insumos</CardTitle>
        </CardHeader>
        <CardContent>
          {costo.detalleInsumos.length === 0 ? (
            <p className="text-center text-muted-foreground">Esta receta todavía no tiene insumos.</p>
          ) : (
            <div className="space-y-6">
              {TIPO_ORDEN.filter((tipo) => costo.detalleInsumos.some((i) => i.tipo === tipo)).map(
                (tipo) => {
                  const items = costo.detalleInsumos.filter((i) => i.tipo === tipo);
                  const subtotalGrupo = items.reduce(
                    (sum, i) => sum.plus(i.subtotal),
                    new Prisma.Decimal(0)
                  );
                  return (
                    <div key={tipo}>
                      <p className="mb-2 text-sm font-medium text-muted-foreground">
                        {TIPO_LABEL[tipo] ?? tipo}
                      </p>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Insumo</TableHead>
                            <TableHead>Cantidad por unidad</TableHead>
                            <TableHead>Costo por unidad de medida</TableHead>
                            <TableHead>Subtotal</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((item) => (
                            <TableRow key={item.insumoId}>
                              <TableCell className="font-medium">{item.nombre}</TableCell>
                              <TableCell>
                                {item.cantidadPorUnidad.toString()} {item.unidadMedida}
                              </TableCell>
                              <TableCell>
                                {item.costoPorUnidadMedida
                                  ? `$${item.costoPorUnidadMedida.toString()} / ${item.unidadMedida}`
                                  : "Sin costo cargado"}
                              </TableCell>
                              <TableCell>${item.subtotal.toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <p className="mt-1 text-right text-sm text-muted-foreground">
                        Subtotal {TIPO_LABEL[tipo]?.toLowerCase() ?? tipo}:{" "}
                        <span className="font-medium text-foreground">${subtotalGrupo.toFixed(2)}</span>
                      </p>
                    </div>
                  );
                }
              )}
            </div>
          )}
          {costo.perdidaPct.greaterThan(0) && (
            <p className="mt-4 text-sm text-muted-foreground">
              Subtotal insumos: ${costo.costoInsumosBase.toFixed(2)} + {costo.perdidaPct.toString()}%
              de merma = <span className="font-medium text-foreground">${costo.costoInsumos.toFixed(2)}</span>
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Economía unitaria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">Precio de venta</p>
              <p className="text-xl font-semibold">{fmt(costo.precioVenta)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Gastos generales / unidad</p>
              <p className="text-xl font-semibold">${costo.gastoGeneralPorUnidad.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Costo unitario completo</p>
              <p className="text-xl font-semibold">${costo.costoUnitarioCompleto.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Margen unitario</p>
              <p className="text-xl font-semibold">{fmt(costo.margenUnitario)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Contribución marginal</p>
              <p className="text-xl font-semibold">{fmt(costo.contribucionMarginal)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Punto de equilibrio</p>
              <p className="text-xl font-semibold">
                {costo.puntoEquilibrioUnidades
                  ? `${costo.puntoEquilibrioUnidades.toFixed(0)} unidades/mes`
                  : "—"}
              </p>
            </div>
          </div>
          {!costo.precioVenta && (
            <p className="mt-4 text-sm text-muted-foreground">
              Cargá un precio de venta en &quot;Editar economía&quot; para ver margen, contribución
              marginal y punto de equilibrio.
            </p>
          )}
        </CardContent>
      </Card>

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
            insumos={insumos.map((i) => ({ id: i.id, nombre: i.nombre, unidadMedida: i.unidadMedida }))}
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
