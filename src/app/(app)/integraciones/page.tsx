import { prisma } from "@/lib/db";
import { getAuthorizeUrl } from "@/lib/tiendanube/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IntegracionesActions } from "@/components/integraciones/integraciones-actions";

export default async function IntegracionesPage() {
  const [conexion, skus] = await Promise.all([
    prisma.tiendaNubeConexion.findFirst({ where: { activo: true } }),
    prisma.sku.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
  ]);

  const appConfigurada = Boolean(process.env.TIENDANUBE_CLIENT_ID);
  const authorizeUrl = appConfigurada ? getAuthorizeUrl(crypto.randomUUID()) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Integraciones</h1>
        <p className="text-muted-foreground">Conexión con Tienda Nube: pedidos y stock.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tienda Nube</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!appConfigurada && (
            <p className="text-sm text-muted-foreground">
              Todavía falta configurar las credenciales de la app de Tienda Nube
              (variables de entorno) antes de poder conectar.
            </p>
          )}

          {appConfigurada && !conexion && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">No hay ninguna tienda conectada.</p>
              <a
                href={authorizeUrl ?? "#"}
                className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80"
              >
                Conectar con Tienda Nube
              </a>
            </div>
          )}

          {conexion && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <Badge>Conectado</Badge>
                <span className="text-muted-foreground">Tienda #{conexion.storeId}</span>
              </div>
              <IntegracionesActions />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mapeo de productos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Tienda Nube</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {skus.map((sku) => (
                <TableRow key={sku.id}>
                  <TableCell className="font-medium">{sku.codigo}</TableCell>
                  <TableCell>{sku.nombre}</TableCell>
                  <TableCell>
                    {sku.tiendaNubeVariantId ? (
                      <Badge variant="default">Mapeado</Badge>
                    ) : (
                      <Badge variant="outline">Sin mapear</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {skus.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    Todavía no cargaste productos.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <p className="mt-3 text-sm text-muted-foreground">
            El mapeo se hace automáticamente al usar &quot;Sincronizar productos&quot;: matchea
            por el código de SKU contra el campo SKU de cada variante en Tienda Nube.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
