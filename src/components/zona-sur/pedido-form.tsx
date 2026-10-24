"use client";

import { Fragment, useEffect, useMemo, useRef, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { crearZonaSurPedido } from "@/lib/actions/zona-sur";
import { estimarEnvioAndreani, numeroDeCodigoPostal, type TarifaAndreani } from "@/lib/zona-sur-andreani";
import { descuentoEfectivo as descuentoEnEfectivo, precioEnEfectivo } from "@/lib/zona-sur-precios";
import { distanciaKm, ubicarDireccion, type Punto } from "@/lib/zona-sur-geo";
import { cn } from "@/lib/utils";

const MapaZona = dynamic(() => import("./mapa-zona").then((m) => m.MapaZona), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse rounded-xl bg-muted" />,
});

type Sku = {
  id: string;
  nombre: string;
  precioVenta: number;
  imagenUrl: string | null;
  /** CSS object-position de la foto, ej: "50% 40%" */
  imagenPosicion: string;
  /** 1 = sin zoom */
  imagenZoom: number;
  esPack: boolean;
  /** frascoId → cuántos frascos de ese gasta una unidad (un pack gasta lo de su composición) */
  consumo: Record<string, number>;
};
type StockFrasco = { id: string; nombre: string; total: number; usado: number };
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
/** Resultado de ubicar la dirección del cliente en el mapa de la zona de envío. */
type Verificacion = {
  direccion: string;
  estado: "ok" | "fuera" | "noencontrada" | "error";
  punto?: Punto;
  km?: number;
};
type MetodoPago = "TRANSFERENCIA" | "EFECTIVO";

// Campos y botones pensados para el pulgar: 48 px de alto y letra de 16 px (evita el zoom automatico en iPhone).
const CAMPO = "h-12 text-base";
const BOTON_CANTIDAD = "size-11 rounded-full border-transparent bg-[var(--card)] text-xl shadow-sm transition-transform duration-150 active:scale-90";

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
      role="radio"
      aria-checked={activo}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex min-h-14 w-full items-start gap-3 rounded-2xl border bg-[var(--card)] px-4 py-3.5 text-left transition-all duration-200 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40",
        activo
          ? "border-[var(--primary)] shadow-[0_8px_24px_-14px_rgba(74,28,5,0.45)] ring-1 ring-[var(--primary)]"
          : "border-[var(--border)] hover:border-[var(--muted-foreground)]/60"
      )}
    >
      {/* Punto de selección: se llena con una pequeña animación */}
      <span
        aria-hidden
        className={cn(
          "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2 transition-colors duration-200",
          activo ? "border-[var(--primary)]" : "border-[var(--border)]"
        )}
      >
        <span
          className={cn(
            "size-2.5 rounded-full bg-[var(--primary)] transition-transform duration-200 ease-out",
            activo ? "scale-100" : "scale-0"
          )}
        />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">{children}</span>
    </button>
  );
}

/** Encabezado de cada paso: círculo con el número + título. */
function Paso({ n, titulo, nota }: { n: number; titulo: string; nota?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--primary)] text-sm font-semibold text-[var(--primary-foreground)]">
        {n}
      </span>
      <div>
        <h2 className="text-2xl leading-tight">{titulo}</h2>
        {nota && <p className="text-sm text-[var(--muted-foreground)]">{nota}</p>}
      </div>
    </div>
  );
}

/** Sección que aparece suavemente cuando llega a la pantalla (una sola vez). */
function Revelar({ className, children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <section ref={ref} data-visible={visible} className={cn("gia-revelar", className)}>
      {children}
    </section>
  );
}

