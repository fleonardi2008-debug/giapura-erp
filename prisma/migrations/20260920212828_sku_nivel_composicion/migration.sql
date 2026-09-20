-- CreateEnum
CREATE TYPE "NivelSku" AS ENUM ('FRASCO', 'PACK');

-- AlterTable
ALTER TABLE "Sku" ADD COLUMN     "nivel" "NivelSku" NOT NULL DEFAULT 'FRASCO';

-- CreateTable
CREATE TABLE "SkuComposicion" (
    "id" TEXT NOT NULL,
    "packId" TEXT NOT NULL,
    "componenteId" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,

    CONSTRAINT "SkuComposicion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SkuComposicion_packId_idx" ON "SkuComposicion"("packId");

-- CreateIndex
CREATE UNIQUE INDEX "SkuComposicion_packId_componenteId_key" ON "SkuComposicion"("packId", "componenteId");

-- AddForeignKey
ALTER TABLE "SkuComposicion" ADD CONSTRAINT "SkuComposicion_packId_fkey" FOREIGN KEY ("packId") REFERENCES "Sku"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkuComposicion" ADD CONSTRAINT "SkuComposicion_componenteId_fkey" FOREIGN KEY ("componenteId") REFERENCES "Sku"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
