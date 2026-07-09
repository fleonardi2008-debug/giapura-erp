import Link from "next/link";
import { prisma } from "@/lib/db";
import { calcularResultadosMes } from "@/lib/resultados";
import { calcularCostoUnitario } from "@/lib/costing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export default async function DashboardPage() {
  const now = new Date();
  const anio = now.getUTCFullYear();
  const mes = now.getUTCMonth() + 1;

  const [resultado, insumosBajoStock, skus, lotesPendientes] = await Promise.all([
    calcularResultadosMes(anio, mes),
    prisma.insumo.findMany({
      where: { activo: true },
      include: { stockActual: true },
    }),
    prisma.sku.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
    prisma.loteProduccion.count({ where: { estado: { not: "RECIBIDO" } } }),
  ]);

  const alertasStock = insumosBajoStock.filter(
    (i) => i.stockActual && i.stockActual.cantidadActual.lt(i.stockMinimo)
  );

  const costos = await Promise.all(skus.map((s) => calcularCostoUnitario(s.id)));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Inicio</h1>
        <p className="text-muted-foreground">
          Resumen de {MESES[mes - 1]} {anio}.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground">Ingresos del mes</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">${resultado.ingresos.toFixed(2)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground">Margen bruto</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">${resultado.margenBruto.toFixed(2)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground">Margen neto</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">${resultado.margenNeto.toFixed(2)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground">Lotes en fábrica</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{lotesPendientes}</CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Alertas de stock bajo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alertasStock.length === 0 && (
              <p className="text-sm text-muted-foreground">Ningún insumo por debajo del mínimo.</p>
            )}
            {alertasStock.map((insumo) => (
              <div key={insumo.id} className="flex items-center justify-between text-sm">
                <span>{insumo.nombre}</span>
                <Badge variant="destructive">
                  {insumo.stockActual?.cantidadActual.toString()} / {insumo.stockMinimo.toString()}{" "}
                  {insumo.unidadMedida}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Costo unitario por producto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {skus.length === 0 && (
              <p className="text-sm text-muted-foreground">Todavía no cargaste productos.</p>
            )}
            {skus.map((sku, i) => (
              <div key={sku.id} className="flex items-center justify-between text-sm">
                <Link href={`/skus/${sku.id}`} className="hover:underline">
                  {sku.nombre}
                </Link>
                <span className="font-medium">
                  ${costos[i].costoTotal.toFixed(2)}
                  {costos[i].faltantes.length > 0 && (
                    <span className="ml-1 text-xs font-normal text-destructive">incompleto</span>
                  )}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
