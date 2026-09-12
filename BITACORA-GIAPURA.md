# Bitácora del proyecto Giapura

Registro completo de lo construido junto a Claude Code: un sistema de gestión (ERP)
para la marca de pasta de maní **Giapura**, su integración con Tienda Nube, y la
landing de lanzamiento de la primera tanda nacional.

> Nota de seguridad: por prudencia, **este documento no incluye contraseñas ni
> secretos** (base de datos, tokens de Tienda Nube, claves de encriptación,
> `CRON_SECRET`, etc.). Todos viven en los archivos `.env` (que no se suben a git) y
> en las **Environment Variables de Vercel** de cada proyecto.

---

## 1. Contexto y objetivo

Giapura venía de producción casera con seguimiento en Excel. Al pasar a **producción
tercerizada en fábrica** para escalar a venta nacional, ese modelo quedó corto. El
objetivo fue reemplazar el Excel por un sistema web propio que conecte, en un solo
lugar: **costos → stock → ventas (vía Tienda Nube) → estado de resultados → envíos**,
y además una **landing de lanzamiento** premium para la preventa.

Decisiones tomadas:
- Software a medida (no herramientas de terceros combinadas).
- Canal de venta: **Tienda Nube** (se descartó Shopify por pagos en ARS, Mercado Pago
  nativo y correos argentinos integrados).
- App web hosteada (no local), usada por 2–5 personas.
- 2 productos (SKU): **Natural** y **Con cacao** (más un **Pack Lanzamiento**).
- Estado de resultados de uso gerencial interno, sin AFIP por ahora.

---

## 2. Los dos proyectos

| Proyecto | Qué es | Repo GitHub | URL en producción | Carpeta local |
|---|---|---|---|---|
| **giapura-erp** | Sistema de gestión interno (backoffice) | `fleonardi2008-debug/giapura-erp` | `https://giapura-erp.vercel.app` | `D:\Users\Usuario\Downloads\CLAUDE GIAPURA` |
| **giapura-landing** | Landing pública de lanzamiento | `fleonardi2008-debug/giapura-landing` | `https://giapura-landing.vercel.app` | `D:\Users\Usuario\Downloads\giapura-landing` |

Ambos se despliegan solos en Vercel con cada `git push`.

**Stack (los dos):** Next.js (App Router) + TypeScript + Tailwind. El ERP usa además
Prisma + PostgreSQL en **Neon** + Auth.js (login). La landing usa `motion` (animaciones)
y fuentes Clash Display / General Sans (Fontshare).

**Acceso al ERP:** usuario `leonardiyt360@gmail.com` (rol OWNER). La contraseña la
definió el usuario (no se guarda acá).

---

## 3. Sistema de gestión (giapura-erp) — qué hace

### Costos
- **Insumos** con historial de precios (cada cambio queda versionado en el tiempo).
- **Registrar compra** de insumo (entrada de stock, con costo opcional).
- **Productos (SKU)** con **receta (BOM)** versionada y **costo de fábrica** histórico.
- **Costo unitario** que combina insumos (con % de merma) + costo de fábrica.
- Economía por producto: **precio de venta, gastos generales prorrateados, margen
  unitario, contribución marginal, punto de equilibrio** y calculadora de "envío gratis
  a partir de X".
- Desglose de costos separando **Materia prima** y **Packaging**.

### Stock
- Stock de **materia prima** y **producto terminado**, con movimientos (compra,
  producción, venta, ajuste) y alertas de stock bajo.
- **Lotes de producción**: al marcarse "recibido" descuenta insumos e ingresa producto
  terminado, con costo promedio ponderado.
- **Ajuste manual** de stock de producto terminado (para packs/combos).

### Ventas / gastos / resultados
- **Pedidos** (entran solos desde Tienda Nube, o carga manual).
- **Gastos** (comisiones, envíos, marketing, fijos).
- **Estado de resultados** mensual: ingresos − costo de mercadería vendida − gastos =
  margen bruto y neto.
- **Inicio (dashboard)** con resumen del mes, alertas de stock bajo y costo por producto.

### Integración con Tienda Nube (completa y probada)
- Conexión **OAuth** (token guardado encriptado AES-256-GCM).
- **Webhooks** de pedidos con validación de firma HMAC.
- **Sincronización de productos**: matchea el código de SKU con el campo SKU de cada
  variante en Tienda Nube.
- **Pedidos automáticos**: al entrar una venta se crea el pedido, se descuenta stock y
  se reenvía el stock actualizado a Tienda Nube.
- **Stock bidireccional**: cambios de stock en Tienda Nube también vuelven a Giapura
  (webhook `product/updated`), con guard anti-loop.
- **Cron diario** de reconciliación como respaldo de los webhooks.
- Endpoint público **`/api/public/contador-preventa`** que alimenta el contador de la
  landing (packs vendidos, objetivo, ventana de la preventa), configurado por env vars
  `PREVENTA_SKU_CODIGO`, `PREVENTA_OBJETIVO`, `PREVENTA_INICIO`, `PREVENTA_FIN`.

