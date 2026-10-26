"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DatosAndreani } from "@/components/zona-sur/datos-andreani";

/** Botón "Datos de envío": abre una ventana con todos los datos del pedido y botones para copiarlos. */
export function DatosEnvioBoton({
  filas,
  cliente,
}: {
  filas: { etiqueta: string; valor: string }[];
  cliente: string;
}) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <Button type="button" variant="outline" size="sm" className="mt-1" onClick={() => setAbierto(true)}>
        Datos de envío
      </Button>
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Datos de envío — {cliente}</DialogTitle>
          </DialogHeader>
          <DatosAndreani filas={filas} plegable={false} />
        </DialogContent>
      </Dialog>
    </>
  );
}
