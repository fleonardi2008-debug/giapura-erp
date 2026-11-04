-- WhatsApp del dueño: el cliente le manda su pedido con un botón al terminar de pedir.
ALTER TABLE "ZonaSurConfig" ADD COLUMN "whatsappContacto" TEXT NOT NULL DEFAULT '5491168843413';