---

## 4. Landing de lanzamiento (giapura-landing)

Concepto: **no es la web permanente**, es la landing del lanzamiento nacional. Se siente
como el último capítulo de una historia, con estética premium (Apple/Nothing), mucho
aire, tipografía Clash Display grande, fondo beige tostado y secciones oscuras
alternadas. El frasco es el protagonista y acompaña el scroll (estilo Unreal Water).

**Urgencia = el tiempo:** la web abre **solo 24 horas**; quien compra en esa ventana
recibe el **Ticket de Fundador** (numerado, edición irrepetible). Pasadas las 24hs, la
tienda cierra. (Se sacó la barra de stock: la urgencia es el countdown, no el stock.)

Secciones: Intro (temporizador + frasco + logo, revela el título al scrollear) →
Comprar Giapura (foto de los 2 frascos + botón + countdown) → ¿Por qué Giapura? (3
tarjetas, sección oscura) → Ticket de Fundador (ticket de colección + copy) →
Testimonios (mensajes de DM) → Preguntas frecuentes → ¿Hasta dónde llegamos? (mapa real
de Argentina) → Gracias (carta de Fran, sección oscura).

Efectos: botones con brillo que barre + lift + sombra que crece; fondos "aurora" que
derivan; hover-lift en tarjetas; ticket con tilt 3D; barra fija superior con navegación
por secciones + countdown + botón "Comprar" siempre visible; barra de progreso de
lectura; intro cinematográfica con entrada en etapas.

**Material real integrado:** logo de Giapura, foto del frasco Con cacao (intro), foto de
los dos frascos (Comprar). Fotos servidas con `next/image`.

**Cómo compra la gente:** el botón "Comprar" (`NEXT_PUBLIC_TIENDA_URL`) lleva a la tienda
de Tienda Nube (checkout ahí). El contador lee del ERP (`NEXT_PUBLIC_CONTADOR_URL`).

---

## 5. Configuración y variables de entorno (dónde viven)

**giapura-erp** (en `.env` local y en Vercel):
`DATABASE_URL` (Neon), `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `TIENDANUBE_CLIENT_ID`,
`TIENDANUBE_CLIENT_SECRET`, `TIENDANUBE_TOKEN_ENCRYPTION_KEY`, `CRON_SECRET`,
`PREVENTA_SKU_CODIGO`, `PREVENTA_OBJETIVO`, `PREVENTA_INICIO`, `PREVENTA_FIN`.

**giapura-landing** (en Vercel):
`NEXT_PUBLIC_TIENDA_URL` (a dónde lleva "Comprar"),
`NEXT_PUBLIC_CONTADOR_URL` (endpoint del contador en el ERP).

**App de Tienda Nube** (Partners Portal): App ID `36340`, Redirect URL
`https://giapura-erp.vercel.app/api/tiendanube/callback`, scopes `read_products`,
`write_products`, `read_orders`. Webhooks de privacidad y de pedidos apuntan a
`https://giapura-erp.vercel.app/api/webhooks/tiendanube`.

Actualmente conectado a una **tienda demo** gratuita de Tienda Nube (para pruebas). Al
tener la tienda real: reconectar la integración y cambiar `NEXT_PUBLIC_TIENDA_URL`.

---

## 6. Pendientes / próximos pasos

1. **Definir fecha y hora del lanzamiento**: setear `PREVENTA_INICIO` y `PREVENTA_FIN`
   en las env vars del **ERP** en Vercel (formato ISO/UTC; Argentina es UTC−3) y
   redeploy. Ahí arranca el countdown real y el contador se resetea a 0.
2. **Testimonios reales**: reemplazar los mensajes de ejemplo por las capturas reales de
   DMs.
3. **Foto de detalle del label** (`detalle.jpg`, ya está en el proyecto) sin usar
   todavía — se puede sumar en "¿Por qué Giapura?".
4. **Tienda real**: cuando exista, crear/convertir la tienda en Tienda Nube, reconectar
   la integración en el ERP y actualizar el link de compra de la landing.
5. **Cargar datos reales** en el ERP: insumos, recetas, costos de fábrica, stock.

---

## 7. Notas técnicas útiles

- Node.js se instaló con winget (`OpenJS.NodeJS.LTS`).
- Los servidores de desarrollo corren con `npm run dev` (ERP en puerto 3000, landing en
  3001).
- Prisma 7 usa driver adapter de Neon; el cliente se genera en `src/generated/prisma`.
- Next.js 16 renombró `middleware.ts` a `proxy.ts`. El proxy de auth **excluye**
  `api/auth`, `api/webhooks`, `api/cron` y `api/public` (esos endpoints no pasan por el
  login).
- Vercel plan Hobby: los cron solo pueden correr **una vez por día**.

---

_Documento generado como registro del proyecto. Fecha del último trabajo: julio 2026._
