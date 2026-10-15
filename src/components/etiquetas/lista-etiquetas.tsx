"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type FilaEtiqueta = {
  id: string;
  fecha: string;
  cliente: string;
  entrega: string;
  destino: string;
  productos: string[];
};

export function ListaEtiquetas({ filas }: { filas: FilaEtiqueta[] }) {
  const [marcados, setMarcados] = useState<Set<string>>(new Set());

  if (filas.length === 0) {
    return <p className="text-muted-foreground">No hay pedidos en esta lista.</p>;
  }

  const todos = marcados.size === filas.length;

  function alternar(id: string) {
    setMarcados((actual) => {
      const nuevo = new Set(actual);
      if (nuevo.has(id)) nuevo.delete(id);
      else nuevo.add(id);
      return nuevo;
    });
  }

  function imprimir(ids: string[]) {
    window.open(`/imprimir-etiquetas?ids=${ids.join(",")}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4"
            checked={todos}
            onChange={() => setMarcados(todos ? new Set() : new Set(filas.map((f) => f.id)))}
          />
          Marcar todos
        </label>
        <Button disabled={marcados.size === 0} onClick={() => imprimir(filas.filter((f) => marcados.has(f.id)).map((f) => f.id))}>
          {marcados.size === 0
            ? "Imprimir etiquetas"
            : `Imprimir ${marcados.size} ${marcados.size === 1 ? "etiqueta" : "etiquetas"}`}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10" />
            <TableHead>Fecha</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Envío a</TableHead>
            <TableHead>Productos</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {filas.map((f) => (
            <TableRow key={f.id} data-state={marcados.has(f.id) ? "selected" : undefined}>
              <TableCell>
                <input
                  type="checkbox"
                  className="size-4"
                  aria-label={`Marcar el pedido de ${f.cliente}`}
                  checked={marcados.has(f.id)}
                  onChange={() => alternar(f.id)}
                />
              </TableCell>
              <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{f.fecha}</TableCell>
              <TableCell className="font-medium">{f.cliente}</TableCell>
              <TableCell className="text-sm">
                <div>{f.entrega}</div>
                <div className="text-xs text-muted-foreground">{f.destino}</div>
              </TableCell>
              <TableCell className="text-sm">
                {f.productos.map((p) => (
                  <div key={p}>{p}</div>
                ))}
              </TableCell>
              <TableCell className="text-right">
                <Button variant="outline" size="sm" onClick={() => imprimir([f.id])}>
                  Imprimir
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
