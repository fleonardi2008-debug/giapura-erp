"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { guardarZonaSurConfig } from "@/lib/actions/zona-sur";

// Leaflet toca el DOM/window al cargar: solo puede vivir del lado del cliente.
const MapaZona = dynamic(() => import("./mapa-zona").then((m) => m.MapaZona), {
  ssr: false,
  loading: () => <div className="h-96 animate-pulse rounded-xl bg-muted" />,
});

type Config = {
  zonaNombre: string;
  zonaCentroLat: number;
  zonaCentroLng: number;
  zonaRadioKm: number;
  zonaPrecio: string;
  cbuAlias: string | null;
  titularCuenta: string | null;
  puntoQuilmesTexto: string | null;
  puntoBernalTexto: string | null;
};

export function ZonaSurConfigForm({ config }: { config: Config }) {
  const [lat, setLat] = useState(config.zonaCentroLat);
  const [lng, setLng] = useState(config.zonaCentroLng);
  const [radioKm, setRadioKm] = useState(config.zonaRadioKm);
  const [buscando, setBuscando] = useState(false);
  const [direccionBuscada, setDireccionBuscada] = useState("");
  const [pending, startTransition] = useTransition();

  async function buscarDireccion() {
    if (!direccionBuscada.trim()) return;
    setBuscando(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(direccionBuscada)}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      const data = await res.json();
      if (!data?.[0]) {
        toast.error("No encontré esa dirección. Probá con más detalle (calle, número, localidad).");
        return;
      }
      setLat(parseFloat(data[0].lat));
      setLng(parseFloat(data[0].lon));
      toast.success("Encontrado. Ahora podés ajustar el centro tocando el mapa.");
    } catch {
      toast.error("No se pudo buscar la dirección. Marcá el centro tocando el mapa.");
    } finally {
      setBuscando(false);
    }
  }

  function handleSubmit(formData: FormData) {
    formData.set("zonaCentroLat", String(lat));
    formData.set("zonaCentroLng", String(lng));
    formData.set("zonaRadioKm", String(radioKm));

    startTransition(async () => {
      const result = await guardarZonaSurConfig(formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Guardado");
    });
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Zona de envío</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="zonaNombre">Nombre de la zona</Label>
              <Input id="zonaNombre" name="zonaNombre" defaultValue={config.zonaNombre} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zonaPrecio">Precio del envío</Label>
              <Input id="zonaPrecio" name="zonaPrecio" type="number" step="0.01" min="0" defaultValue={config.zonaPrecio} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="buscarDireccion">Buscar una dirección para centrar el mapa</Label>
            <div className="flex gap-2">
              <Input
                id="buscarDireccion"
                placeholder="Ej: Rivadavia 500, Quilmes"
                value={direccionBuscada}
                onChange={(e) => setDireccionBuscada(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    buscarDireccion();
                  }
                }}
              />
              <Button type="button" variant="secondary" onClick={buscarDireccion} disabled={buscando}>
                {buscando ? "Buscando..." : "Buscar"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              O tocá directamente en el mapa para mover el centro del círculo.
            </p>
          </div>

          <MapaZona lat={lat} lng={lng} radioKm={radioKm} onMoverCentro={(la, ln) => { setLat(la); setLng(ln); }} />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="radioKm">Radio de la zona</Label>
              <span className="text-sm font-medium">{radioKm.toFixed(1)} km</span>
            </div>
            <input
              id="radioKm"
              type="range"
              min={0.5}
              max={20}
              step={0.5}
              value={radioKm}
              onChange={(e) => setRadioKm(parseFloat(e.target.value))}
              className="w-full accent-primary"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Datos para transferencia</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cbuAlias">CBU / Alias</Label>
            <Input id="cbuAlias" name="cbuAlias" defaultValue={config.cbuAlias ?? ""} placeholder="giapura.mp" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="titularCuenta">Titular de la cuenta</Label>
            <Input id="titularCuenta" name="titularCuenta" defaultValue={config.titularCuenta ?? ""} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Puntos de encuentro de esta semana</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="puntoQuilmesTexto">Quilmes</Label>
            <Textarea
              id="puntoQuilmesTexto"
              name="puntoQuilmesTexto"
              rows={3}
              defaultValue={config.puntoQuilmesTexto ?? ""}
              placeholder="Ej: Jueves 25/9, 18 a 20hs, Rivadavia y Alsina"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="puntoBernalTexto">Bernal</Label>
            <Textarea
              id="puntoBernalTexto"
              name="puntoBernalTexto"
              rows={3}
              defaultValue={config.puntoBernalTexto ?? ""}
              placeholder="Ej: Sábado 27/9, 10 a 12hs, plaza principal"
            />
          </div>
          <p className="text-xs text-muted-foreground sm:col-span-2">
            Dejá el campo vacío si esa semana no ofrecés ese punto: no va a aparecer como opción en la página.
          </p>
        </CardContent>
      </Card>

      <Button type="submit" disabled={pending}>
        {pending ? "Guardando..." : "Guardar cambios"}
      </Button>
    </form>
  );
}
