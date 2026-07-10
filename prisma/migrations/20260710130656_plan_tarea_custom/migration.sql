-- CreateTable
CREATE TABLE "PlanTareaCustom" (
    "id" TEXT NOT NULL,
    "faseNum" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "puntos" INTEGER NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanTareaCustom_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlanTareaCustom_faseNum_idx" ON "PlanTareaCustom"("faseNum");
