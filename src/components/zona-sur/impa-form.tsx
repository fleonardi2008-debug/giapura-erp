"use client";

import { Fragment, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { crearImpaPedido } from "@/lib/actions/impa";
import { achicarImagen } from "@/lib/achicar-imagen";
import { porcentajeOff } from "@/lib/impa";
import { cn } from "@/lib/utils";
import { BOTON_CANTIDAD, CAMPO, Paso, Revelar, TarjetaOpcion, moneyAR } from "./pedido-form";

type Sku = {
  id: string;
  nombre: string;
  precioVenta: number;
  /** Precio de lista que se muestra tachado (null = no hay) */
  precioTachado: number | null;
  imagenUrl: string | null;
  imagenPosicion: string;
  imagenZoom: number;
  esPack: boolean;
  /** frascoId → cuántos frascos de ese gasta una unidad */
  consumo: Record<string, number>;
};
type StockFrasco = { id: string; nombre: string; total: number; usado: number };
type Config = {
  dias: string[];
  opciones: string[];
  lugar: string | null;
  cbuAlias: string | null;
  titularCuenta: string | null;
  whatsappContacto: string;
};
type MetodoPago = "TRANSFERENCIA" | "EFECTIVO";

/** Logo del IMPA (archivo /branding/impa-logo.png); si todavía no está subido, muestra el nombre en texto. */
function LogoImpa() {
  const ref = useRef<HTMLImageElement>(null);
  const [sinLogo, setSinLogo] = useState(false);
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setSinLogo(true);
  }, []);
  if (sinLogo) {
    return <p className="gia-entra text-5xl font-bold tracking-wide text-[var(--primary)] sm:text-6xl">IMPA</p>;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src="/branding/impa-logo.png"
      alt="IMPA"
      onError={() => setSinLogo(true)}
      className="gia-entra mx-auto h-20 w-auto sm:h-28"
    />
  );
}

