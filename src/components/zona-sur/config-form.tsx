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
  colegioNombre: string | null;
  colegioDias: string | null;
  andreaniActivo: boolean;
  andreaniTexto: string | null;
  andreaniTarifas: string | null;
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

      <Card>
        <CardHeader>
          <CardTitle>Entrega en el colegio</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="colegioNombre">Colegio y horario</Label>
            <Textarea
              id="colegioNombre"
              name="colegioNombre"
              rows={4}
              defaultValue={config.colegioNombre ?? ""}
              placeholder="Ej: Colegio San José, puerta principal, 12:30hs"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="colegioDias">Días disponibles (uno por línea)</Label>
            <Textarea
              id="colegioDias"
              name="colegioDias"
              rows={4}
              defaultValue={config.colegioDias ?? ""}
              placeholder={"Martes 21/10\nJueves 23/10"}
            />
          </div>
          <p className="text-xs text-muted-foreground sm:col-span-2">
            El cliente elige uno de estos días. Dejá vacío cualquiera de los dos campos y la opción de colegio no
            aparece en la página. Los pedidos que ya se hicieron conservan el día que eligieron.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Envío por Andreani</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              name="andreaniActivo"
              defaultChecked={config.andreaniActivo}
              className="size-4"
            />
            Ofrecer envío por Andreani en la página
          </label>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="andreaniTexto">Aclaración para el cliente (opcional)</Label>
            <Input
              id="andreaniTexto"
              name="andreaniTexto"
              defaultValue={config.andreaniTexto ?? ""}
              placeholder="Ej: El costo del envío lo ves antes de pagarlo"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="andreaniTarifas">Precios aproximados por código postal (opcional)</Label>
            <Textarea
              id="andreaniTarifas"
              name="andreaniTarifas"
              rows={6}
              defaultValue={config.andreaniTarifas ?? ""}
              placeholder={"1000-1799 = 5800\n1800-1999 = 6500\n1878 = 5900\n2000-2999 = 8200"}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Una regla por línea: un código postal (<code>1878 = 6500</code>) o un rango (
              <code>1800-1999 = 6500</code>). Si coinciden varias, gana la más específica. Si cargás algo acá, en la
              página aparece un casillero para que el cliente calcule su envío aproximado; si lo dejás vacío, no
              aparece. Sacá los precios del cotizador de Andreani con el peso y medidas de tu paquete y actualizalos
              cuando cambien.
            </p>
          </div>
          <p className="text-xs text-muted-foreground sm:col-span-2">
            El cliente paga los productos por transferencia (con Andreani no se puede pagar en efectivo). Después le
            mandás, desde &quot;Envíos por Andreani&quot;, un link de Andreani donde completa su dirección y paga el
            envío directo a ellos. Cada link se usa una sola vez, así que hay uno por pedido.
          </p>
        </CardContent>
      </Card>

      <Button type="submit" disabled={pending}>
        {pending ? "Guardando..." : "Guardar cambios"}
      </Button>
    </form>
  );
}