export function ZonaSurPedidoForm({ config, skus, stock }: { config: Config; skus: Sku[]; stock: StockFrasco[] }) {
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
  const [montado, setMontado] = useState(false);
  const [verif, setVerif] = useState<Verificacion | null>(null);
  const [verificando, setVerificando] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMontado(true));
    return () => cancelAnimationFrame(id);
  }, []);

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
  const unidadesTotales = Object.values(cantidades).reduce((a, c) => a + c, 0);
  // Las cajas de Andreani son de a dos: por ese medio solo se piden packs, no frascos sueltos.
  const soloPacks = metodoEntrega === "ANDREANI";

  // Stock de lo que reparte Fran (todo menos Andreani, que sale de fábrica y no tiene tope).
  const limitaStock = metodoEntrega !== "ANDREANI";
  const quedanSinCarrito = (f: StockFrasco) => Math.max(0, f.total - f.usado);
  const enCarrito = (frascoId: string) =>
    skus.reduce((acc, s) => acc + (cantidades[s.id] ?? 0) * (s.consumo[frascoId] ?? 0), 0);
  // ¿Se puede sumar una unidad más de este producto sin pasarse del stock?
  const hayStockPara = (sku: Sku) =>
    !limitaStock ||
    stock.every((f) => {
      const gasta = sku.consumo[f.id] ?? 0;
      return gasta === 0 || quedanSinCarrito(f) - enCarrito(f.id) >= gasta;
    });

  const estimadoAndreani = estimarEnvioAndreani(config.andreaniTarifas, cpEstimado);
  const mensajeEstimado = !cpEstimado.trim()
    ? null
    : numeroDeCodigoPostal(cpEstimado) === null
      ? "Escribí los 4 números de tu código postal."
      : estimadoAndreani === null
        ? "No tenemos un aproximado para ese código postal. Lo ves en el link de Andreani antes de pagar."
        : `Aproximadamente ${moneyAR(estimadoAndreani)}`;

  const centroZona: Punto = { lat: config.zonaCentroLat, lng: config.zonaCentroLng };
  const nombreZona = config.zonaPrecio > 0 ? "zona de envío a domicilio" : "zona de envío gratis";
  // Solo vale el resultado si corresponde a lo que está escrito ahora.
  const verifVigente = verif && verif.direccion === direccion.trim() ? verif : null;

  async function verificarDireccion(texto: string): Promise<Verificacion | null> {
    const limpio = texto.trim();
    if (limpio.length < 5) return null;
    if (verif && verif.direccion === limpio && verif.estado !== "error") return verif;
    setVerificando(true);
    const r = await ubicarDireccion(limpio, centroZona);
    let v: Verificacion;
    if (r.estado === "ok") {
      const km = distanciaKm(centroZona, r.punto);
      v = { direccion: limpio, estado: km <= config.zonaRadioKm ? "ok" : "fuera", punto: r.punto, km };
    } else {
      v = { direccion: limpio, estado: r.estado };
    }
    setVerif(v);
    setVerificando(false);
    return v;
  }

  function mensajeVerificacion(v: Verificacion | null) {
    if (!v) return "Escribí tu dirección completa para verificar si está dentro de la zona de envío";
    if (v.estado === "fuera")
      return `Tu dirección queda fuera de la ${nombreZona}.${config.andreaniActivo ? " Elegí envío por Andreani." : " Escribinos y lo vemos."}`;
    if (v.estado === "noencontrada") return "No pudimos ubicar esa dirección. Agregá la localidad (ej: Bernal) y probá de nuevo.";
    return "No pudimos verificar tu dirección ahora. Probá de nuevo en un momento.";
  }

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
    const pasado = stock.find((f) => limitaStock && enCarrito(f.id) > quedanSinCarrito(f));
    if (pasado) {
      toast.error(
        `No nos queda tanto stock de ${pasado.nombre} para entregar en la zona (quedan ${quedanSinCarrito(pasado)}).${config.andreaniActivo ? " Por Andreani sí podés pedirlo." : ""}`
      );
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
      // Envío a domicilio: la dirección tiene que caer dentro del círculo del mapa.
      if (metodoEntrega === "ENVIO_ZONA") {
        const v = await verificarDireccion(direccion);
        if (!v || v.estado !== "ok" || !v.punto) {
          toast.error(mensajeVerificacion(v));
          document.getElementById("direccion")?.scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }
        formData.set("lat", String(v.punto.lat));
        formData.set("lng", String(v.punto.lng));
      }
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
        <svg viewBox="0 0 52 52" className="gia-entra size-20" fill="none" aria-hidden>
          <circle cx="26" cy="26" r="24" stroke="var(--primary)" strokeWidth="2" opacity="0.25" />
          <path className="gia-check" d="M15 27l8 8 14-16" stroke="var(--primary)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <h1 className="gia-entra text-3xl font-semibold" style={{ "--d": "150ms" } as React.CSSProperties}>¡Listo, {nombre.split(" ")[0]}!</h1>
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
    <form action={handleSubmit} className="mx-auto max-w-2xl space-y-8 px-4 pt-8 sm:px-6 sm:pt-12">
      <header className="text-center">
        <img
          src="/branding/giapura-logo.png"
          alt="Giapura"
          className="gia-entra mx-auto h-12 w-auto sm:h-16"
        />
        <p
          className="gia-entra gia-mano mt-1 text-2xl text-[var(--muted-foreground)]"
          style={{ "--d": "100ms" } as React.CSSProperties}
        >
          Pedidos Zona Sur
        </p>
        <p
          className="gia-entra mx-auto mt-2 max-w-md text-sm text-[var(--muted-foreground)] sm:text-base"
          style={{ "--d": "200ms" } as React.CSSProperties}
        >
          {hayFrascosSueltos ? "Elegí tus productos" : "Elegí tu pack"}, cómo lo recibís y cómo pagás. Coordinamos el resto
          por WhatsApp.
        </p>
        {hayDescuentoEfectivo && (
          <p
            className="gia-entra mx-auto mt-4 w-fit rounded-full bg-[var(--accent)]/70 px-4 py-1.5 text-sm font-medium"
            style={{ "--d": "300ms" } as React.CSSProperties}
          >
            Pagando en efectivo tenés {config.descuentoEfectivo}% de descuento
          </p>
        )}
      </header>

      {/* Productos */}
      <section className="space-y-5">
        <Paso
          n={1}
          titulo={hayFrascosSueltos ? "Elegí tus productos" : "Elegí tu pack"}
          nota={hayFrascosSueltos ? "Packs de dos frascos o frascos sueltos" : "Dos frascos, tu combinación"}
        />
        {stock.length > 0 && (
          <div className="space-y-3 px-1" role="group" aria-label="Stock para entrega en la zona">
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
            {config.andreaniActivo && (
              <p className="text-[11px] tracking-wide text-[var(--muted-foreground)]">
                Entrega propia en la zona. Por Andreani siempre hay: sale de fábrica.
              </p>
            )}
          </div>
        )}
        {skus.length === 0 && (
          <p className="text-sm text-[var(--muted-foreground)]">
            Todavía no hay productos cargados. (Se cargan en Productos (SKU) del panel.)
          </p>
        )}
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
          {skus.map((sku, idx) => {
            const cantidad = cantidades[sku.id] ?? 0;
            const primerSuelto = !sku.esPack && (idx === 0 || skus[idx - 1].esPack);
            return (
              <Fragment key={sku.id}>
                {primerSuelto && (
                  <h3 className="col-span-2 pt-2 text-center text-2xl lg:col-span-3">
                    {idx === 0 ? "Frascos" : "O un frasco suelto"}
                  </h3>
                )}
              <div
                className={cn(
                  "gia-entra flex flex-col gap-2 rounded-3xl border bg-[var(--card)] p-2.5 text-center transition-all duration-300 sm:gap-3 sm:p-4",
                  cantidad > 0
                    ? "-translate-y-0.5 border-[var(--primary)] shadow-[0_14px_30px_-16px_rgba(74,28,5,0.5)] ring-1 ring-[var(--primary)]"
                    : "border-[var(--border)] shadow-[0_1px_2px_rgba(74,28,5,0.05)]",
                  soloPacks && !sku.esPack && "opacity-50"
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
                    <div className="flex h-full w-full items-center justify-center text-[var(--muted-foreground)]">
                      giapura.
                    </div>
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
                  <p className="text-lg font-semibold sm:text-xl">{moneyAR(sku.precioVenta)}</p>
                  {hayDescuentoEfectivo && (
                    <p className="text-xs text-[var(--muted-foreground)] sm:text-sm">
                      Efectivo <strong className="text-[var(--foreground)]">{moneyAR(precioEnEfectivo(sku.precioVenta, config.descuentoEfectivo))}</strong>
                    </p>
                  )}
                </div>
                {!hayStockPara(sku) && (
                  <p className="text-xs font-medium text-[var(--muted-foreground)]">
                    {cantidad > 0 ? "Llegaste al stock disponible" : "Agotado para entrega en la zona"}
                    {config.andreaniActivo && sku.esPack && cantidad === 0 && " (por Andreani sí)"}
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
                    disabled={(soloPacks && !sku.esPack) || !hayStockPara(sku)}
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

      {/* Entrega */}
      <Revelar className="space-y-4">
        <Paso n={2} titulo="¿Cómo lo recibís?" />
        <div className="space-y-3" role="radiogroup" aria-label="Cómo lo recibís">
          <TarjetaOpcion activo={metodoEntrega === "ENVIO_ZONA"} onClick={() => setMetodoEntrega("ENVIO_ZONA")}>
            <span className="flex flex-wrap items-center gap-2 font-medium">
              Envío a domicilio
              {config.zonaPrecio > 0 ? <>— {moneyAR(config.zonaPrecio)}</> : <span className="gia-gratis">Gratis</span>}
            </span>
            <span className="text-sm text-[var(--muted-foreground)]">
              Válido dentro del círculo marcado en el mapa. Verificamos tu dirección.
            </span>
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
          <ol className="gia-aparece list-decimal space-y-1 rounded-2xl border border-[var(--border)] bg-[var(--card)] py-3 pl-9 pr-4 text-sm">
            <li>Elegí tus packs (las cajas de envío son de a dos, no hay frascos sueltos por Andreani).</li>
            <li>Pagás los productos por transferencia y subís el comprobante.</li>
            <li>Te mandamos por WhatsApp un link de Andreani.</li>
            <li>En ese link completás tu dirección y pagás el envío a Andreani.</li>
          </ol>
        )}

        {metodoEntrega === "ANDREANI" && config.andreaniActivo && config.andreaniTarifas.length > 0 && (
          <div className="gia-aparece space-y-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
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
              inputMode="numeric"
              maxLength={8}
              className={cn(CAMPO, "sm:max-w-56")}
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
          <div className="gia-aparece space-y-2 pt-1">
            <p className="text-sm font-medium">¿Qué día te lo llevamos?</p>
            <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Día de entrega en el colegio">
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
          <div className="gia-aparece space-y-3 pt-1">
            <MapaZona
              lat={config.zonaCentroLat}
              lng={config.zonaCentroLng}
              radioKm={config.zonaRadioKm}
              alto="16rem"
              mostrarCentro={false}
              punto={verifVigente?.punto}
            />
            <p className="text-xs text-[var(--muted-foreground)]">
              {config.zonaPrecio > 0 ? "El envío llega" : "El envío gratis llega"} a las direcciones dentro del círculo.
              Escribí la tuya y la verificamos.
            </p>
            <div className="space-y-2">
              <Label htmlFor="direccion">Dirección de entrega</Label>
              <Input
                id="direccion"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Calle, número, localidad"
                autoComplete="street-address"
                className={CAMPO}
                onBlur={() => void verificarDireccion(direccion)}
                aria-describedby="estado-direccion"
                aria-invalid={verifVigente != null && verifVigente.estado !== "ok"}
                required
              />
              <div id="estado-direccion" aria-live="polite" className="space-y-2">
                {verificando && (
                  <p className="gia-aparece text-sm text-[var(--muted-foreground)]">Verificando tu dirección…</p>
                )}
                {!verificando && verifVigente?.estado === "ok" && (
                  <p className="gia-aparece flex items-center gap-2 rounded-xl bg-[#e4eed6] px-3 py-2 text-sm font-medium text-[#2f5516]">
                    <span aria-hidden>✓</span> Tu dirección está dentro de la {nombreZona}
                  </p>
                )}
                {!verificando && verifVigente && verifVigente.estado !== "ok" && (
                  <div
                    role="alert"
                    className="gia-aparece space-y-2 rounded-xl border border-[var(--destructive)]/40 bg-[var(--destructive)]/10 px-3 py-2.5 text-sm"
                  >
                    <p className="font-medium text-[var(--destructive)]">
                      {verifVigente.estado === "fuera"
                        ? `Tu dirección queda fuera de la ${nombreZona} (a ${verifVigente.km?.toFixed(1)} km del centro).`
                        : mensajeVerificacion(verifVigente)}
                    </p>
                    {verifVigente.estado === "fuera" && config.andreaniActivo && (
                      <>
                        <p>Verificá la dirección o elegí envío por Andreani, que llega a todo el país.</p>
                        <Button type="button" variant="outline" className="h-11" onClick={elegirAndreani}>
                          Elegir envío por Andreani
                        </Button>
                      </>
                    )}
                  </div>
                )}
                {!verificando && !verifVigente && direccion.trim().length >= 5 && (
                  <Button type="button" variant="outline" className="h-11" onClick={() => void verificarDireccion(direccion)}>
                    Verificar dirección
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Revelar>

      {/* Pago */}
      <Revelar className="space-y-4">
        <Paso n={3} titulo="¿Cómo pagás?" />
        <div className="space-y-3" role="radiogroup" aria-label="Cómo pagás">
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
          <div className="gia-aparece space-y-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
            <p className="text-sm">
              Total a pagar en efectivo: <strong>{moneyAR(totalConEnvio)}</strong>
              {descuento > 0 && <> (ya con el {config.descuentoEfectivo}% de descuento incluido)</>}
            </p>
            <Label htmlFor="pagaCon">¿Con cuánto pagás?</Label>
            <Input
              id="pagaCon"
              name="pagaCon"
              type="number"
              inputMode="numeric"
              className={CAMPO}
              min={totalConEnvio}
              step="1"
              placeholder={`Ej: ${Math.ceil(totalConEnvio / 1000) * 1000}`}
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

      {/* Barra fija abajo: el total y el boton siempre a mano, sin scrollear hasta el final. */}
      <div className="sticky bottom-0 -mx-4 rounded-t-3xl border-t border-[var(--border)] bg-[var(--background)]/90 px-5 pt-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-14px_32px_-18px_rgba(74,28,5,0.4)] backdrop-blur-md sm:mx-0">
        <div className="mb-2 flex items-end justify-between gap-3">
          <span className="text-sm text-[var(--muted-foreground)]">
            {unidadesTotales > 0 ? `${unidadesTotales} ${unidadesTotales === 1 ? "producto" : "productos"}` : "Tu pedido"}
            {metodoEntrega === "ENVIO_ZONA" && config.zonaPrecio === 0 && (
              <span className="block text-xs font-semibold text-[var(--primary)]">Envío gratis incluido</span>
            )}
            {descuento > 0 && (
              <span className="block text-xs">
                Incluye {config.descuentoEfectivo}% de descuento por efectivo (−{moneyAR(descuento)})
              </span>
            )}
          </span>
          <span className="text-right">
            <span className="block text-xs text-[var(--muted-foreground)]">Total</span>
            <span key={totalConEnvio} className="gia-pop inline-block text-2xl leading-none font-semibold tabular-nums" aria-live="polite">
              {moneyAR(totalConEnvio)}
            </span>
          </span>
        </div>
        <Button type="submit" size="lg" disabled={pending} className="h-12 w-full rounded-full text-base transition-transform duration-150 active:scale-[0.98]">
          {pending ? "Enviando..." : "Confirmar pedido"}
        </Button>
      </div>
    </form>
  );
}
