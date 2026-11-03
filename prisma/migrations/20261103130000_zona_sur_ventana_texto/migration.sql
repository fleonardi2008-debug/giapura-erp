-- Texto de la casilla de confirmación del envío a domicilio, editable desde el ERP.
ALTER TABLE "ZonaSurConfig" ADD COLUMN "ventanaTexto" TEXT NOT NULL DEFAULT 'Voy a estar en mi domicilio entre las 11hs y 15hs del día de la entrega';
