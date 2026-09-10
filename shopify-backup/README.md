# Backup — código de giapura.com.ar (Shopify)

Backup de emergencia hecho el 2026-09-10 porque la compu donde se venía trabajando
con Claude Code puede ir a reparación. Esto permite seguir trabajando desde
**cualquier otra compu**, con la misma cuenta de Claude o incluso sin ella.

## Lo más importante primero

**El sitio en vivo (giapura.com.ar) NO depende de esta carpeta.** El código ya
está pegado dentro de Shopify (en los bloques "Custom Liquid" del tema), así
que si esta compu desaparece, **la web sigue funcionando igual**. Esta carpeta
es la copia de seguridad de los *archivos fuente* — los necesitás recién
cuando quieras hacer el próximo cambio.

## Qué hay en esta carpeta

Tres bloques de código, cada uno con su archivo `-src.liquid` (el que se edita)
y su versión ya purificada a ASCII (la que se pega en Shopify):

| Archivo fuente (editar este) | Archivo final (pegar este en Shopify) | Dónde va en Shopify |
|---|---|---|
| `pagina-src.liquid` | `pagina-slim.liquid` (generado, no está acá — ver abajo) | Personalizar tema → **Inicio** → sección "Custom Liquid" |
| `producto-extra-src.liquid` | `producto-extra.liquid` | Personalizar tema → contexto **Producto** → sección "Custom Liquid" (debajo del bloque de info del producto) |
| `newsletter-footer-src.liquid` | `newsletter-footer.liquid` | Personalizar tema → contexto **Footer** → sección "Custom Liquid" |

`pagina-slim-src.liquid` es un paso intermedio autogenerado por `build_slim.mjs`
a partir de `pagina-src.liquid` (separa el CSS/JS a archivos externos porque
la landing es grande). El archivo final purificado sería `pagina-slim.liquid`
(si no está en esta carpeta, se regenera con el pipeline de abajo).

## Estado actual (al momento de este backup)

- **Landing (pagina-src.liquid):** CSS externo en
  `https://cdn.shopify.com/s/files/1/0995/7068/0129/files/pagina_54eea0e9-b6f4-4671-beb2-3593a61462f4.css?v=1788962811`
  y JS en
  `https://cdn.shopify.com/s/files/1/0995/7068/0129/files/pagina_c6af7c09-0a8f-487e-9907-ce986d09a662.js?v=1788045337`
  (esas URLs ya están escritas dentro de `pagina-slim-src.liquid`, no hace
  falta memorizarlas).
- **Producto:** bloque autocontenido (CSS y JS inline, no depende de archivos
  externos). Fondo del bloque: `#E6D7AC`. Full-bleed lateral con
  `width:100vw` + `overflow-x:hidden` en `html,body` (¡importante no sacar esa
  regla o vuelve el scroll horizontal!).
- **Newsletter footer:** bloque autocontenido, pega en el contexto Footer.
- Precio del Ticket de Fundador ($28.540 tachado → Gratis) vive en la variable
  `gia_ticket_valor` arriba de `pagina-src.liquid`.
- Ya se sacó del tema (vía editor, no por código) la sección nativa
  "Product recommendations" en la página de producto — no hace falta tocarla
  de nuevo salvo que se agreguen más productos a la tienda.

## Pipeline para editar y volver a publicar

Todo esto corre con Node.js (con `npm install liquidjs sharp` una vez, sin
`--save`, en esta misma carpeta o en una temporal).

### Para la landing (`pagina-src.liquid`)

```bash
node scripts/build_slim.mjs   # separa CSS/JS, actualiza pagina-slim-src.liquid
node scripts/ascii.mjs        # purifica a ASCII -> pagina-slim.liquid
node scripts/render_real.mjs  # renderiza con liquidjs para verificar visualmente
```

Como usa CSS/JS externos alojados en Shopify Files, cualquier cambio de CSS/JS
requiere **subir el archivo nuevo** vía la API de Shopify (GraphQL Admin:
`stagedUploadsCreate` → `do_upload.mjs` → `fileCreate` → actualizar
`gia_css_url`/`gia_js_url` en `pagina-slim-src.liquid` → `fileDelete` del
archivo viejo) antes de volver a purificar. Si no tenés acceso a la API de
Shopify configurada en la compu nueva, se puede seguir editando el CSS/JS
igual y pegar el bloque completo sin separar (más pesado, pero funciona: el
límite de Shopify para Custom Liquid es 50KB, la landing ronda los 45KB ya
separada así que sin separar puede pasarse — probar primero).

### Para producto y newsletter (autocontenidos, no requieren subir nada)

```bash
node scripts/ascii_producto.mjs      # -> producto-extra.liquid
node scripts/render_producto.mjs     # verificación visual

node scripts/ascii_newsletter.mjs    # -> newsletter-footer.liquid
node scripts/render_newsletter.mjs   # verificación visual
```

Después de generar el `.liquid` final, se copia tal cual (todo el archivo) y
se pega reemplazando el contenido del bloque "Custom Liquid" correspondiente
en el editor de temas de Shopify (Personalizar tema).

### ⚠️ Bug conocido de estos scripts — leer antes de tocarlos

Los scripts `ascii*.mjs` purifican caracteres no-ASCII según la zona
(HTML/script/style) usando una regex para detectar los bloques `<script>` y
`<style>`. **Si algún día hay que reescribir uno de estos scripts a mano con
un heredoc de bash**, cualquier backslash duplicado (`\\s\\S`) se puede
"comer" un backslash silenciosamente y romper la regex sin dar error visible
— el síntoma es que todos los caracteres con tilde terminan codificados como
entidad HTML (`&#243;`) en vez del escape correcto según la zona. La forma
segura de evitarlo (ya aplicada en las versiones de esta carpeta) es no usar
`[\s\S]` en absoluto: usar `.` con la flag `s` (dotAll) —
`new RegExp("<" + et + "[^>]*>.*?</" + et + ">", "gis")` — que no necesita
ningún backslash y no se puede romper así.

## Cómo seguir en otra compu

1. Instalá Claude Code (o simplemente Node.js si querés correr los scripts a
   mano) y logueate con **la misma cuenta** — la cuenta/suscripción anda
   igual en cualquier máquina, no depende de esta compu.
2. Cloná o descargá este repo (`giapura-erp`, remoto en GitHub:
   `fleonardi2008-debug/giapura-erp`) — esta carpeta `shopify-backup/` va a
   estar ahí.
3. Para las credenciales de Shopify (API), si las tenías configuradas como
   conector/MCP en esta compu, hay que volver a conectarlas en la cuenta de
   Claude en la máquina nueva (Configuración → Conectores) — eso normalmente
   sí queda asociado a la cuenta, no a la compu, pero conviene verificarlo
   apenas arranques ahí.
4. El historial de esta conversación específica (los mensajes de este chat)
   vive local en esta compu y no se transfiere solo. Lo que importa para
   seguir trabajando no es el historial del chat, sino este backup de código
   — con esto y explicándole a Claude en la compu nueva "seguimos el
   lanzamiento de Giapura, mirá este README" alcanza para retomar sin
   perder contexto real.
