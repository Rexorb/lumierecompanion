# Arquivos destinados à publicação — P4

**Data:** 13/11/2026. **Total previsto:** 139 arquivos.

Esta relação foi gerada a partir dos arquivos não ignorados pelo Git, com exclusão explícita dos relatórios internos de planejamento/auditoria e de `backups/`. A validação Docker usou a mesma árvore de código/infraestrutura; os dois relatórios da P4 foram acrescentados depois da execução.

## Incluídos

```text
.env.demo.example
.env.example
.gitignore
LUMIERE_COMPANION_PLANO_TECNICO.md
README.md
TUTORIAL.md
app.json
backend/.dockerignore
backend/Dockerfile
backend/SNAPSHOT_MANIFEST.sha256
backend/nest-cli.json
backend/package-lock.json
backend/package.json
backend/prisma.config.ts
backend/prisma/migrations/20260813191221_init/migration.sql
backend/prisma/migrations/20261029020624_whatsapp_instance_name_unique/migration.sql
backend/prisma/migrations/20261030135912_add_mensagem_processada_idempotency/migration.sql
backend/prisma/migrations/20261030205457_add_chatbot_configuration/migration.sql
backend/prisma/migrations/20261030231921_add_salon_schedule_domain/migration.sql
backend/prisma/migrations/20261031000813_remove_appointment_start_unique/migration.sql
backend/prisma/migrations/migration_lock.toml
backend/prisma/schema.prisma
backend/src/app.controller.ts
backend/src/app.module.ts
backend/src/app.service.ts
backend/src/core/auth/auth-config.integration.spec.ts
backend/src/core/auth/auth.controller.ts
backend/src/core/auth/auth.module.ts
backend/src/core/auth/auth.service.mail.spec.ts
backend/src/core/auth/auth.service.ts
backend/src/core/auth/dto/forgot-password.dto.ts
backend/src/core/auth/dto/login.dto.ts
backend/src/core/auth/dto/register.dto.ts
backend/src/core/auth/dto/reset-password.dto.ts
backend/src/core/auth/guards/jwt-auth.guard.ts
backend/src/core/auth/interfaces/jwt-payload.interface.ts
backend/src/core/auth/jwt-config.spec.ts
backend/src/core/auth/jwt-config.ts
backend/src/core/auth/services/mail.service.spec.ts
backend/src/core/auth/services/mail.service.ts
backend/src/core/auth/strategies/jwt.strategy.spec.ts
backend/src/core/auth/strategies/jwt.strategy.ts
backend/src/core/prisma/prisma.module.ts
backend/src/core/prisma/prisma.service.ts
backend/src/core/users/dto/create-user.dto.ts
backend/src/core/users/dto/update-user.dto.ts
backend/src/core/users/dto/user-response.dto.ts
backend/src/core/users/entities/user.entity.ts
backend/src/core/users/user-deletion.ts
backend/src/core/users/users.controller.ts
backend/src/core/users/users.module.ts
backend/src/core/users/users.service.ts
backend/src/integrations/evolution/evolution-client.error.ts
backend/src/integrations/evolution/evolution-client.ts
backend/src/integrations/evolution/evolution.module.ts
backend/src/main.ts
backend/src/modules/chatbot/chatbot-states.ts
backend/src/modules/chatbot/chatbot.module.ts
backend/src/modules/chatbot/fsm/chatbot-state-machine.ts
backend/src/modules/chatbot/fsm/chatbot-types.ts
backend/src/modules/chatbot/identity/sender-identity.ts
backend/src/modules/chatbot/identity/whatsapp-sender-identity.resolver.ts
backend/src/modules/chatbot/services/chatbot-config.service.ts
backend/src/modules/chatbot/services/chatbot-conversation.service.ts
backend/src/modules/consultas/consultas.controller.spec.ts
backend/src/modules/consultas/consultas.controller.ts
backend/src/modules/consultas/consultas.dto.ts
backend/src/modules/consultas/consultas.module.ts
backend/src/modules/consultas/consultas.service.spec.ts
backend/src/modules/consultas/consultas.service.ts
backend/src/modules/dashboard/dashboard.controller.ts
backend/src/modules/dashboard/dashboard.module.ts
backend/src/modules/dashboard/dashboard.service.ts
backend/src/modules/messaging/adapters/evolution-messaging.adapter.ts
backend/src/modules/messaging/contracts/incoming-message.contract.ts
backend/src/modules/messaging/contracts/messaging-channel.contract.ts
backend/src/modules/messaging/log-sanitization.ts
backend/src/modules/messaging/messaging.module.ts
backend/src/modules/messaging/services/evolution-message-normalizer.service.ts
backend/src/modules/messaging/services/message-idempotency.service.ts
backend/src/modules/messaging/services/whatsapp-ingestion.service.ts
backend/src/modules/webhooks/evolution-webhook.controller.ts
backend/src/modules/webhooks/evolution-webhook.guard.ts
backend/src/modules/webhooks/evolution-webhook.module.ts
backend/src/modules/whatsapp/dto/whatsapp-status.dto.ts
backend/src/modules/whatsapp/whatsapp-profile-photo.service.ts
backend/src/modules/whatsapp/whatsapp.controller.ts
backend/src/modules/whatsapp/whatsapp.module.ts
backend/src/modules/whatsapp/whatsapp.service.ts
backend/tsconfig.build.json
backend/tsconfig.json
compose.demo.yaml
docs/04_CONTRATOS_CONSULTA.md
docs/ARQUIVOS_PUBLICACAO_P4.md
docs/BACKEND_SNAPSHOT.md
docs/DEPENDENCIAS_BACKEND_CORRECAO_2026-11-13.md
docs/ENTREGA_GITHUB_DOCKER_P3.md
docs/ENTREGA_GITHUB_DOCKER_P4.md
eslint.config.mjs
package-lock.json
package.json
scripts/seed-demo.js
scripts/setup-demo.sh
scripts/verify-demo.sh
src/app/(auth)/_layout.tsx
src/app/(auth)/login.tsx
src/app/(tabs)/_layout.tsx
src/app/(tabs)/agendamentos.tsx
src/app/(tabs)/clientes.tsx
src/app/(tabs)/overview.tsx
src/app/_layout.tsx
src/app/index.tsx
src/components/dashboard/StatCard.tsx
src/components/ui/Button.tsx
src/components/ui/DataList.tsx
src/components/ui/EditorialHeading.tsx
src/components/ui/EmptyState.tsx
src/components/ui/ErrorState.tsx
src/components/ui/Input.tsx
src/components/ui/Loading.tsx
src/components/ui/Screen.tsx
src/contexts/AuthContext.tsx
src/hooks/useAgendamentos.ts
src/hooks/useClientes.ts
src/hooks/useOverview.ts
src/services/agendamentos.service.ts
src/services/api.ts
src/services/auth.service.ts
src/services/clientes.service.ts
src/services/overview.service.ts
src/storage/session.storage.ts
src/storage/session.storage.web.ts
src/theme/index.ts
src/types/auth.ts
src/types/consultas.ts
src/types/dashboard.ts
src/utils/dates.ts
src/utils/errors.ts
tsconfig.json
```

