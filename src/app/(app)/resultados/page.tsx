import Link from "next/link";
import { calcularResultadosMes } from "@/lib/resultados";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function fmt(n: { toFixed: (d: number) => string }) {
  return `$${n.toFixed(2)}`;
}

export default async function ResultadosPage({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string; mes?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const anio = params.anio ? parseInt(params.anio, 10) : now.getUTCFullYear();
  const mes = params.mes ? parseInt(params.mes, 10) : now.getUTCMonth() + 1;

  const resultado = await calcularResultadosMes(anio, mes);

  const prev = mes === 1 ? { anio: anio - 1, mes: 12 } : { anio, mes: mes - 1 };
  const next = mes === 12 ? { anio: anio + 1, mes: 1 } : { anio, mes: mes + 1 };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Estado de resultados</h1>
          <p className="text-muted-foreground">
            {MESES[mes - 1]} {anio} · {resultado.cantidadPedidos} pedido(s)
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/resultados?anio=${prev.anio}&mes=${prev.mes}`}>
            <Button variant="outline" size="sm">← Mes anterior</Button>
          </Link>
          <Link href={`/resultados?anio=${next.anio}&mes=${next.mes}`}>
            <Button variant="outline" size="sm">Mes siguiente →</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground">Ingresos</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{fmt(resultado.ingresos)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground">Costo de mercadería vendida</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{fmt(resultado.cmv)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground">Margen bruto</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{fmt(resultado.margenBruto)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground">Gastos operativos</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{fmt(resultado.gastos)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground">Margen neto</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{fmt(resultado.margenNeto)}</CardContent>
        </Card>
      </div>

      <p className="text-sm text-muted-foreground">
        Ingresos: suma de los pedidos cargados con fecha en el mes. CMV: costo de cada
        unidad vendida al momento de la venta (no cambia si después actualizás costos).
        Gastos: lo cargado en la sección Gastos con fecha en el mes.
      </p>
    </div>
  );
}
