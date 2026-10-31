"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { guardarPuntosRuta, guardarUbicacionPedido } from "@/lib/actions/zona-sur";
import { ubicarDireccion, type Punto } from "@/lib/zona-sur-geo";
import { calcularRuta, enlacesGoogleMaps, type ResultadoRuta } from "@/lib/zona-sur-ruta";

type PedidoRuta = { id: string; nombre: string; direccion: string; lat: number | null; lng: number | null; estado: string };

const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));
const min = (n: number) => `${Math.max(1, Math.round(n))} min`;
const horas = (n: number) => (n >= 60 ? `${Math.floor(n / 60)} h ${Math.round(n % 60)} min` : min(n));

export function PlanificadorRuta({
  centro,
  inicioInicial,
  retiroInicial,
  finInicial,
  pedidos,
}: {
  centro: Punto;
  inicioInicial: string;
  retiroInicial: string;
  finInicial: string;
  pedidos: PedidoRuta[];
}) {
  const [inicio, setInicio] = useState(inicioInicial);
  const [retiro, setRetiro] = useState(retiroInicial);
  const [fin, setFin] = useState(finInicial);
  const [elegidos, setElegidos] = useState<Set<string>>(new Set(pedidos.map((p) => p.id)));
  const [calculando, setCalculando] = useState(false);
  const [progreso, setProgreso] = useState("");
  const [resultado, setResultado] = useState<{
    ruta: ResultadoRuta;
    inicio: string;
    retiro: string;
    fin: string;
    enlaces: string[];
    sinUbicar: PedidoRuta[];
  } | null>(null);

  function alternar(id: string) {
    setElegidos((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(id)) nuevo.delete(id);
      else nuevo.add(id);
      return nuevo;
    });
  }

  async function calcular() {
    setCalculando(true);
    setResultado(null);
    try {
      setProgreso("Ubicando salida y retiro…");
      const pInicio = await ubicarDireccion(inicio, centro);
      await pausa(1100);
      const pRetiro = await ubicarDireccion(retiro, centro);
      let pFin: Awaited<ReturnType<typeof ubicarDireccion>> | null = null;
      if (fin.trim()) {
        await pausa(1100);
        pFin = await ubicarDireccion(fin, centro);
      }
      if (pInicio.estado !== "ok" || pRetiro.estado !== "ok" || (pFin && pFin.estado !== "ok")) {
        const cual = pInicio.estado !== "ok" ? "la salida" : pRetiro.estado !== "ok" ? "el lugar de retiro" : "la llegada";
        toast.error(`No pude ubicar ${cual}. Probá con calle, número y localidad.`);
        return;
      }
      await guardarPuntosRuta(inicio, retiro, fin);

      const paradas: { id: string; punto: Punto }[] = [];
      const sinUbicar: PedidoRuta[] = [];
      const lista = pedidos.filter((p) => elegidos.has(p.id));
      for (let i = 0; i < lista.length; i++) {
        const p = lista[i];
        if (p.lat != null && p.lng != null) {
          paradas.push({ id: p.id, punto: { lat: p.lat, lng: p.lng } });
          continue;
        }
        setProgreso(`Ubicando domicilios (${i + 1} de ${lista.length})…`);
        await pausa(1100);
        const u = await ubicarDireccion(p.direccion, centro);
        if (u.estado === "ok") {
          paradas.push({ id: p.id, punto: u.punto });
          // se guarda para no tener que buscarla la próxima vez
          guardarUbicacionPedido(p.id, u.punto.lat, u.punto.lng).catch(() => {});
        } else {
          sinUbicar.push(p);
        }
      }
      if (paradas.length === 0) {
        toast.error("No pude ubicar ningún domicilio.");
        return;
      }

      setProgreso("Calculando el mejor orden…");
      const ruta = await calcularRuta(pInicio.punto, pRetiro.punto, paradas, pFin ? pFin.punto : null);
      if (!ruta) {
        toast.error("No pude calcular la ruta ahora. Probá de nuevo en un momento.");
        return;
      }
      // Los enlaces de Google Maps llevan coordenadas (no texto): así no confunde una dirección con otro lugar del país.
      const texto = (pt: Punto) => `${pt.lat},${pt.lng}`;
      const puntoDe = new Map(paradas.map((x) => [x.id, x.punto]));
      const entregas = ruta.orden.map((t) => texto(puntoDe.get(t.paradaId)!));
      const destino = pFin ? texto(pFin.punto) : entregas[entregas.length - 1];
      const enlaces = enlacesGoogleMaps(
        texto(pInicio.punto),
        [texto(pRetiro.punto), ...(pFin ? entregas : entregas.slice(0, -1))],
        destino
      );
      setResultado({ ruta, inicio, retiro, fin: fin.trim(), enlaces, sinUbicar });
    } catch {
      toast.error("Algo salió mal al calcular la ruta. Probá de nuevo.");
    } finally {
      setCalculando(false);
      setProgreso("");
    }
  }

  const porId = new Map(pedidos.map((p) => [p.id, p]));
  const enlaces = resultado?.enlaces ?? [];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="space-y-1 text-sm">
          <span className="font-medium">Salgo desde</span>
          <input
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
            className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Primera parada: busco las cajas en</span>
          <input
            value={retiro}
            onChange={(e) => setRetiro(e.target.value)}
            className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Termino en (opcional)</span>
          <input
            value={fin}
            onChange={(e) => setFin(e.target.value)}
            placeholder="Vacío = en la última entrega"
            className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </label>
      </div>

      {pedidos.length === 0 ? (
        <p className="text-muted-foreground">No hay entregas a domicilio pendientes.</p>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">
              Domicilios ({elegidos.size} de {pedidos.length} elegidos)
            </p>
            <div className="flex gap-3 text-sm">
              <button type="button" className="underline" onClick={() => setElegidos(new Set(pedidos.map((p) => p.id)))}>
                Elegir todos
              </button>
              <button type="button" className="underline" onClick={() => setElegidos(new Set())}>
                Ninguno
              </button>
            </div>
          </div>
          <ul className="divide-y rounded-xl border">
            {pedidos.map((p) => (
              <li key={p.id}>
                <label className="flex cursor-pointer items-start gap-3 p-3">
                  <input
                    type="checkbox"
                    checked={elegidos.has(p.id)}
                    onChange={() => alternar(p.id)}
                    className="mt-1 size-5 shrink-0"
                  />
                  <span className="min-w-0 text-sm">
                    <span className="block font-medium">{p.nombre}</span>
                    <span className="block text-muted-foreground">{p.direccion}</span>
                  </span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {p.estado === "PREPARADO" ? "Preparado" : "Pendiente"}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" size="lg" onClick={calcular} disabled={calculando || elegidos.size === 0}>
          {calculando ? "Calculando…" : "Calcular la mejor ruta"}
        </Button>
        {progreso && <span className="text-sm text-muted-foreground">{progreso}</span>}
      </div>

      {resultado && (
        <section className="space-y-4 rounded-xl border p-4">
          <div>
            <h2 className="text-lg font-semibold">Orden recomendado</h2>
            <p className="text-sm text-muted-foreground">
              Total: <strong>{horas(resultado.ruta.minutosTotal)}</strong> de manejo, {resultado.ruta.kmTotal.toFixed(1)} km (sin
              contar lo que te lleve cada entrega).
            </p>
          </div>
          <ol className="space-y-2">
            <li className="text-sm text-muted-foreground">Salida: {resultado.inicio}</li>
            <li className="flex gap-3 rounded-lg border border-dashed p-3 text-sm">
              <span className="grid size-7 shrink-0 place-items-center rounded-full border text-xs font-semibold">0</span>
              <span className="min-w-0">
                <span className="block font-medium">Buscar las cajas</span>
                <span className="block text-muted-foreground">{resultado.retiro}</span>
                <span className="block text-xs text-muted-foreground">
                  {min(resultado.ruta.aRetiro.minutos)} desde la salida · {resultado.ruta.aRetiro.km.toFixed(1)} km
                </span>
              </span>
            </li>
            {resultado.ruta.orden.map((t, i) => {
              const p = porId.get(t.paradaId)!;
              return (
                <li key={t.paradaId} className="flex gap-3 rounded-lg bg-muted/50 p-3 text-sm">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-medium">{p.nombre}</span>
                    <span className="block text-muted-foreground">{p.direccion}</span>
                    <span className="block text-xs text-muted-foreground">
                      {min(t.minutos)} desde la parada anterior · {t.km.toFixed(1)} km
                    </span>
                  </span>
                </li>
              );
            })}
            {resultado.fin && resultado.ruta.final && (
              <li className="text-sm text-muted-foreground">
                Llegada: {resultado.fin} ({min(resultado.ruta.final.minutos)} · {resultado.ruta.final.km.toFixed(1)} km)
              </li>
            )}
          </ol>

          <div className="flex flex-wrap gap-2">
            {enlaces.map((href, i) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
              >
                {enlaces.length > 1 ? `Abrir en Google Maps (parte ${i + 1} de ${enlaces.length})` : "Abrir en Google Maps"}
              </a>
            ))}
          </div>

          {resultado.sinUbicar.length > 0 && (
            <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
              <p className="font-medium">No pude ubicar estos domicilios (no entraron en la ruta):</p>
              <ul className="mt-1 list-disc pl-5">
                {resultado.sinUbicar.map((p) => (
                  <li key={p.id}>
                    {p.nombre}: {p.direccion}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
