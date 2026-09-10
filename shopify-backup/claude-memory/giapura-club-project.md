---
name: giapura-club-project
description: "Tercer proyecto \"Club Fundadores\" (página del QR) y cómo se conecta con el ERP"
metadata: 
  node_type: memory
  type: project
  originSessionId: 4c6c4e1e-96ef-49ae-b506-3bfd5a6ff366
---

Existe un tercer proyecto además de giapura-erp y giapura-landing: **giapura-club**
(`D:\Users\Usuario\Downloads\giapura-club`), la página pública premium a la que llega
por QR el consumidor final que compró la edición Fundador. Va en **su propio dominio**
(subdominio del dominio de Giapura en Don Web, ej. `club.giapura.com`); el QR apunta
siempre a esa URL fija y el contenido interno cambia sin tocar código.

Arquitectura (creado 2026-07-23):
- El club **no tiene DB propia**. Lee contenido del ERP: `GET /api/public/club-contenido`
  (config hero/intro/footer + bloques + historial) y postea mails a
  `POST /api/public/club-novedades` (tabla `Fundador`, lista separada del newsletter).
- Se edita todo desde el ERP → menú **Club Fundadores** (`src/app/(app)/club`), un
  mini-CMS de bloques/historial/config guardado en Neon. Modelos Prisma: `ClubBloque`,
  `ClubHistorialItem`, `ClubConfig` (singleton), `Fundador`.
- Stack del club = clon del de la landing (Next 16 + Tailwind v4 + motion, fuentes
  Fontshare Clash Display/General Sans, mismo `globals.css` con tokens tierra).
- Env vars del club en Vercel: `ERP_URL` y `NEXT_PUBLIC_ERP_URL` → giapura-erp.
- **Decisiones del dueño (Fran):** NO mostrar número de fundador en ningún lado (era un
  quilombo); el "CRM" es el propio ERP; video de bienvenida = embed YouTube/Vimeo sin
  listar.

Ver [[giapura-repo-concurrent-commits]] al tocar el ERP.
