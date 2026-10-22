-- AlterEnum
ALTER TYPE "ZonaSurMetodoEntrega" ADD VALUE 'ANDREANI';

-- AlterTable
ALTER TABLE "ZonaSurConfig" ADD COLUMN     "andreaniActivo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "andreaniTarifas" TEXT,
ADD COLUMN     "andreaniTexto" TEXT;

-- AlterTable
ALTER TABLE "ZonaSurPedido" ADD COLUMN     "andreaniLink" TEXT;
