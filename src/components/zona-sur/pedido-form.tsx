"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { crearZonaSurPedido } from "@/lib/actions/zona-sur";
import { estimarEnvioAndreani, numeroDeCodigoPostal, type TarifaAndreani } from "@/lib/zona-sur-andreani";
import { descuentoEfectivo as descuentoEnEfectivo, precioEnEfectivo } from "@/lib/zona-sur-precios";
import { cn } from "@/lib/utils";

const MapaZona = dynamic(() => import("./mapa-zona").then((m) => m.MapaZona), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse rounded-xl bg-muted" />,
});

type Sku = { id: string; nombre: string; precioVenta: number; imagenUrl: string | null; esPack: boolean };
type Config = {
  zonaNombre: string;
  zonaCentroLat: number;
  zonaCentroLng: number;
  zonaRadioKm: number;
  zonaPrecio: number;
  cbuAlias: string | null;
  titularCuenta: string | null;
  colegioNombre: string | null;
  colegioDias: string[];
  andreaniActivo: boolean;
  andreaniTexto: string | null;
  andreaniTarifas: TarifaAndreani[];
  descuentoEfectivo: number;
};

type MetodoEntrega = "ENVIO_ZONA" | "COLEGIO" | "ANDREANI";
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
  const [colegioDia, setColegioDia] = useState("");
  const [cpEstimado, setCpEstimado] = useState("");
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("TRANSFERENCIA");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [pending, startTransition] = useTransition();
  const [enviado, setEnviado] = useState(false);

  const hayColegio = !!config.colegioNombre?.trim() && config.colegioDias.length > 0;
  const hayFrascosSueltos = skus.some((s) => !s.esPack);

  const subtotal = useMemo(
    () => skus.reduce((acc, s) => acc + (cantidades[s.id] ?? 0) * s.precioVenta, 0),
    [skus, cantidades]
  );
  // El envío por Andreani no suma acá: se paga aparte, directo a Andreani.
  // El descuento por pagar en efectivo es sobre los productos (no sobre el envío).
  const descuento = metodoPago === "EFECTIVO" ? descuentoEnEfectivo(subtotal, config.descuentoEfectivo) : 0;
  const totalConEnvio = subtotal - descuento + (metodoEntrega === "ENVIO_ZONA" ? config.zonaPrecio : 0);
  const hayDescuentoEfectivo = config.descuentoEfectivo > 0;
  const hayProductos = Object.values(cantidades).some((c) => c > 0);
  // Las cajas de Andreani son de a dos: por ese medio solo se piden packs, no frascos sueltos.
  const soloPacks = metodoEntrega === "ANDREANI";

  const estimadoAndreani = estimarEnvioAndreani(config.andreaniTarifas, cpEstimado);
  const mensajeEstimado = !cpEstimado.trim()
    ? null
    : numeroDeCodigoPostal(cpEstimado) === null
      ? "Escribí los 4 números de tu código postal."
      : estimadoAndreani === null
        ? "No tenemos un aproximado para ese código postal. Lo ves en el link de Andreani antes de pagar."
        : `Aproximadamente ${moneyAR(estimadoAndreani)}`;

  // Andreani solo admite transferencia: si había elegido efectivo, se pasa a transferencia.
  function elegirAndreani() {
    setMetodoEntrega("ANDREANI");
    setMetodoPago("TRANSFERENCIA");
    // Si había frascos sueltos elegidos, se sacan: por Andreani van solo packs.
    setCantidades((c) => Object.fromEntries(Object.entries(c).map(([id, n]) => [id, skus.find((s) => s.id === id)?.esPack ? n : 0])));
  }

  function cambiarCantidad(skuId: string, delta: number) {
    setCantidades((c) => ({ ...c, [skuId]: Math.max(0, (c[skuId] ?? 0) + delta) }));
  }

  function handleSubmit(formData: FormData) {
    if (!hayProductos) {
      toast.error(hayFrascosSueltos ? "Elegí al menos un producto" : "Elegí al menos un pack");
      return;
    }
    if (metodoEntrega === "COLEGIO" && !colegioDia) {
      toast.error("Elegí el día en que te lo llevamos al colegio");
      return;
    }
    const items = skus
      .filter((s) => (cantidades[s.id] ?? 0) > 0)
      .map((s) => ({ skuId: s.id, cantidad: cantidades[s.id] }));
    formData.set("items", JSON.stringify(items));
    formData.set("metodoEntrega", metodoEntrega);
    formData.set("metodoPago", metodoPago);
    if (metodoEntrega === "ENVIO_ZONA") formData.set("direccion", direccion);
    if (metodoEntrega === "COLEGIO") formData.set("colegioDia", colegioDia);

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
          <strong>{email}</strong> para coordinar{" "}
          {metodoEntrega === "ENVIO_ZONA"
            ? "el envío"
            : metodoEntrega === "ANDREANI"
              ? "el envío: te mandamos un link de Andreani para que completes tu dirección y pagues el envío"
              : metodoEntrega === "COLEGIO"
                ? "la entrega en el colegio"
                : "la entrega en el punto de encuentro"}
          .
        </p>
        {metodoEntrega === "COLEGIO" && (
          <p className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm">
            <strong>{colegioDia}</strong>
            <br />
            {config.colegioNombre}
            <br />
            <span className="text-[var(--muted-foreground)]">El día anterior a la noche te mandamos un recordatorio.</span>
          </p>
        )}
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
          {hayFrascosSueltos ? "Elegí tus productos" : "Elegí tu pack"}, cómo lo recibís y cómo pagás. Coordinamos el resto
          por WhatsApp.
        </p>
      </header>

      {/* Productos */}
      <section className="space-y-3">
        <p className="text-center text-sm font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
          {hayFrascosSueltos ? "1. Elegí tus productos" : "1. Elegí tu pack"}
        </p>
        <h2 className="text-center text-3xl">
          {hayFrascosSueltos ? "Packs de dos frascos o frascos sueltos" : "Dos frascos, tu combinación"}
        </h2>
        {hayDescuentoEfectivo && (
          <p className="mx-auto w-fit rounded-full bg-[var(--muted)] px-4 py-1.5 text-center text-sm font-medium">
            Pagando en efectivo tenés {config.descuentoEfectivo}% de descuento
          </p>
        )}
        {skus.length === 0 && (
          <p className="text-sm text-[var(--muted-foreground)]">
            Todavía no hay productos cargados. (Se cargan en Productos (SKU) del panel.)
          </p>
        )}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {skus.map((sku, idx) => {
            const cantidad = cantidades[sku.id] ?? 0;
            const primerSuelto = !sku.esPack && (idx === 0 || skus[idx - 1].esPack);
            return (
              <Fragment key={sku.id}>
                {primerSuelto && (
                  <h3 className="col-span-full pt-2 text-center text-2xl">
                    {idx === 0 ? "Frascos" : "O un frasco suelto"}
                  </h3>
                )}
              <div
                className={cn(
                  "flex flex-col gap-3 rounded-2xl border-2 bg-[var(--card)] p-4 text-center transition-colors",
                  cantidad > 0 ? "border-[var(--primary)]" : "border-[var(--border)]",
                  soloPacks && !sku.esPack && "opacity-50"
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
                <h3 className="gia-pack-nombre text-xl">{sku.nombre}</h3>
                <div>
                  <p className="text-lg font-semibold">{moneyAR(sku.precioVenta)}</p>
                  {hayDescuentoEfectivo && (
                    <p className="text-sm text-[var(--muted-foreground)]">
                      En efectivo: <strong>{moneyAR(precioEnEfectivo(sku.precioVenta, config.descuentoEfectivo))}</strong>
                    </p>
                  )}
                </div>
                <div className="mt-auto flex items-center justify-center gap-4">
                  <Button type="button" variant="outline" size="icon-sm" onClick={() => cambiarCantidad(sku.id, -1)}>
                    −
                  </Button>
                  <span className="w-4 text-center font-medium">{cantidad}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    disabled={soloPacks && !sku.esPack}
                    onClick={() => cambiarCantidad(sku.id, 1)}
                  >
                    +
                  </Button>
                </div>
              </div>
              </Fragment>
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
          {hayColegio && (
            <TarjetaOpcion activo={metodoEntrega === "COLEGIO"} onClick={() => setMetodoEntrega("COLEGIO")}>
              <span className="font-medium">Retiro en el colegio</span>
              <span className="whitespace-pre-line text-sm text-[var(--muted-foreground)]">{config.colegioNombre}</span>
            </TarjetaOpcion>
          )}
          {config.andreaniActivo && (
            <TarjetaOpcion activo={metodoEntrega === "ANDREANI"} onClick={elegirAndreani}>
              <span className="font-medium">Envío por Andreani</span>
              <span className="text-sm text-[var(--muted-foreground)]">
                Para cualquier lugar del país. El envío lo pagás directo a Andreani.
                {config.andreaniTexto?.trim() && <> {config.andreaniTexto.trim()}</>}
              </span>
            </TarjetaOpcion>
          )}
        </div>

        {metodoEntrega === "ANDREANI" && config.andreaniActivo && (
          <ol className="list-decimal space-y-1 rounded-2xl border border-[var(--border)] bg-[var(--card)] py-3 pl-9 pr-4 text-sm">
            <li>Elegí tus packs (las cajas de envío son de a dos, no hay frascos sueltos por Andreani).</li>
            <li>Pagás los productos por transferencia y subís el comprobante.</li>
            <li>Te mandamos por WhatsApp un link de Andreani.</li>
            <li>En ese link completás tu dirección y pagás el envío a Andreani.</li>
          </ol>
        )}

        {metodoEntrega === "ANDREANI" && config.andreaniActivo && config.andreaniTarifas.length > 0 && (
          <div className="space-y-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
            <Label htmlFor="cpEstimado">Calculá tu envío aproximado</Label>
            <Input
              id="cpEstimado"
              value={cpEstimado}
              onChange={(e) => setCpEstimado(e.target.value)}
              onKeyDown={(e) => {
                // Está dentro del formulario del pedido: Enter no tiene que mandarlo.
                if (e.key === "Enter") e.preventDefault();
              }}
              placeholder="Tu código postal (ej: 1878)"
              autoComplete="postal-code"
              maxLength={8}
              className="max-w-56"
            />
            <p aria-live="polite" className="min-h-5 text-sm font-medium">
              {mensajeEstimado}
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">
              Es solo una referencia. El precio final lo ves en el link de Andreani antes de pagar.
            </p>
          </div>
        )}

        {metodoEntrega === "COLEGIO" && hayColegio && (
          <div className="space-y-2 pt-1" role="group" aria-label="Día de entrega en el colegio">
            <p className="text-sm font-medium">¿Qué día te lo llevamos?</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {config.colegioDias.map((dia) => (
                <TarjetaOpcion key={dia} activo={colegioDia === dia} onClick={() => setColegioDia(dia)}>
                  <span className="font-medium">{dia}</span>
                </TarjetaOpcion>
              ))}
            </div>
            <p className="text-xs text-[var(--muted-foreground)]">
              El día anterior a la noche te mandamos un recordatorio por WhatsApp.
            </p>
          </div>
        )}

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
          <TarjetaOpcion
            activo={metodoPago === "EFECTIVO"}
            onClick={() => setMetodoPago("EFECTIVO")}
            disabled={metodoEntrega === "ANDREANI"}
          >
            <span className="font-medium">Efectivo</span>
            <span className="text-sm text-[var(--muted-foreground)]">
              {metodoEntrega === "ANDREANI"
                ? "No disponible con envío por Andreani: solo transferencia."
                : `Se paga al recibir o retirar.${hayDescuentoEfectivo ? ` ${config.descuentoEfectivo}% de descuento.` : ""}`}
            </span>
          </TarjetaOpcion>
        </div>

        {metodoPago === "EFECTIVO" && (
          <div className="space-y-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
            <p className="text-sm">
              Total a pagar en efectivo: <strong>{moneyAR(totalConEnvio)}</strong>
              {descuento > 0 && <> (ya con el {config.descuentoEfectivo}% de descuento incluido)</>}
            </p>
            <Label htmlFor="pagaCon">¿Con cuánto pagás?</Label>
            <Input
              id="pagaCon"
              name="pagaCon"
              type="number"
              min={totalConEnvio}
              step="1"
              placeholder={`Ej: ${Math.ceil(totalConEnvio / 1000) * 1000}`}
              required
            />
            <p className="text-xs text-[var(--muted-foreground)]">Así llevamos el vuelto justo.</p>
          </div>
        )}

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
        <span className="text-right">
          {descuento > 0 && (
            <span className="block text-sm text-[var(--muted-foreground)]">
              Incluye {config.descuentoEfectivo}% de descuento por pagar en efectivo (−{moneyAR(descuento)})
            </span>
          )}
          <span className="text-xl font-semibold">{moneyAR(totalConEnvio)}</span>
        </span>
      </div>

      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "Enviando..." : "Confirmar pedido"}
      </Button>
    </form>
  );
}
