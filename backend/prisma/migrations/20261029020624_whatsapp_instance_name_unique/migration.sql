-- PostgreSQL permite múltiplos NULL em índice UNIQUE: salões ainda sem instância continuam válidos.
-- Garante que uma mesma instância Evolution não seja atribuída a dois salões.
CREATE UNIQUE INDEX "instancias_whatsapp_instanceId_key" ON "instancias_whatsapp"("instanceId");
