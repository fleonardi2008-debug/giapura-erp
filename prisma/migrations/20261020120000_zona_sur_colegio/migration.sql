-- AlterEnum
ALTER TYPE "ZonaSurMetodoEntrega" ADD VALUE 'COLEGIO';

-- AlterTable
ALTER TABLE "ZonaSurConfig" ADD COLUMN     "colegioDias" TEXT,
ADD COLUMN     "colegioNombre" TEXT;

-- AlterTable
ALTER TABLE "ZonaSurPedido" ADD COLUMN     "colegioDia" TEXT;

-- CreateIndex
CREATE INDEX "ZonaSurPedido_colegioDia_idx" ON "ZonaSurPedido"("colegioDia");
