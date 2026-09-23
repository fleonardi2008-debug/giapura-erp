"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createUsuario } from "@/lib/actions/usuarios";

const ROLE_LABEL: Record<string, string> = {
  OPERADOR: "Operador (fábrica) — solo ve Producción",
  OWNER: "Dueño — ve todo el sistema",
};

export function NuevoUsuarioDialog() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createUsuario(formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Usuario creado");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>Nuevo usuario</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo usuario</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="role">Tipo de acceso</Label>
            <Select name="role" defaultValue="OPERADOR">
              <SelectTrigger id="role" className="w-full">
                <SelectValue>
                  {(value) => ROLE_LABEL[value as string] ?? "Elegí un tipo"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OPERADOR">{ROLE_LABEL.OPERADOR}</SelectItem>
                <SelectItem value="OWNER">{ROLE_LABEL.OWNER}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" name="nombre" required placeholder="Ej: Fábrica OPQ" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required placeholder="tu@email.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              name="password"
              type="text"
              required
              minLength={8}
              placeholder="Mínimo 8 caracteres"
            />
            <p className="text-xs text-muted-foreground">
              Se la pasás vos a la persona. No queda visible después de crearla.
            </p>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Creando..." : "Crear usuario"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
