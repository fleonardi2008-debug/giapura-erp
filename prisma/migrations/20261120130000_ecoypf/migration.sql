-- Página Desafío Eco YPF (/ecoypf): canal del pedido y configuración propia (radio, precio de envío y fecha de entrega).
ALTER TABLE "ZonaSurPedido" ADD COLUMN "canal" TEXT NOT NULL DEFAULT 'ZONA_SUR';
ALTER TABLE "ZonaSurConfig" ADD COLUMN "ecoRadioKm" DOUBLE PRECISION NOT NULL DEFAULT 5.5;
ALTER TABLE "ZonaSurConfig" ADD COLUMN "ecoPrecioEnvio" DECIMAL(14,2) NOT NULL DEFAULT 5000;
ALTER TABLE "ZonaSurConfig" ADD COLUMN "ecoFechaEntrega" TEXT NOT NULL DEFAULT 'Domingo 29 de noviembre';
