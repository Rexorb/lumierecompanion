-- CreateEnum
CREATE TYPE "TipoExcecaoAgenda" AS ENUM ('FECHADO', 'HORARIO_ESPECIAL', 'LIBERACAO', 'BLOQUEIO');

-- Precondição reforçada dentro da migration (além da contagem imediatamente
-- anterior): não interpretar timestamps históricos na timezone da sessão.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM "agendamentos") THEN
        RAISE EXCEPTION 'Conversão de dataHora exige agendamentos vazio';
    END IF;
END $$;

-- AlterTable: sem linhas existentes, apenas mudança estrutural de tipo.
ALTER TABLE "agendamentos" ALTER COLUMN "dataHora" SET DATA TYPE TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "configuracoes_agenda" (
    "id" TEXT NOT NULL,
    "salaoId" TEXT NOT NULL,
    "publicada" BOOLEAN NOT NULL DEFAULT false,
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "horizonteDias" INTEGER NOT NULL DEFAULT 60,
    "antecedenciaMinutos" INTEGER NOT NULL DEFAULT 60,
    "passoMinutos" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracoes_agenda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disponibilidades_semanais" (
    "id" TEXT NOT NULL,
    "salaoId" TEXT NOT NULL,
    "diaSemana" "DiaSemana" NOT NULL,
    "inicioMinuto" INTEGER NOT NULL,
    "fimMinuto" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disponibilidades_semanais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "excecoes_agenda" (
    "id" TEXT NOT NULL,
    "salaoId" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "tipo" "TipoExcecaoAgenda" NOT NULL,
    "inicioMinuto" INTEGER,
    "fimMinuto" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "excecoes_agenda_pkey" PRIMARY KEY ("id")
);

-- Invariantes de domínio protegidas pelo PostgreSQL, inclusive escritas diretas.
ALTER TABLE "configuracoes_agenda"
    ADD CONSTRAINT "configuracoes_agenda_horizonteDias_check" CHECK ("horizonteDias" > 0),
    ADD CONSTRAINT "configuracoes_agenda_antecedenciaMinutos_check" CHECK ("antecedenciaMinutos" >= 0),
    ADD CONSTRAINT "configuracoes_agenda_passoMinutos_check" CHECK ("passoMinutos" > 0);

ALTER TABLE "disponibilidades_semanais"
    ADD CONSTRAINT "disponibilidades_semanais_minutos_check" CHECK (
        "inicioMinuto" >= 0 AND "inicioMinuto" < 1440
        AND "fimMinuto" > 0 AND "fimMinuto" <= 1440
        AND "inicioMinuto" < "fimMinuto"
    );

ALTER TABLE "excecoes_agenda"
    ADD CONSTRAINT "excecoes_agenda_minutos_check" CHECK (
        ("tipo" = 'FECHADO' AND "inicioMinuto" IS NULL AND "fimMinuto" IS NULL)
        OR
        ("tipo" <> 'FECHADO' AND "inicioMinuto" IS NOT NULL AND "fimMinuto" IS NOT NULL
         AND "inicioMinuto" >= 0 AND "inicioMinuto" < 1440
         AND "fimMinuto" > 0 AND "fimMinuto" <= 1440
         AND "inicioMinuto" < "fimMinuto")
    );

-- CreateIndex
CREATE UNIQUE INDEX "configuracoes_agenda_salaoId_key" ON "configuracoes_agenda"("salaoId");

-- CreateIndex
CREATE INDEX "disponibilidades_semanais_salaoId_diaSemana_idx" ON "disponibilidades_semanais"("salaoId", "diaSemana");

-- CreateIndex
CREATE UNIQUE INDEX "disponibilidades_semanais_salaoId_diaSemana_inicioMinuto_fi_key" ON "disponibilidades_semanais"("salaoId", "diaSemana", "inicioMinuto", "fimMinuto");

-- CreateIndex
CREATE INDEX "excecoes_agenda_salaoId_data_idx" ON "excecoes_agenda"("salaoId", "data");

-- CreateIndex
CREATE UNIQUE INDEX "excecoes_agenda_salaoId_data_tipo_inicioMinuto_fimMinuto_key" ON "excecoes_agenda"("salaoId", "data", "tipo", "inicioMinuto", "fimMinuto");

-- NULL != NULL em UNIQUE convencional: FECHADO exige índice parcial.
CREATE UNIQUE INDEX "excecoes_agenda_fechado_salaoId_data_key"
    ON "excecoes_agenda"("salaoId", "data") WHERE "tipo" = 'FECHADO';

-- AddForeignKey
ALTER TABLE "configuracoes_agenda" ADD CONSTRAINT "configuracoes_agenda_salaoId_fkey" FOREIGN KEY ("salaoId") REFERENCES "saloes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disponibilidades_semanais" ADD CONSTRAINT "disponibilidades_semanais_salaoId_fkey" FOREIGN KEY ("salaoId") REFERENCES "saloes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "excecoes_agenda" ADD CONSTRAINT "excecoes_agenda_salaoId_fkey" FOREIGN KEY ("salaoId") REFERENCES "saloes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
