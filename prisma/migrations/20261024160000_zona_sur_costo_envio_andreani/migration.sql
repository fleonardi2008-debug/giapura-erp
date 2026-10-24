-- El envío por Andreani se cobra junto con los productos (el cliente transfiere todo).
ALTER TABLE "ZonaSurPedido" ADD COLUMN "costoEnvio" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "ZonaSurPedido" ADD COLUMN "envioAConfirmar" BOOLEAN NOT NULL DEFAULT false;