## Excluídos da distribuição

**Documentos internos preservados localmente e ignorados pelo Git (não distribuídos):**

- `docs/00_AUDITORIA_BACKEND_E_UI.md`
- `docs/DELEGACAO_PUBLICACAO_DOCKER_LUMIERE_COMPANION.md`
- `docs/ENTREGA_GITHUB_DOCKER_AUDITORIA.md`
- `docs/ENTREGA_GITHUB_DOCKER_P05_REVISAO.md`
- `docs/ENTREGA_GITHUB_DOCKER_P2.md`
- `docs/ESTADO_ATUAL_E_PROXIMOS_PASSOS.md`

**Arquivos e diretórios locais/gerados (não distribuídos):**

- `.env (URL local do app)`
- `.env.demo (segredos gerados localmente; modo 600)`
- `.env.local, .env.*.local`
- `backups/ (backups locais; preservados no computador do autor)`
- `.temp/, .tmp/`
- `node_modules/, backend/node_modules/`
- `dist/, backend/dist/, backend/build/, backend/coverage/`
- `.expo/, expo-env.d.ts, web-build/`
- *.log, *.tsbuildinfo
- `.git/ e qualquer .git aninhado (verificado: nenhum em backend/)`
- `bancos, dumps, volumes Docker, chaves/pem/p12 e arquivos de IDE/agentes`

## Como reproduzir a conferência

```bash
# 1. Conferir o que o Git incluiria (não executa git add):
git ls-files --others --exclude-standard

# 2. Conferir que .env.demo e backups estão ignorados:
git check-ignore -v .env.demo backups/ || true

# 3. Conferir o snapshot do backend:
cd backend && sha256sum -c SNAPSHOT_MANIFEST.sha256
```

> Não use `git add .` na P5. Adicione explicitamente os caminhos aprovados e revise `git diff --cached --stat` antes do commit.
