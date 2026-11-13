-- CreateTable
CREATE TABLE "configuracoes_chatbot" (
    "id" TEXT NOT NULL,
    "salaoId" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT false,
    "nomeAssistente" TEXT NOT NULL DEFAULT 'Assistente',
    "mensagemBoasVindas" TEXT,
    "mensagemFinalizacao" TEXT,
    "timeoutMinutos" INTEGER NOT NULL DEFAULT 15,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracoes_chatbot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "configuracoes_chatbot_salaoId_key" ON "configuracoes_chatbot"("salaoId");

-- AddForeignKey
ALTER TABLE "configuracoes_chatbot" ADD CONSTRAINT "configuracoes_chatbot_salaoId_fkey" FOREIGN KEY ("salaoId") REFERENCES "saloes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