export function ImpaPedidoForm({ config, skus, stock }: { config: Config; skus: Sku[]; stock: StockFrasco[] }) {
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [dia, setDia] = useState("");
  const [opcion, setOpcion] = useState("");
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("TRANSFERENCIA");
  const [pagaConValor, setPagaConValor] = useState("");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [pending, startTransition] = useTransition();
  const [enviado, setEnviado] = useState(false);
  const [montado, setMontado] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMontado(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const hayFrascosSueltos = skus.some((s) => !s.esPack);
  const total = useMemo(
    () => skus.reduce((acc, s) => acc + (cantidades[s.id] ?? 0) * s.precioVenta, 0),
    [skus, cantidades]
  );
  const hayProductos = Object.values(cantidades).some((c) => c > 0);
  const unidadesTotales = Object.values(cantidades).reduce((a, c) => a + c, 0);

  const quedanSinCarrito = (f: StockFrasco) => Math.max(0, f.total - f.usado);
  const enCarrito = (frascoId: string) =>
    skus.reduce((acc, s) => acc + (cantidades[s.id] ?? 0) * (s.consumo[frascoId] ?? 0), 0);
  const hayStockPara = (sku: Sku) =>
    stock.every((f) => {
      const gasta = sku.consumo[f.id] ?? 0;
      return gasta === 0 || quedanSinCarrito(f) - enCarrito(f.id) >= gasta;
    });

  function cambiarCantidad(skuId: string, delta: number) {
    setCantidades((c) => ({ ...c, [skuId]: Math.max(0, (c[skuId] ?? 0) + delta) }));
  }

  // Pedido ya escrito para mandárselo a Fran por WhatsApp: se abre al confirmar, el cliente solo toca "enviar".
  function armarMensajePedido() {
    const plata = (n: number) => `$${n.toLocaleString("es-AR")}`;
    const pagaCon = Number(pagaConValor) || 0;
    const pago =
      metodoPago === "EFECTIVO"
        ? [`💵 Pago en efectivo: ${plata(total)}`, `💰 Paga con: ${plata(pagaCon)}`, `🔁 Vuelto: ${plata(Math.max(0, pagaCon - total))}`]
        : [`🏦 Pago por transferencia: ${plata(total)}`];
    return [
      `👋 Hola Fran! Soy ${nombre.trim()}, hice un pedido para el IMPA:`,
      "",
      ...skus.filter((s) => (cantidades[s.id] ?? 0) > 0).map((s) => `🥜 ${cantidades[s.id]} × ${s.nombre}`),
      "",
      `📍 Retiro en el IMPA: ${dia} — ${opcion}`,
      ...pago,
      `📱 Mi teléfono: ${telefono.trim()}`,
    ].join("\n");
  }

  function handleSubmit(formData: FormData) {
    if (!hayProductos) {
      toast.error(hayFrascosSueltos ? "Elegí al menos un producto" : "Elegí al menos un pack");
      return;
    }
    if (!dia || !opcion) {
      toast.error("Elegí el día y si retirás a la entrada o a la salida");
      document.getElementById("retiro")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (metodoPago === "EFECTIVO") {
      const pagaCon = Number(formData.get("pagaCon"));
      if (!pagaCon || pagaCon < total) {
        toast.error(`Indicá con cuánto pagás: tiene que ser al menos ${moneyAR(total)}`);
        document.getElementById("pagaCon")?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
    }
    const pasado = stock.find((f) => enCarrito(f.id) > quedanSinCarrito(f));
    if (pasado) {
      toast.error(`No nos queda tanto stock de ${pasado.nombre} (quedan ${quedanSinCarrito(pasado)}).`);
      return;
    }
    const items = skus.filter((s) => (cantidades[s.id] ?? 0) > 0).map((s) => ({ skuId: s.id, cantidad: cantidades[s.id] }));
    formData.set("items", JSON.stringify(items));
    formData.set("metodoPago", metodoPago);
    formData.set("impaDia", dia);
    formData.set("impaOpcion", opcion);

    startTransition(async () => {
      try {
        // La foto del comprobante del celular pesa varios MB: se achica antes de mandarla.
        const comprobante = formData.get("comprobante");
        if (comprobante instanceof File && comprobante.size > 0 && comprobante.type.startsWith("image/")) {
          try {
            formData.set("comprobante", await achicarImagen(comprobante, 1600, 0.8));
          } catch {
            // Si no se puede achicar, se manda como está (el servidor avisa si es demasiado grande).
          }
        }
        const result = await crearImpaPedido(formData);
        if (result?.error) {
          toast.error(result.error);
          return;
        }
        setEnviado(true);
        // El pedido ya está guardado: se abre WhatsApp con el mensaje listo (misma pestaña: las ventanas nuevas
        // abiertas después de esperar al servidor las bloquean los navegadores).
        const numero = config.whatsappContacto.replace(/\D/g, "");
        if (numero) window.location.href = `https://wa.me/${numero}?text=${encodeURIComponent(armarMensajePedido())}`;
      } catch {
        toast.error("No pudimos enviar tu pedido. Revisá tu conexión y probá de nuevo.");
      }
    });
  }

  if (enviado) {
    const numeroFran = config.whatsappContacto.replace(/\D/g, "");
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <svg viewBox="0 0 52 52" className="gia-entra size-20" fill="none" aria-hidden>
          <circle cx="26" cy="26" r="24" stroke="var(--primary)" strokeWidth="2" opacity="0.25" />
          <path className="gia-check" d="M15 27l8 8 14-16" stroke="var(--primary)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <h1 className="gia-entra text-3xl font-semibold" style={{ "--d": "150ms" } as React.CSSProperties}>
          ¡Listo, {nombre.split(" ")[0]}!
        </h1>
        <p className="text-[var(--muted-foreground)]">Recibimos tu pedido. Lo retirás en el IMPA:</p>
        <p className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm">
          <strong>{dia}</strong>
          <br />
          {opcion}
          {config.lugar && (
            <>
              <br />
              <span className="text-[var(--muted-foreground)]">{config.lugar}</span>
            </>
          )}
        </p>
        {numeroFran && (
          <a
            href={`https://wa.me/${numeroFran}?text=${encodeURIComponent(armarMensajePedido())}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#25d366] px-6 text-base font-semibold text-white shadow-sm"
          >
            Abrir WhatsApp con mi pedido
          </a>
        )}
        {numeroFran && (
          <p className="text-xs text-[var(--muted-foreground)]">
            Tu pedido ya quedó cargado. Si no se abrió WhatsApp, tocá el botón y después &quot;enviar&quot; para que me llegue el detalle.
          </p>
        )}
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="mx-auto max-w-2xl space-y-8 px-4 pt-8 sm:px-6 sm:pt-12">
      <header className="text-center">
        <LogoImpa />
        <p className="gia-entra gia-mano mt-3 text-2xl text-[var(--muted-foreground)]" style={{ "--d": "100ms" } as React.CSSProperties}>
          con
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/branding/giapura-logo.png" alt="Giapura" className="gia-entra mx-auto h-10 w-auto sm:h-12" style={{ "--d": "150ms" } as React.CSSProperties} />
        <p className="gia-entra mx-auto mt-3 max-w-md text-sm text-[var(--muted-foreground)] sm:text-base" style={{ "--d": "200ms" } as React.CSSProperties}>
          {hayFrascosSueltos ? "Elegí tus productos" : "Elegí tu pack"}, cuándo lo retirás en el IMPA y cómo pagás.
        </p>
      </header>

      {/* Productos */}
      <section className="space-y-5">
        <Paso
          n={1}
          titulo={hayFrascosSueltos ? "Elegí tus productos" : "Elegí tu pack"}
          nota={hayFrascosSueltos ? "Packs de dos frascos o frascos sueltos" : "Dos frascos, tu combinación"}
        />
        {stock.length > 0 && (
          <div className="space-y-3 px-1" role="group" aria-label="Stock disponible">
            {stock.map((f) => {
              const vendido = Math.min(f.usado, f.total);
              const porcentaje = f.total > 0 ? Math.round((vendido / f.total) * 100) : 100;
              const quedan = quedanSinCarrito(f);
              return (
                <div key={f.id}>
                  <div className="flex items-baseline justify-between gap-2 text-[11px] tracking-[0.12em] text-[var(--muted-foreground)] uppercase">
                    <span>{f.nombre}</span>
                    <span className="tabular-nums">{quedan > 0 ? `quedan ${quedan}` : "agotado"}</span>
                  </div>
                  <div
                    className="mt-1.5 h-[3px] overflow-hidden rounded-full bg-[var(--border)]"
                    role="progressbar"
                    aria-label={`Stock vendido de ${f.nombre}`}
                    aria-valuemin={0}
                    aria-valuemax={f.total}
                    aria-valuenow={vendido}
                  >
                    <div
                      className="h-full origin-left rounded-full bg-[var(--primary)] transition-transform delay-300 duration-1000 ease-out"
                      style={{ width: `${porcentaje}%`, transform: montado ? "scaleX(1)" : "scaleX(0)" }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {skus.length === 0 && <p className="text-sm text-[var(--muted-foreground)]">Todavía no hay productos cargados.</p>}
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
          {skus.map((sku, idx) => {
            const cantidad = cantidades[sku.id] ?? 0;
            const primerSuelto = !sku.esPack && (idx === 0 || skus[idx - 1].esPack);
            const off = porcentajeOff(sku.precioTachado, sku.precioVenta);
            return (
              <Fragment key={sku.id}>
                {primerSuelto && (
                  <h3 className="col-span-2 pt-2 text-center text-2xl lg:col-span-3">{idx === 0 ? "Frascos" : "O un frasco suelto"}</h3>
                )}
                <div
                  className={cn(
                    "gia-entra flex flex-col gap-2 rounded-3xl border bg-[var(--card)] p-2.5 text-center transition-all duration-300 sm:gap-3 sm:p-4",
                    cantidad > 0
                      ? "-translate-y-0.5 border-[var(--primary)] shadow-[0_14px_30px_-16px_rgba(74,28,5,0.5)] ring-1 ring-[var(--primary)]"
                      : "border-[var(--border)] shadow-[0_1px_2px_rgba(74,28,5,0.05)]"
                  )}
                  style={{ "--d": `${Math.min(idx, 8) * 70}ms` } as React.CSSProperties}
                >
                  <div className="group relative aspect-square overflow-hidden rounded-2xl bg-[var(--muted)]">
                    {sku.imagenUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={sku.imagenUrl}
                        alt={sku.nombre}
                        className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                        style={{
                          objectPosition: sku.imagenPosicion,
                          transform: `scale(${sku.imagenZoom})`,
                          transformOrigin: sku.imagenPosicion,
                        }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[var(--muted-foreground)]">giapura.</div>
                    )}
                    {off && (
                      <span className="absolute top-2 left-2 rounded-xl bg-[var(--accent)] px-2 py-1 text-sm leading-tight font-bold text-[var(--accent-foreground)] shadow-md">
                        {off}% OFF
                      </span>
                    )}
                    {cantidad > 0 && (
                      <span
                        key={cantidad}
                        className="gia-pop absolute top-2 right-2 grid min-w-7 place-items-center rounded-full bg-[var(--primary)] px-2 py-0.5 text-sm font-semibold text-[var(--primary-foreground)] shadow-md"
                      >
                        ×{cantidad}
                      </span>
                    )}
                  </div>
                  <h3 className="gia-pack-nombre text-base leading-tight sm:text-xl">{sku.nombre}</h3>
                  <div>
                    {sku.precioTachado && sku.precioTachado > sku.precioVenta && (
                      <p className="text-sm text-[var(--muted-foreground)] line-through">{moneyAR(sku.precioTachado)}</p>
                    )}
                    <p className="text-lg font-semibold sm:text-xl">{moneyAR(sku.precioVenta)}</p>
                  </div>
                  {!hayStockPara(sku) && (
                    <p className="text-xs font-medium text-[var(--muted-foreground)]">
                      {cantidad > 0 ? "Llegaste al stock disponible" : "Agotado"}
                    </p>
                  )}
                  <div className="mt-auto flex items-center justify-between rounded-full bg-[var(--muted)]/60 p-1">
                    <Button
                      type="button"
                      variant="outline"
                      className={BOTON_CANTIDAD}
                      disabled={cantidad === 0}
                      aria-label={`Quitar una unidad de ${sku.nombre}`}
                      onClick={() => cambiarCantidad(sku.id, -1)}
                    >
                      −
                    </Button>
                    <span key={cantidad} className="gia-pop min-w-6 text-center text-lg font-semibold tabular-nums" aria-live="polite">
                      {cantidad}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      className={BOTON_CANTIDAD}
                      disabled={!hayStockPara(sku)}
                      aria-label={`Sumar una unidad de ${sku.nombre}`}
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

      {/* Retiro */}
      <Revelar className="space-y-4">
        <div id="retiro">
          <Paso n={2} titulo="¿Cuándo lo retirás?" nota={config.lugar ?? "Retiro en el IMPA"} />
        </div>
        {config.dias.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">Por ahora no hay días de retiro disponibles.</p>
        ) : (
          <>
            <div className="space-y-2">
              <p className="text-sm font-medium">Día</p>
              <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Día de retiro">
                {config.dias.map((d) => (
                  <TarjetaOpcion key={d} activo={dia === d} onClick={() => setDia(d)}>
                    <span className="font-medium">{d}</span>
                  </TarjetaOpcion>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">¿A qué hora?</p>
              <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Momento de retiro">
                {config.opciones.map((o) => (
                  <TarjetaOpcion key={o} activo={opcion === o} onClick={() => setOpcion(o)}>
                    <span className="font-medium">{o}</span>
                  </TarjetaOpcion>
                ))}
              </div>
            </div>
          </>
        )}
      </Revelar>

      {/* Pago */}
      <Revelar className="space-y-4">
        <Paso n={3} titulo="¿Cómo pagás?" />
        <div className="space-y-3" role="radiogroup" aria-label="Cómo pagás">
          <TarjetaOpcion activo={metodoPago === "TRANSFERENCIA"} onClick={() => setMetodoPago("TRANSFERENCIA")}>
            <span className="font-medium">Transferencia</span>
          </TarjetaOpcion>
          <TarjetaOpcion activo={metodoPago === "EFECTIVO"} onClick={() => setMetodoPago("EFECTIVO")}>
            <span className="font-medium">Efectivo</span>
            <span className="text-sm text-[var(--muted-foreground)]">Se paga al retirar.</span>
          </TarjetaOpcion>
        </div>

        {metodoPago === "EFECTIVO" && (
          <div className="gia-aparece space-y-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
            <p className="text-sm">
              Total a pagar en efectivo: <strong>{moneyAR(total)}</strong>
            </p>
            <Label htmlFor="pagaCon">¿Con cuánto pagás?</Label>
            <Input
              id="pagaCon"
              name="pagaCon"
              type="number"
              inputMode="numeric"
              className={CAMPO}
              value={pagaConValor}
              onChange={(e) => setPagaConValor(e.target.value)}
              min={total}
              step="1"
              placeholder={`Ej: ${Math.ceil(total / 1000) * 1000}`}
              required
            />
            <p className="text-xs text-[var(--muted-foreground)]">Así llevamos el vuelto justo.</p>
          </div>
        )}

        {metodoPago === "TRANSFERENCIA" && (
          <div className="gia-aparece space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
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
              <Input id="comprobante" name="comprobante" type="file" accept="image/*" className="h-12 pt-2.5 text-base" required />
            </div>
          </div>
        )}
      </Revelar>

      {/* Datos de contacto */}
      <Revelar className="space-y-4">
        <Paso n={4} titulo="Tus datos" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="clienteNombre">Nombre y apellido</Label>
            <Input id="clienteNombre" name="clienteNombre" autoComplete="name" className={CAMPO} value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="clienteEmail">Mail</Label>
            <Input id="clienteEmail" name="clienteEmail" type="email" inputMode="email" autoComplete="email" className={CAMPO} value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="clienteTelefono">Teléfono (WhatsApp)</Label>
            <Input id="clienteTelefono" name="clienteTelefono" type="tel" inputMode="tel" autoComplete="tel" className={CAMPO} value={telefono} onChange={(e) => setTelefono(e.target.value)} required />
          </div>
        </div>
      </Revelar>

      {/* Barra fija abajo: el total y el boton siempre a mano. */}
      <div className="sticky bottom-0 -mx-4 rounded-t-3xl border-t border-[var(--border)] bg-[var(--background)]/90 px-5 pt-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-14px_32px_-18px_rgba(74,28,5,0.4)] backdrop-blur-md sm:mx-0">
        <div className="mb-2 flex items-end justify-between gap-3">
          <span className="text-sm text-[var(--muted-foreground)]">
            {unidadesTotales > 0 ? `${unidadesTotales} ${unidadesTotales === 1 ? "producto" : "productos"}` : "Tu pedido"}
          </span>
          <span className="text-right">
            <span className="block text-xs text-[var(--muted-foreground)]">Total</span>
            <span key={total} className="gia-pop inline-block text-2xl leading-none font-semibold tabular-nums" aria-live="polite">
              {moneyAR(total)}
            </span>
          </span>
        </div>
        <Button type="submit" size="lg" disabled={pending} className="h-12 w-full rounded-full text-base transition-transform duration-150 active:scale-[0.98]">
          {pending ? "Enviando..." : "Confirmar pedido y mandarlo por WhatsApp"}
        </Button>
      </div>
    </form>
  );
}
