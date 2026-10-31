-- Ruta de reparto a domicilio: ubicación de cada pedido y puntos de salida/llegada.
ALTER TABLE "ZonaSurPedido" ADD COLUMN "envioLat" DOUBLE PRECISION;
ALTER TABLE "ZonaSurPedido" ADD COLUMN "envioLng" DOUBLE PRECISION;
ALTER TABLE "ZonaSurConfig" ADD COLUMN "rutaInicio" TEXT NOT NULL DEFAULT 'Intendente Pedro Oliveri 535, Quilmes';
ALTER TABLE "ZonaSurConfig" ADD COLUMN "rutaFin" TEXT NOT NULL DEFAULT 'Zeballos 575, Bernal, Quilmes';
