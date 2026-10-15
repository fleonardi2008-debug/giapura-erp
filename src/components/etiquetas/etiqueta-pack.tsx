import { ETIQUETA_ALTO_MM, ETIQUETA_ANCHO_MM, type Etiqueta } from "@/lib/etiquetas";

/**
 * CSS de la etiqueta, en milímetros y sin Tailwind: tiene que salir igual de la impresora.
 * Cada etiqueta es una página (@page) del tamaño de la etiqueta; en pantalla se ven como
 * tarjetas del mismo tamaño para revisarlas antes de imprimir.
 */
const ESTILOS = `
.etq { box-sizing: border-box; width: ${ETIQUETA_ANCHO_MM}mm; height: ${ETIQUETA_ALTO_MM}mm; padding: 2.5mm 3mm; display: flex; flex-direction: column; overflow: hidden; background: #fff; color: #000; font-family: Arial, Helvetica, sans-serif; border: 0.3mm solid #000; }
:where(.etq) :where(p, ul, li) { margin: 0; padding: 0; list-style: none; }
.etq > * { flex-shrink: 0; }
.etq-cliente { font-size: 13pt; font-weight: 800; line-height: 1.1; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
.etq-entrega { margin-top: 1.2mm; font-size: 7pt; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
.etq-destino { font-size: 9pt; line-height: 1.2; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
.etq-contenido { margin-top: 1.5mm; padding-top: 1.5mm; border-top: 0.3mm solid #000; }
.etq-item + .etq-item { margin-top: 1mm; }
.etq-producto { font-size: 7pt; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 1; overflow: hidden; }
.etq-frascos li, .etq-suelto { margin-top: 0.6mm; font-weight: 800; line-height: 1.12; }
.etq-f-g .etq-frascos li, .etq-f-g .etq-suelto { font-size: 10.5pt; }
.etq-f-m .etq-frascos li, .etq-f-m .etq-suelto { font-size: 9pt; }
.etq-f-p .etq-frascos li, .etq-f-p .etq-suelto { font-size: 7.5pt; }
.etq-f-xs .etq-frascos li, .etq-f-xs .etq-suelto { margin-top: 0.3mm; font-size: 6.5pt; }
.etq-pie { margin-top: auto; display: flex; justify-content: space-between; gap: 2mm; font-size: 6.5pt; font-weight: 700; }
.etq-hoja { display: flex; flex-wrap: wrap; gap: 6mm; }
@page { size: ${ETIQUETA_ANCHO_MM}mm ${ETIQUETA_ALTO_MM}mm; margin: 0; }
@media print {
  html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
  .no-imprimir { display: none !important; }
  .etq-pagina { padding: 0 !important; }
  .etq-hoja { display: block; }
  .etq { border: none; break-after: page; page-break-after: always; }
  .etq:last-child { break-after: auto; page-break-after: auto; }
}
`;

export function EtiquetaEstilos() {
  return <style dangerouslySetInnerHTML={{ __html: ESTILOS }} />;
}

/** Cuantas más líneas lleva el pedido, más chica la letra, para que entren todas sin cortarse. */
function tamanoLetra(e: Etiqueta) {
  const lineas = e.items.reduce((suma, item) => suma + (item.frascos.length > 0 ? 1 + item.frascos.length : 1), 0);
  if (lineas <= 3) return "g";
  if (lineas <= 5) return "m";
  if (lineas <= 7) return "p";
  return "xs";
}

export function EtiquetaPack({ etiqueta: e }: { etiqueta: Etiqueta }) {
  return (
    <article className={`etq etq-f-${tamanoLetra(e)}`} aria-label={`Etiqueta de ${e.cliente}`}>
      <p className="etq-cliente">{e.cliente}</p>
      <p className="etq-entrega">{e.entrega}</p>
      <p className="etq-destino">{e.destino}</p>
      <div className="etq-contenido">
        {e.items.map((item, i) =>
          item.frascos.length > 0 ? (
            <div key={i} className="etq-item">
              <p className="etq-producto">
                {item.cantidad} × {item.nombre}
                {item.cantidad > 1 ? " · cada uno lleva" : ""}
              </p>
              <ul className="etq-frascos">
                {item.frascos.map((f) => (
                  <li key={f.nombre}>
                    {f.cantidad} × {f.nombre}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p key={i} className="etq-item etq-suelto">
              {item.cantidad} × {item.nombre}
            </p>
          )
        )}
      </div>
      <p className="etq-pie">
        <span>
          #{e.codigo} · {e.fecha.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })}
        </span>
        <span>
          {e.unidades} {e.unidades === 1 ? "unidad" : "unidades"}
        </span>
      </p>
    </article>
  );
}
