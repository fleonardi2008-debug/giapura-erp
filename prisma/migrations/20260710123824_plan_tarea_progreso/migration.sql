-- CreateTable
CREATE TABLE "PlanTareaProgreso" (
    "id" TEXT NOT NULL,
    "hecho" BOOLEAN NOT NULL DEFAULT false,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanTareaProgreso_pkey" PRIMARY KEY ("id")
);
