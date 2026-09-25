"use client";

import { useMemo, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { crearZonaSurPedido } from "@/lib/actions/zona-sur";
import { cn } from "@/lib/utils";

const MapaZona = dynamic(() => import("./mapa-zona").then((m) => m.MapaZona), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse rounded-xl bg-muted" />,
});

type Sku = { id: string; nombre: string; precioVenta: number; imagenUrl: string | null };
type Config = {
  zonaNombre: string;
  zonaCentroLat: number;
  zonaCentroLng: number;
  zonaRadioKm: number;
  zonaPrecio: number;
  cbuAlias: string | null;
  titularCuenta: string | null;
  puntoQuilmesTexto: string | null;
  puntoBernalTexto: string | null;
};

type MetodoEntrega = "ENVIO_ZONA" | "PUNTO_QUILMES" | "PUNTO_BERNAL";
type MetodoPago = "TRANSFERENCIA" | "EFECTIVO";

function moneyAR(n: number) {
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
}

function TarjetaOpcion({
  activo,
  onClick,
  disabled,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full flex-col gap-1 rounded-2xl border-2 px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        activo ? "border-[var(--primary)] bg-[var(--card)]" : "border-[var(--border)] bg-[var(--card)]/60 hover:border-[var(--muted-foreground)]"
      )}
    >
      {children}
    </button>
  );
}

