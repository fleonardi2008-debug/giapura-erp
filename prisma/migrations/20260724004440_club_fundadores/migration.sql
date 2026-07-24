-- CreateEnum
CREATE TYPE "ClubBloqueTipo" AS ENUM ('TEXTO', 'VIDEO', 'DESCUENTO', 'ENCUESTA', 'INVITACION', 'IMAGEN');

-- CreateTable
CREATE TABLE "ClubBloque" (
    "id" TEXT NOT NULL,
    "tipo" "ClubBloqueTipo" NOT NULL DEFAULT 'TEXTO',
    "titulo" TEXT,
    "cuerpo" TEXT,
    "ctaTexto" TEXT,
    "ctaUrl" TEXT,
    "mediaUrl" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubBloque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubHistorialItem" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "desbloqueado" BOOLEAN NOT NULL DEFAULT false,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubHistorialItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubConfig" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "heroTitulo" TEXT NOT NULL DEFAULT 'Bienvenido al Club Fundadores',
    "heroSubtitulo" TEXT,
    "heroVideoUrl" TEXT,
    "introTitulo" TEXT NOT NULL DEFAULT 'Qué es este acceso',
    "introTexto" TEXT,
    "novedadesTexto" TEXT,
    "footerTexto" TEXT NOT NULL DEFAULT 'Gracias por haber estado desde el principio. — Fran',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fundador" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "origen" TEXT NOT NULL DEFAULT 'club',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Fundador_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClubBloque_orden_idx" ON "ClubBloque"("orden");

-- CreateIndex
CREATE INDEX "ClubHistorialItem_orden_idx" ON "ClubHistorialItem"("orden");

-- CreateIndex
CREATE UNIQUE INDEX "Fundador_email_key" ON "Fundador"("email");

-- CreateIndex
CREATE INDEX "Fundador_createdAt_idx" ON "Fundador"("createdAt");
