-- CreateTable
CREATE TABLE "mensagens_processadas" (
    "id" TEXT NOT NULL,
    "salaoId" TEXT NOT NULL,
    "instanciaWhatsAppId" TEXT NOT NULL,
    "externalMessageId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensagens_processadas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mensagens_processadas_salaoId_idx" ON "mensagens_processadas"("salaoId");

-- CreateIndex
CREATE UNIQUE INDEX "mensagens_processadas_instanciaWhatsAppId_externalMessageId_key" ON "mensagens_processadas"("instanciaWhatsAppId", "externalMessageId");

-- AddForeignKey
ALTER TABLE "mensagens_processadas" ADD CONSTRAINT "mensagens_processadas_salaoId_fkey" FOREIGN KEY ("salaoId") REFERENCES "saloes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensagens_processadas" ADD CONSTRAINT "mensagens_processadas_instanciaWhatsAppId_fkey" FOREIGN KEY ("instanciaWhatsAppId") REFERENCES "instancias_whatsapp"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
