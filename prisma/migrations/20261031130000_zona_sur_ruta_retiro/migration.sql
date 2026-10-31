-- Zeballos es la primera parada (retiro de cajas) y también donde termina el reparto.
ALTER TABLE "ZonaSurConfig" ADD COLUMN "rutaRetiro" TEXT NOT NULL DEFAULT 'Zeballos 575, Bernal, Quilmes';
