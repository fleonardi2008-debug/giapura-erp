-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'OPERADOR');

-- CreateEnum
CREATE TYPE "TipoInsumo" AS ENUM ('INGREDIENTE', 'PACKAGING', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoItemStock" AS ENUM ('INSUMO', 'PRODUCTO_TERMINADO');

-- CreateEnum
CREATE TYPE "TipoMovimientoStock" AS ENUM ('COMPRA', 'PRODUCCION_INGRESO', 'PRODUCCION_CONSUMO', 'VENTA', 'AJUSTE', 'DEVOLUCION');

-- CreateEnum
CREATE TYPE "EstadoLote" AS ENUM ('PLANIFICADO', 'EN_FABRICA', 'RECIBIDO');

-- CreateEnum
CREATE TYPE "EstadoPedido" AS ENUM ('ABIERTO', 'CERRADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "EstadoPago" AS ENUM ('PENDIENTE', 'PAGADO', 'PARCIAL', 'REEMBOLSADO');

-- CreateEnum
CREATE TYPE "EstadoEnvio" AS ENUM ('PENDIENTE', 'DESPACHADO', 'EN_TRANSITO', 'ENTREGADO', 'PROBLEMA');

-- CreateEnum
CREATE TYPE "CategoriaGasto" AS ENUM ('COMISION_TIENDANUBE', 'COMISION_MERCADOPAGO', 'ENVIO', 'MARKETING', 'FIJO', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoComision" AS ENUM ('TIENDANUBE', 'MERCADOPAGO');

-- CreateEnum
CREATE TYPE "EstadoPeriodo" AS ENUM ('ABIERTO', 'CERRADO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'OPERADOR',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT NOT NULL,
    "detalle" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sku" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tiendaNubeProductId" TEXT,
    "tiendaNubeVariantId" TEXT,
    "unidadMedida" TEXT NOT NULL DEFAULT 'unidad',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sku_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Insumo" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoInsumo" NOT NULL,
    "unidadMedida" TEXT NOT NULL,
    "stockMinimo" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Insumo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsumoCosto" (
    "id" TEXT NOT NULL,
    "insumoId" TEXT NOT NULL,
    "costoUnitario" DECIMAL(14,4) NOT NULL,
    "vigenteDesde" TIMESTAMP(3) NOT NULL,
    "vigenteHasta" TIMESTAMP(3),
    "nota" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InsumoCosto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Receta" (
    "id" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "vigenteDesde" TIMESTAMP(3) NOT NULL,
    "vigenteHasta" TIMESTAMP(3),
    "nota" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Receta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecetaItem" (
    "id" TEXT NOT NULL,
    "recetaId" TEXT NOT NULL,
    "insumoId" TEXT NOT NULL,
    "cantidadPorUnidad" DECIMAL(12,4) NOT NULL,
    "unidadMedida" TEXT NOT NULL,

    CONSTRAINT "RecetaItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostoFabricaHistorico" (
    "id" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "costoPorUnidad" DECIMAL(14,4) NOT NULL,
    "vigenteDesde" TIMESTAMP(3) NOT NULL,
    "vigenteHasta" TIMESTAMP(3),
    "nota" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CostoFabricaHistorico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoteProduccion" (
    "id" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "cantidadUnidades" DECIMAL(12,3) NOT NULL,
    "numeroLote" TEXT NOT NULL,
    "costoUnitarioSnapshot" DECIMAL(14,4),
    "costoTotalSnapshot" DECIMAL(14,2),
    "estado" "EstadoLote" NOT NULL DEFAULT 'PLANIFICADO',
    "nota" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recibidoAt" TIMESTAMP(3),

    CONSTRAINT "LoteProduccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimientoStock" (
    "id" TEXT NOT NULL,
    "tipoItem" "TipoItemStock" NOT NULL,
    "insumoId" TEXT,
    "skuId" TEXT,
    "tipoMovimiento" "TipoMovimientoStock" NOT NULL,
    "cantidad" DECIMAL(12,3) NOT NULL,
    "costoUnitarioSnapshot" DECIMAL(14,4),
    "loteProduccionId" TEXT,
    "pedidoId" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nota" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimientoStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockActual" (
    "id" TEXT NOT NULL,
    "itemTipo" "TipoItemStock" NOT NULL,
    "insumoId" TEXT,
    "skuId" TEXT,
    "cantidadActual" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "costoPromedioPonderado" DECIMAL(14,4),
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockActual_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pedido" (
    "id" TEXT NOT NULL,
    "tiendaNubeOrderId" TEXT,
    "numeroPedido" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "clienteNombre" TEXT,
    "clienteEmail" TEXT,
    "estadoPedido" "EstadoPedido" NOT NULL DEFAULT 'ABIERTO',
    "estadoPago" "EstadoPago" NOT NULL DEFAULT 'PENDIENTE',
    "estadoEnvio" "EstadoEnvio" NOT NULL DEFAULT 'PENDIENTE',
    "subtotal" DECIMAL(14,2) NOT NULL,
    "costoEnvioCobradoCliente" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(14,2) NOT NULL,
    "rawPayload" JSONB,
    "sincronizadoEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PedidoItem" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "skuId" TEXT,
    "cantidad" DECIMAL(12,3) NOT NULL,
    "precioUnitario" DECIMAL(14,2) NOT NULL,
    "subtotal" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "PedidoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gasto" (
    "id" TEXT NOT NULL,
    "categoria" "CategoriaGasto" NOT NULL,
    "descripcion" TEXT NOT NULL,
    "monto" DECIMAL(14,2) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "pedidoId" TEXT,
    "periodoId" TEXT,
    "recurrente" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Gasto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComisionConfig" (
    "id" TEXT NOT NULL,
    "tipo" "TipoComision" NOT NULL,
    "porcentaje" DECIMAL(6,4),
    "montoFijo" DECIMAL(14,2),
    "vigenteDesde" TIMESTAMP(3) NOT NULL,
    "vigenteHasta" TIMESTAMP(3),

    CONSTRAINT "ComisionConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Envio" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "transportista" TEXT,
    "numeroSeguimiento" TEXT,
    "estado" "EstadoEnvio" NOT NULL DEFAULT 'PENDIENTE',
    "fechaDespacho" TIMESTAMP(3),
    "fechaEntregaEstimada" TIMESTAMP(3),
    "fechaEntregaReal" TIMESTAMP(3),
    "actualizadoPorId" TEXT,
    "nota" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Envio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeriodoContable" (
    "id" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "estado" "EstadoPeriodo" NOT NULL DEFAULT 'ABIERTO',
    "cerradoEn" TIMESTAMP(3),
    "cerradoPorId" TEXT,

    CONSTRAINT "PeriodoContable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TiendaNubeConexion" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "accessTokenEnc" TEXT NOT NULL,
    "scope" TEXT,
    "conectadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TiendaNubeConexion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "evento" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "recibidoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "procesado" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "AuditLog_entidad_entidadId_idx" ON "AuditLog"("entidad", "entidadId");

-- CreateIndex
CREATE UNIQUE INDEX "Sku_codigo_key" ON "Sku"("codigo");

-- CreateIndex
CREATE INDEX "InsumoCosto_insumoId_vigenteDesde_idx" ON "InsumoCosto"("insumoId", "vigenteDesde");

-- CreateIndex
CREATE INDEX "Receta_skuId_vigenteDesde_idx" ON "Receta"("skuId", "vigenteDesde");

-- CreateIndex
CREATE UNIQUE INDEX "Receta_skuId_version_key" ON "Receta"("skuId", "version");

-- CreateIndex
CREATE INDEX "CostoFabricaHistorico_skuId_vigenteDesde_idx" ON "CostoFabricaHistorico"("skuId", "vigenteDesde");

-- CreateIndex
CREATE UNIQUE INDEX "LoteProduccion_numeroLote_key" ON "LoteProduccion"("numeroLote");

-- CreateIndex
CREATE INDEX "MovimientoStock_insumoId_idx" ON "MovimientoStock"("insumoId");

-- CreateIndex
CREATE INDEX "MovimientoStock_skuId_idx" ON "MovimientoStock"("skuId");

-- CreateIndex
CREATE INDEX "MovimientoStock_tipoMovimiento_fecha_idx" ON "MovimientoStock"("tipoMovimiento", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "StockActual_insumoId_key" ON "StockActual"("insumoId");

-- CreateIndex
CREATE UNIQUE INDEX "StockActual_skuId_key" ON "StockActual"("skuId");

-- CreateIndex
CREATE UNIQUE INDEX "Pedido_tiendaNubeOrderId_key" ON "Pedido"("tiendaNubeOrderId");

-- CreateIndex
CREATE INDEX "Pedido_fecha_idx" ON "Pedido"("fecha");

-- CreateIndex
CREATE INDEX "Pedido_estadoPago_idx" ON "Pedido"("estadoPago");

-- CreateIndex
CREATE INDEX "Gasto_fecha_idx" ON "Gasto"("fecha");

-- CreateIndex
CREATE INDEX "Gasto_categoria_idx" ON "Gasto"("categoria");

-- CreateIndex
CREATE INDEX "ComisionConfig_tipo_vigenteDesde_idx" ON "ComisionConfig"("tipo", "vigenteDesde");

-- CreateIndex
CREATE UNIQUE INDEX "Envio_pedidoId_key" ON "Envio"("pedidoId");

-- CreateIndex
CREATE UNIQUE INDEX "PeriodoContable_anio_mes_key" ON "PeriodoContable"("anio", "mes");

-- CreateIndex
CREATE UNIQUE INDEX "TiendaNubeConexion_storeId_key" ON "TiendaNubeConexion"("storeId");

-- CreateIndex
CREATE INDEX "WebhookEvent_procesado_idx" ON "WebhookEvent"("procesado");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsumoCosto" ADD CONSTRAINT "InsumoCosto_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "Insumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receta" ADD CONSTRAINT "Receta_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecetaItem" ADD CONSTRAINT "RecetaItem_recetaId_fkey" FOREIGN KEY ("recetaId") REFERENCES "Receta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecetaItem" ADD CONSTRAINT "RecetaItem_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "Insumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostoFabricaHistorico" ADD CONSTRAINT "CostoFabricaHistorico_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoteProduccion" ADD CONSTRAINT "LoteProduccion_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoStock" ADD CONSTRAINT "MovimientoStock_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "Insumo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoStock" ADD CONSTRAINT "MovimientoStock_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoStock" ADD CONSTRAINT "MovimientoStock_loteProduccionId_fkey" FOREIGN KEY ("loteProduccionId") REFERENCES "LoteProduccion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoStock" ADD CONSTRAINT "MovimientoStock_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoStock" ADD CONSTRAINT "MovimientoStock_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockActual" ADD CONSTRAINT "StockActual_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "Insumo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockActual" ADD CONSTRAINT "StockActual_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoItem" ADD CONSTRAINT "PedidoItem_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoItem" ADD CONSTRAINT "PedidoItem_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gasto" ADD CONSTRAINT "Gasto_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gasto" ADD CONSTRAINT "Gasto_periodoId_fkey" FOREIGN KEY ("periodoId") REFERENCES "PeriodoContable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gasto" ADD CONSTRAINT "Gasto_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Envio" ADD CONSTRAINT "Envio_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Envio" ADD CONSTRAINT "Envio_actualizadoPorId_fkey" FOREIGN KEY ("actualizadoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeriodoContable" ADD CONSTRAINT "PeriodoContable_cerradoPorId_fkey" FOREIGN KEY ("cerradoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
