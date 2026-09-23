import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { NuevoUsuarioDialog } from "@/components/usuarios/nuevo-usuario-dialog";
import { ToggleUsuarioButton } from "@/components/usuarios/toggle-usuario-button";

const ROLE_LABEL: Record<string, string> = { OWNER: "Dueño", OPERADOR: "Operador (fábrica)" };

export default async function UsuariosPage() {
  const session = await getSession();
  // El proxy ya bloquea a un OPERADOR antes de llegar acá; esto es una segunda barrera.
  if (!session || session.user.role !== "OWNER") redirect("/");

  const usuarios = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Usuarios</h1>
          <p className="text-muted-foreground">
            Quién entra al sistema. Un operador (fábrica) solo ve la pantalla de Producción.
          </p>
        </div>
        <NuevoUsuarioDialog />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Acceso</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {usuarios.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="font-medium">{u.nombre}</TableCell>
              <TableCell>{u.email}</TableCell>
              <TableCell>
                <Badge variant={u.role === "OWNER" ? "default" : "secondary"}>
                  {ROLE_LABEL[u.role] ?? u.role}
                </Badge>
              </TableCell>
              <TableCell>
                {u.activo ? (
                  <span className="text-muted-foreground">Activo</span>
                ) : (
                  <Badge variant="destructive">Desactivado</Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <ToggleUsuarioButton userId={u.id} activo={u.activo} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
