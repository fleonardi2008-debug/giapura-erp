import Link from "next/link";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ReposicionPage() {
  const [insumos, productos] = await Promise.all([
    prisma.insumo.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, unidadMedida: true, stockMinimo: true, stockActual: { select: { cantidadActual: true } } },
    }),
    prisma.sku.findMany({
      where: { nivel: { in: ["FRASCO", "PACK"] }, activo: true, stockMinimo: { not: null } },
      orderBy: { nombre: "asc" },
      select: {
        id: true,
        nombre: true,
        nivel: true,
        stockMinimo: true,
        stockActual: { select: { cantidadActual: true } },
        stockZona: { select: { cantidadActual: true } },
      },
    }),
  ]);

  const insumosBajoMinimo = insumos.filter(
    (i) => i.stockActual && i.stockActual.cantidadActual.lt(i.stockMinimo)
  );

  const productosConTotal = productos.map((p) => {
    const fabrica = p.stockActual?.cantidadActual ?? new Prisma.Decimal(0);
    const zona = p.stockZona?.cantidadActual ?? 0;
    const total = fabrica.plus(zona);
    return { ...p, fabrica, zona, total };
  });
  const productosBajoMinimo = productosConTotal.filter((p) => p.total.lt(p.stockMinimo!));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Reposición</h1>
        <p className="text-muted-foreground">
          Qué está por debajo del mínimo: insumos en fábrica, y frascos/packs contando
          fábrica + mi zona.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Insumos para comprar</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Insumo</TableHead>
                <TableHead>Stock actual</TableHead>
                <TableHead>Mínimo</TableHead>
                <TableHead>Falta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {insumosBajoMinimo.map((i) => {
                const actual = i.stockActual!.cantidadActual;
                const falta = i.stockMinimo.minus(actual);
                return (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.nombre}</TableCell>
                    <TableCell>
                      {actual.toString()} {i.unidadMedida}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {i.stockMinimo.toString()} {i.unidadMedida}
                    </TableCell>
                    <TableCell>
                      <Badge variant="destructive">
                        {falta.toString()} {i.unidadMedida}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
              {insumosBajoMinimo.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Ningún insumo por debajo del mínimo.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Frascos y packs para producir</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>En fábrica</TableHead>
                <TableHead>En mi zona</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Mínimo</TableHead>
                <TableHead>Falta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productosBajoMinimo.map((p) => {
                const falta = p.stockMinimo! - p.total.toNumber();
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      <Link href={`/skus/${p.id}`} className="hover:underline">
                        {p.nombre}
                      </Link>
                    </TableCell>
                    <TableCell>{p.fabrica.toString()}</TableCell>
                    <TableCell>{p.zona}</TableCell>
                    <TableCell>{p.total.toString()}</TableCell>
                    <TableCell className="text-muted-foreground">{p.stockMinimo}</TableCell>
                    <TableCell>
                      <Badge variant="destructive">{falta}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
              {productosBajoMinimo.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Ningún frasco o pack por debajo del mínimo.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <p className="mt-3 text-xs text-muted-foreground">
            Solo aparecen acá los productos que tienen un stock mínimo configurado (Productos
            → Editar economía).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
