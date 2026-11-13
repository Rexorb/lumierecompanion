-- CreateEnum
CREATE TYPE "TipoUsuario" AS ENUM ('DONO_SALAO', 'SUPER_ADMIN', 'GERENTE', 'RECEPCIONISTA');

-- CreateEnum
CREATE TYPE "StatusAgendamento" AS ENUM ('PENDENTE', 'CONFIRMADO', 'CANCELADO', 'CONCLUIDO', 'FALTOU');

-- CreateEnum
CREATE TYPE "DiaSemana" AS ENUM ('SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO', 'DOMINGO');

-- CreateEnum
CREATE TYPE "StatusInstanciaWhatsApp" AS ENUM ('DESCONECTADO', 'CONECTADO', 'QR_CODE_EXPIRADO', 'ERROR');

-- CreateEnum
CREATE TYPE "NivelLog" AS ENUM ('DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL');

-- CreateEnum
CREATE TYPE "CategoriaServico" AS ENUM ('CABELO', 'UNHA', 'ESTETICA', 'MAQUIAGEM', 'MASSAGEM', 'BARBEARIA', 'OUTRO');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "tipo" "TipoUsuario" NOT NULL DEFAULT 'DONO_SALAO',
    "verificado" BOOLEAN NOT NULL DEFAULT false,
    "ultimoLogin" TIMESTAMP(3),
    "tokenReset" TEXT,
    "tokenResetExpira" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saloes" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "cep" TEXT,
    "endereco" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "tempoTimeout" INTEGER NOT NULL DEFAULT 300,
    "lembreteAntecedencia" INTEGER NOT NULL DEFAULT 24,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saloes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios_saloes" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "salaoId" TEXT NOT NULL,
    "papel" "TipoUsuario" NOT NULL DEFAULT 'DONO_SALAO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_saloes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servicos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "duracao" INTEGER NOT NULL,
    "preco" DECIMAL(10,2) NOT NULL,
    "categoria" "CategoriaServico" NOT NULL DEFAULT 'OUTRO',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "disponivel" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "salaoId" TEXT NOT NULL,

    CONSTRAINT "servicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "email" TEXT,
    "dataNascimento" TIMESTAMP(3),
    "observacoes" TEXT,
    "totalVisitas" INTEGER NOT NULL DEFAULT 0,
    "ultimaVisita" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "salaoId" TEXT NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agendamentos" (
    "id" TEXT NOT NULL,
    "dataHora" TIMESTAMP(3) NOT NULL,
    "duracao" INTEGER NOT NULL,
    "status" "StatusAgendamento" NOT NULL DEFAULT 'PENDENTE',
    "observacoes" TEXT,
    "confirmadoEm" TIMESTAMP(3),
    "canceladoEm" TIMESTAMP(3),
    "motivoCancelamento" TEXT,
    "eventoId" TEXT,
    "conversaId" TEXT,
    "estadoChatbot" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "salaoId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "servicoId" TEXT NOT NULL,

    CONSTRAINT "agendamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "horarios_funcionamento" (
    "id" TEXT NOT NULL,
    "diaSemana" "DiaSemana" NOT NULL,
    "horarioAbertura" TEXT NOT NULL,
    "horarioFechamento" TEXT NOT NULL,
    "intervalo" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "salaoId" TEXT NOT NULL,

    CONSTRAINT "horarios_funcionamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instancias_whatsapp" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "numero" TEXT,
    "status" "StatusInstanciaWhatsApp" NOT NULL DEFAULT 'DESCONECTADO',
    "qrCode" TEXT,
    "qrCodeExpira" TIMESTAMP(3),
    "webhookUrl" TEXT,
    "webhookEvents" TEXT[],
    "instanceId" TEXT,
    "apiKey" TEXT,
    "ultimaConexao" TIMESTAMP(3),
    "totalMensagensRecebidas" INTEGER NOT NULL DEFAULT 0,
    "totalMensagensEnviadas" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "salaoId" TEXT NOT NULL,

    CONSTRAINT "instancias_whatsapp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversas_chatbot" (
    "id" TEXT NOT NULL,
    "estadoAtual" TEXT NOT NULL,
    "dadosContexto" JSONB NOT NULL,
    "ultimoEvento" TEXT,
    "ultimaMensagem" TIMESTAMP(3) NOT NULL,
    "mensagens" JSONB,
    "timeoutExpira" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clienteId" TEXT NOT NULL,
    "salaoId" TEXT NOT NULL,
    "agendamentoId" TEXT,

    CONSTRAINT "conversas_chatbot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logs" (
    "id" TEXT NOT NULL,
    "nivel" "NivelLog" NOT NULL DEFAULT 'INFO',
    "mensagem" TEXT NOT NULL,
    "contexto" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" TEXT,

    CONSTRAINT "logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_email_idx" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "saloes_cnpj_key" ON "saloes"("cnpj");

-- CreateIndex
CREATE INDEX "saloes_cnpj_idx" ON "saloes"("cnpj");

-- CreateIndex
CREATE INDEX "saloes_deletedAt_idx" ON "saloes"("deletedAt");

-- CreateIndex
CREATE INDEX "usuarios_saloes_salaoId_idx" ON "usuarios_saloes"("salaoId");

-- CreateIndex
CREATE INDEX "usuarios_saloes_usuarioId_idx" ON "usuarios_saloes"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_saloes_usuarioId_salaoId_key" ON "usuarios_saloes"("usuarioId", "salaoId");

-- CreateIndex
CREATE INDEX "servicos_salaoId_idx" ON "servicos"("salaoId");

-- CreateIndex
CREATE INDEX "servicos_categoria_idx" ON "servicos"("categoria");

-- CreateIndex
CREATE INDEX "servicos_ativo_idx" ON "servicos"("ativo");

-- CreateIndex
CREATE INDEX "clientes_salaoId_idx" ON "clientes"("salaoId");

-- CreateIndex
CREATE INDEX "clientes_telefone_idx" ON "clientes"("telefone");

-- CreateIndex
CREATE INDEX "clientes_deletedAt_idx" ON "clientes"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_salaoId_telefone_key" ON "clientes"("salaoId", "telefone");

-- CreateIndex
CREATE INDEX "agendamentos_salaoId_dataHora_idx" ON "agendamentos"("salaoId", "dataHora");

-- CreateIndex
CREATE INDEX "agendamentos_clienteId_idx" ON "agendamentos"("clienteId");

-- CreateIndex
CREATE INDEX "agendamentos_status_idx" ON "agendamentos"("status");

-- CreateIndex
CREATE INDEX "agendamentos_dataHora_idx" ON "agendamentos"("dataHora");

-- CreateIndex
CREATE UNIQUE INDEX "agendamentos_salaoId_dataHora_key" ON "agendamentos"("salaoId", "dataHora");

-- CreateIndex
CREATE INDEX "horarios_funcionamento_salaoId_idx" ON "horarios_funcionamento"("salaoId");

-- CreateIndex
CREATE UNIQUE INDEX "horarios_funcionamento_salaoId_diaSemana_key" ON "horarios_funcionamento"("salaoId", "diaSemana");

-- CreateIndex
CREATE UNIQUE INDEX "instancias_whatsapp_salaoId_key" ON "instancias_whatsapp"("salaoId");

-- CreateIndex
CREATE INDEX "instancias_whatsapp_status_idx" ON "instancias_whatsapp"("status");

-- CreateIndex
CREATE INDEX "instancias_whatsapp_numero_idx" ON "instancias_whatsapp"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "conversas_chatbot_agendamentoId_key" ON "conversas_chatbot"("agendamentoId");

-- CreateIndex
CREATE INDEX "conversas_chatbot_clienteId_idx" ON "conversas_chatbot"("clienteId");

-- CreateIndex
CREATE INDEX "conversas_chatbot_salaoId_idx" ON "conversas_chatbot"("salaoId");

-- CreateIndex
CREATE INDEX "conversas_chatbot_estadoAtual_idx" ON "conversas_chatbot"("estadoAtual");

-- CreateIndex
CREATE INDEX "conversas_chatbot_timeoutExpira_idx" ON "conversas_chatbot"("timeoutExpira");

-- CreateIndex
CREATE UNIQUE INDEX "conversas_chatbot_clienteId_salaoId_key" ON "conversas_chatbot"("clienteId", "salaoId");

-- CreateIndex
CREATE INDEX "logs_nivel_idx" ON "logs"("nivel");

-- CreateIndex
CREATE INDEX "logs_createdAt_idx" ON "logs"("createdAt");

-- CreateIndex
CREATE INDEX "logs_usuarioId_idx" ON "logs"("usuarioId");

-- AddForeignKey
ALTER TABLE "usuarios_saloes" ADD CONSTRAINT "usuarios_saloes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios_saloes" ADD CONSTRAINT "usuarios_saloes_salaoId_fkey" FOREIGN KEY ("salaoId") REFERENCES "saloes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servicos" ADD CONSTRAINT "servicos_salaoId_fkey" FOREIGN KEY ("salaoId") REFERENCES "saloes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_salaoId_fkey" FOREIGN KEY ("salaoId") REFERENCES "saloes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_salaoId_fkey" FOREIGN KEY ("salaoId") REFERENCES "saloes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "servicos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "horarios_funcionamento" ADD CONSTRAINT "horarios_funcionamento_salaoId_fkey" FOREIGN KEY ("salaoId") REFERENCES "saloes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instancias_whatsapp" ADD CONSTRAINT "instancias_whatsapp_salaoId_fkey" FOREIGN KEY ("salaoId") REFERENCES "saloes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversas_chatbot" ADD CONSTRAINT "conversas_chatbot_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversas_chatbot" ADD CONSTRAINT "conversas_chatbot_salaoId_fkey" FOREIGN KEY ("salaoId") REFERENCES "saloes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversas_chatbot" ADD CONSTRAINT "conversas_chatbot_agendamentoId_fkey" FOREIGN KEY ("agendamentoId") REFERENCES "agendamentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logs" ADD CONSTRAINT "logs_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
