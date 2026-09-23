import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmarLlegadaButton } from "@/components/produccion/confirmar-llegada-button";
import { ReportarFrascoDialog } from "@/components/produccion/reportar-frasco-dialog";
import { ArmarPackDialog } from "@/components/produccion/armar-pack-dialog";

const ESTADO_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  PLANIFICADO: "outline",
  EN_FABRICA: "secondary",
  RECIBIDO: "default",
};

export default async function ProduccionPage() {
  // Todo lo que se consulta acá es deliberadamente sin costos ni plata: esta pantalla
  // la ve también el operador de fábrica, y no debe poder ver esos datos ni por error.
  const [comprasEnCamino, frascos, packsRaw, actividad] = await Promise.all([
    prisma.compraInsumo.findMany({
      where: { estado: "COMPRADO" },
      orderBy: { fecha: "asc" },
      select: {
        id: true,
        cantidad: true,
        fecha: true,
        proveedor: true,
        nota: true,
        insumo: { select: { nombre: true, unidadMedida: true } },
      },
    }),
    prisma.sku.findMany({
      where: { nivel: "FRASCO", activo: true },
      orderBy: { nombre: "asc" },
      select: {
        id: true,
        nombre: true,
        unidadMedida: true,
        stockActual: { select: { cantidadActual: true } },
      },
    }),
    prisma.sku.findMany({
      where: { nivel: "PACK", activo: true },
      orderBy: { nombre: "asc" },
      select: {
        id: true,
        nombre: true,
        stockActual: { select: { cantidadActual: true } },
        composicion: {
          select: { cantidad: true, componente: { select: { id: true, nombre: true } } },
        },
      },
    }),
    prisma.loteProduccion.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
      select: {
        id: true,
        numeroLote: true,
        fecha: true,
        cantidadUnidades: true,
        estado: true,
        sku: { select: { nombre: true } },
      },
    }),
  ]);

  const stockFrascoPorId = new Map(
    frascos.map((f) => [f.id, f.stockActual?.cantidadActual ?? new Prisma.Decimal(0)])
  );

  const packs = packsRaw.map((p) => {
    const maxArmables =
      p.composicion.length === 0
        ? 0
        : Math.min(
            ...p.composicion.map((c) => {
              const disponible = stockFrascoPorId.get(c.componente.id) ?? new Prisma.Decimal(0);
              return Math.floor(disponible.dividedBy(c.cantidad).toNumber());
            })
          );
    const composicionTexto = p.composicion
      .map((c) => `${c.cantidad} ${c.componente.nombre}`)
      .join(" + ");
    return {
      id: p.id,
      nombre: p.nombre,
      stock: p.stockActual?.cantidadActual.toString() ?? "0",
      maxArmables,
      composicionTexto: composicionTexto || "sin composición definida",
    };
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Producción</h1>
        <p className="text-muted-foreground">
          Confirmá lo que llega, cargá lo que se produce y armá los packs.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Insumos en camino</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Insumo</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Fecha de compra</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comprasEnCamino.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.insumo.nombre}</TableCell>
                  <TableCell>
                    {c.cantidad.toString()} {c.insumo.unidadMedida}
                  </TableCell>
                  <TableCell>{c.fecha.toLocaleDateString("es-AR", { timeZone: "UTC" })}</TableCell>
                  <TableCell>{c.proveedor ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <ConfirmarLlegadaButton compraId={c.id} />
                  </TableCell>
                </TableRow>
              ))}
              {comprasEnCamino.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No hay compras en camino.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Frascos</CardTitle>
            <ReportarFrascoDialog frascos={frascos.map((f) => ({ id: f.id, nombre: f.nombre }))} />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Frasco</TableHead>
                <TableHead>Stock disponible</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {frascos.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.nombre}</TableCell>
                  <TableCell>
                    {f.stockActual?.cantidadActual.toString() ?? "0"} {f.unidadMedida}
                  </TableCell>
                </TableRow>
              ))}
              {frascos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground">
                    Todavía no hay frascos cargados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Packs listos para despachar</CardTitle>
            <ArmarPackDialog packs={packs} />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pack</TableHead>
                <TableHead>Compuesto por</TableHead>
                <TableHead>Stock disponible</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packs.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nombre}</TableCell>
                  <TableCell className="text-muted-foreground">{p.composicionTexto}</TableCell>
                  <TableCell>{p.stock}</TableCell>
                </TableRow>
              ))}
              {packs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    Todavía no hay packs cargados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Actividad reciente</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lote</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {actividad.map((lote) => (
                <TableRow key={lote.id}>
                  <TableCell className="font-medium">{lote.numeroLote}</TableCell>
                  <TableCell>{lote.sku.nombre}</TableCell>
                  <TableCell>{lote.fecha.toLocaleDateString("es-AR", { timeZone: "UTC" })}</TableCell>
                  <TableCell>{lote.cantidadUnidades.toString()}</TableCell>
                  <TableCell>
                    <Badge variant={ESTADO_VARIANT[lote.estado]}>{lote.estado}</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {actividad.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Todavía no hay actividad registrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
