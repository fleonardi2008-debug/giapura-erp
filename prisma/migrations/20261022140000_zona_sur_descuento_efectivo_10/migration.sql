-- El descuento por pagar en efectivo arranca en 10% (antes 0 = sin descuento).
ALTER TABLE "ZonaSurConfig" ALTER COLUMN "descuentoEfectivo" SET DEFAULT 10;
UPDATE "ZonaSurConfig" SET "descuentoEfectivo" = 10 WHERE "descuentoEfectivo" = 0;