export function ZonaSurPedidoForm({ config, skus }: { config: Config; skus: Sku[] }) {
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [metodoEntrega, setMetodoEntrega] = useState<MetodoEntrega>("ENVIO_ZONA");
  const [direccion, setDireccion] = useState("");
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("TRANSFERENCIA");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [pending, startTransition] = useTransition();
  const [enviado, setEnviado] = useState(false);

  const hayQuilmes = !!config.puntoQuilmesTexto?.trim();
  const hayBernal = !!config.puntoBernalTexto?.trim();

  const subtotal = useMemo(
    () => skus.reduce((acc, s) => acc + (cantidades[s.id] ?? 0) * s.precioVenta, 0),
    [skus, cantidades]
  );
  const totalConEnvio = subtotal + (metodoEntrega === "ENVIO_ZONA" ? config.zonaPrecio : 0);
  const hayProductos = Object.values(cantidades).some((c) => c > 0);

  function cambiarCantidad(skuId: string, delta: number) {
    setCantidades((c) => ({ ...c, [skuId]: Math.max(0, (c[skuId] ?? 0) + delta) }));
  }

  function handleSubmit(formData: FormData) {
    if (!hayProductos) {
      toast.error("Elegí al menos un pack");
      return;
    }
    const items = skus
      .filter((s) => (cantidades[s.id] ?? 0) > 0)
      .map((s) => ({ skuId: s.id, cantidad: cantidades[s.id] }));
    formData.set("items", JSON.stringify(items));
    formData.set("metodoEntrega", metodoEntrega);
    formData.set("metodoPago", metodoPago);
    if (metodoEntrega === "ENVIO_ZONA") formData.set("direccion", direccion);

    startTransition(async () => {
      const result = await crearZonaSurPedido(formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      setEnviado(true);
    });
  }

  if (enviado) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-3xl font-semibold">¡Listo, {nombre.split(" ")[0]}!</h1>
        <p className="text-[var(--muted-foreground)]">
          Recibimos tu pedido. Te vamos a escribir por WhatsApp o mail a{" "}
          <strong>{email}</strong> para coordinar {metodoEntrega === "ENVIO_ZONA" ? "el envío" : "la entrega en el punto de encuentro"}.
        </p>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="mx-auto max-w-2xl space-y-8 px-6 py-12">
      <header className="text-center">
        <img
          src="/branding/giapura-logo.png"
          alt="Giapura"
          className="mx-auto h-16 w-auto"
        />
        <p className="gia-mano mt-1 text-2xl text-[var(--muted-foreground)]">Pedidos Zona Sur</p>
        <p className="mt-2 text-[var(--muted-foreground)]">
          Elegí tu pack, cómo lo recibís y cómo pagás. Coordinamos el resto por WhatsApp.
        </p>
      </header>

      {/* Productos */}
      <section className="space-y-3">
        <p className="text-center text-sm font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
          1. Elegí tu pack
        </p>
        <h2 className="text-center text-3xl">Dos frascos, tu combinación</h2>
        {skus.length === 0 && (
          <p className="text-sm text-[var(--muted-foreground)]">
            Todavía no hay productos cargados. (Se cargan en Productos (SKU) del panel.)
          </p>
        )}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {skus.map((sku) => {
            const cantidad = cantidades[sku.id] ?? 0;
            return (
              <div
                key={sku.id}
                className={cn(
                  "flex flex-col gap-3 rounded-2xl border-2 bg-[var(--card)] p-4 text-center transition-colors",
                  cantidad > 0 ? "border-[var(--primary)]" : "border-[var(--border)]"
                )}
              >
                <div className="relative aspect-square overflow-hidden rounded-xl bg-[var(--muted)]">
                  {sku.imagenUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={sku.imagenUrl} alt={sku.nombre} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[var(--muted-foreground)]">
                      giapura.
                    </div>
                  )}
                </div>
                <h3 className="text-xl font-semibold">{sku.nombre}</h3>
                <p className="text-lg font-semibold">{moneyAR(sku.precioVenta)}</p>
                <div className="mt-auto flex items-center justify-center gap-4">
                  <Button type="button" variant="outline" size="icon-sm" onClick={() => cambiarCantidad(sku.id, -1)}>
                    −
                  </Button>
                  <span className="w-4 text-center font-medium">{cantidad}</span>
                  <Button type="button" variant="outline" size="icon-sm" onClick={() => cambiarCantidad(sku.id, 1)}>
                    +
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Entrega */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">2. ¿Cómo lo recibís?</h2>
        <div className="space-y-3">
          <TarjetaOpcion activo={metodoEntrega === "ENVIO_ZONA"} onClick={() => setMetodoEntrega("ENVIO_ZONA")}>
            <span className="font-medium">Envío a domicilio — {moneyAR(config.zonaPrecio)}</span>
            <span className="text-sm text-[var(--muted-foreground)]">Válido dentro del círculo marcado en el mapa.</span>
          </TarjetaOpcion>
          <TarjetaOpcion activo={metodoEntrega === "PUNTO_QUILMES"} onClick={() => setMetodoEntrega("PUNTO_QUILMES")} disabled={!hayQuilmes}>
            <span className="font-medium">Retiro en Quilmes {!hayQuilmes && "(sin punto esta semana)"}</span>
            {hayQuilmes && <span className="whitespace-pre-line text-sm text-[var(--muted-foreground)]">{config.puntoQuilmesTexto}</span>}
          </TarjetaOpcion>
          <TarjetaOpcion activo={metodoEntrega === "PUNTO_BERNAL"} onClick={() => setMetodoEntrega("PUNTO_BERNAL")} disabled={!hayBernal}>
            <span className="font-medium">Retiro en Bernal {!hayBernal && "(sin punto esta semana)"}</span>
            {hayBernal && <span className="whitespace-pre-line text-sm text-[var(--muted-foreground)]">{config.puntoBernalTexto}</span>}
          </TarjetaOpcion>
        </div>

        {metodoEntrega === "ENVIO_ZONA" && (
          <div className="space-y-3 pt-1">
            <MapaZona lat={config.zonaCentroLat} lng={config.zonaCentroLng} radioKm={config.zonaRadioKm} alto="16rem" />
            <p className="text-xs text-[var(--muted-foreground)]">
              Fijate si tu dirección cae dentro del círculo. Si no estás segura/o, escribinos igual y lo vemos.
            </p>
            <div className="space-y-2">
              <Label htmlFor="direccion">Dirección de entrega</Label>
              <Input
                id="direccion"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Calle, número, localidad"
                required
              />
            </div>
          </div>
        )}
      </section>

      {/* Pago */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">3. ¿Cómo pagás?</h2>
        <div className="space-y-3">
          <TarjetaOpcion activo={metodoPago === "TRANSFERENCIA"} onClick={() => setMetodoPago("TRANSFERENCIA")}>
            <span className="font-medium">Transferencia</span>
          </TarjetaOpcion>
          <TarjetaOpcion activo={metodoPago === "EFECTIVO"} onClick={() => setMetodoPago("EFECTIVO")}>
            <span className="font-medium">Efectivo</span>
            <span className="text-sm text-[var(--muted-foreground)]">Se paga al recibir o retirar.</span>
          </TarjetaOpcion>
        </div>

        {metodoPago === "TRANSFERENCIA" && (
          <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
            {config.cbuAlias ? (
              <p className="text-sm">
                Transferí a: <strong>{config.cbuAlias}</strong>
                {config.titularCuenta && <> — {config.titularCuenta}</>}
              </p>
            ) : (
              <p className="text-sm text-[var(--muted-foreground)]">Te pasamos el CBU/alias por WhatsApp apenas mandes el pedido.</p>
            )}
            <div className="space-y-2">
              <Label htmlFor="comprobante">Comprobante de la transferencia</Label>
              <Input id="comprobante" name="comprobante" type="file" accept="image/*" required />
            </div>
          </div>
        )}
      </section>

      {/* Datos de contacto */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">4. Tus datos</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="clienteNombre">Nombre y apellido</Label>
            <Input id="clienteNombre" name="clienteNombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="clienteEmail">Mail</Label>
            <Input id="clienteEmail" name="clienteEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="clienteTelefono">Teléfono (WhatsApp)</Label>
            <Input id="clienteTelefono" name="clienteTelefono" type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} required />
          </div>
        </div>
      </section>

      <div className="flex items-center justify-between rounded-2xl bg-[var(--muted)] px-4 py-3">
        <span className="font-medium">Total</span>
        <span className="text-xl font-semibold">{moneyAR(totalConEnvio)}</span>
      </div>

      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "Enviando..." : "Confirmar pedido"}
      </Button>
    </form>
  );
}
