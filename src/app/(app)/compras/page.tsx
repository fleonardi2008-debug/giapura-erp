import { prisma } from "@/lib/db";
import { calcularComprasMes } from "@/lib/compras";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NuevaCompraDialog } from "@/components/compras/nueva-compra-dialog";
import { CompraAcciones } from "@/components/compras/compra-acciones";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const ESTADO_LABEL: Record<string, string> = {
  COMPRADO: "En camino",
  RECIBIDO: "Recibido",
  CANCELADO: "Cancelado",
};

const ESTADO_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  COMPRADO: "secondary",
  RECIBIDO: "default",
  CANCELADO: "outline",
};

export default async function ComprasPage() {
  const now = new Date();
  const anio = now.getUTCFullYear();
  const mes = now.getUTCMonth() + 1;

  const [compras, insumos, resumen] = await Promise.all([
    prisma.compraInsumo.findMany({
      orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
      take: 200,
      include: { insumo: true },
    }),
    prisma.insumo.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, unidadMedida: true },
    }),
    calcularComprasMes(anio, mes),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Compras de insumos</h1>
          <p className="text-muted-foreground">
            Lo que compraste, lo que ya llegó a la fábrica y la plata que salió.
          </p>
        </div>
        <NuevaCompraDialog insumos={insumos} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground">
              Gastado en compras · {MESES[mes - 1]}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">${resumen.total.toFixed(2)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground">
              En camino (todavía no llegó)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">${resumen.enCamino.toFixed(2)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground">
              Ya recibido en fábrica
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">${resumen.recibido.toFixed(2)}</CardContent>
        </Card>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Insumo</TableHead>
            <TableHead>Cantidad</TableHead>
            <TableHead>Costo unitario</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Proveedor</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {compras.map((compra) => (
            <TableRow key={compra.id} className={compra.estado === "CANCELADO" ? "opacity-50" : ""}>
              <TableCell>{compra.fecha.toLocaleDateString("es-AR", { timeZone: "UTC" })}</TableCell>
              <TableCell className="font-medium">{compra.insumo.nombre}</TableCell>
              <TableCell>
                {compra.cantidad.toString()} {compra.insumo.unidadMedida}
              </TableCell>
              <TableCell>${compra.costoUnitario.toString()}</TableCell>
              <TableCell>${compra.costoTotal.toFixed(2)}</TableCell>
              <TableCell>{compra.proveedor ?? "—"}</TableCell>
              <TableCell>
                <Badge variant={ESTADO_VARIANT[compra.estado]}>{ESTADO_LABEL[compra.estado]}</Badge>
                {compra.recibidaAt && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    {compra.recibidaAt.toLocaleDateString("es-AR")}
                  </span>
                )}
              </TableCell>
              <TableCell className="text-right">
                {compra.estado === "COMPRADO" && <CompraAcciones compraId={compra.id} />}
              </TableCell>
            </TableRow>
          ))}
          {compras.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground">
                Todavía no registraste compras.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <p className="text-sm text-muted-foreground">
        Una compra suma al stock disponible recién cuando la marcás como &quot;Llegó a la
        fábrica&quot;. La plata cuenta desde que la registrás. Las compras son plata que sale de
        caja: no se restan otra vez en el estado de resultados, porque el costo de los insumos
        ya entra ahí cuando vendés el producto.
      </p>
    </div>
  );
}
