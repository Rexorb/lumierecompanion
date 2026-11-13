# Correção de dependências do backend original — 13/11/2026

**Escopo:** o backend original do Lumière (`lumiere/lumiere-backend`, fora desta distribuição). **Fora do escopo e não alterados:** `lumiere-companion/backend` (snapshot), frontend Next.js, app React Native, schema Prisma, migrations, bancos, Docker, Git remoto.

**Resultado:** atualizações coordenadas concluídas; `npm audit --omit=dev` passou de **10 achados (1 crítica, 8 altas, 1 moderada)** para **0**. A árvore completa permanece com **19 achados apenas de desenvolvimento (17 moderados, 2 baixos)**, todos em toolchain (`@nestjs/cli`, Jest, ESLint), sem presença no runtime. Nenhuma vulnerabilidade alta ou crítica permanece na árvore de produção. **A sincronização com o snapshot e a retomada da P2 dependem de aprovação posterior.**

## 1. Backup e preservação

Criado antes de qualquer alteração, fora do controle de versão e ignorado pelo Git (`.gitignore:47`):

- `.temp/deps-prechange-20261113/package.json` — SHA-256 `47ef453e…628867`
- `.temp/deps-prechange-20261113/package-lock.json` — SHA-256 `eacd97c0…d93c4e`
- `.temp/deps-prechange-20261113/git-status-before.txt` — 22 entradas
- `.temp/deps-prechange-20261113/preexisting-code.diff` — 607 linhas
- `.temp/deps-prechange-20261113/package-sha256-before.txt`

Estado antes: HEAD `491e7cf`, branch `master`, Node `v24.21.0`, npm `11.19.0`; 11 arquivos de código modificados e 6 caminhos novos não rastreados (Auth/Consultas).

**Preservação confirmada:**

- Os **cinco diffs preexistentes** de Clientes/WhatsApp continuam **byte a byte idênticos** ao backup: SHA-256 do diff conjunto `4cfe20584685c4a053525eae4a196d684b2aa53538e5f96946179faaba474470` (357 linhas).
- As correções JWT/Resend e o módulo `src/modules/consultas/` não foram editados nesta tarefa.
- Nenhum arquivo `.env`, token ou segredo entrou em backup ou relatório.
- Nesta tarefa, apenas `package.json` e `package-lock.json` foram modificados no backend original.

## 2. Pacotes atualizados

Atualizações **diretas** (versões fixadas para impedir regressão silenciosa):

| Pacote | Antes | Depois | Motivo |
|---|---|---|---|
| `@nestjs/common` | `^11.0.1` (11.2.0) | `11.2.10` | correções do Nest 11; coordenação com platform-express |
| `@nestjs/core` | `^11.0.1` (11.2.0) | `11.2.10` | mesma linha do common/platform-express |
| `@nestjs/platform-express` | `^11.0.1` (11.2.0) | `11.2.10` | corrige `multer` 2.2.0 → 2.5.0 e o adaptador HTTP |
| `@nestjs/testing` (dev) | `^11.0.1` (11.2.0) | `11.2.10` | manter o conjunto Nest na mesma versão |
| `prisma` | `^7.9.1` (7.9.1) | `7.10.1` | mesma major 7; corrige `@prisma/config`/`deepmerge-ts`/`mysql2` |
| `@prisma/client` | `^7.9.1` (7.9.1) | `7.10.1` | alinhamento obrigatório com a CLI |
| `@prisma/adapter-pg` | `^7.9.1` (7.9.1) | `7.10.1` | alinhamento com client/CLI |

As demais dependências diretas mantiveram as especificações originais (`^`). `typescript-eslint` foi testado em 8.72.2, não eliminou o achado e foi restaurado para a resolução anterior (8.67.0), mantendo `^8.20.0` no `package.json`.

**Transitivas relevantes resolvidas** (lockfile; total de 44 entradas com versão alterada):

| Pacote | Antes | Depois | Origem |
|---|---|---|---|
| `proxy-addr` | 2.0.7 (**crítica**) | 2.0.8 | `express` do `@nestjs/platform-express` |
| `body-parser` | 2.3.0 (**alta**) | 2.4.0 | `express` |
| `multer` | 2.2.0 (**alta**) | 2.5.0 | `@nestjs/platform-express` 11.2.10 |
| `deepmerge-ts` | 7.1.5 (**alta**) | 8.0.2 | `@prisma/config` 7.10.1 |
| `mysql2` | 3.15.3 (**alta**) | 3.24.4 | CLI `prisma` 7.10.1 |
| `fast-uri` | 3.1.5 (**alta**) | 3.1.9 | `ajv`/`@prisma/dev` |
| `brace-expansion` | 1.1.18 / 2.1.4 / 5.0.9 | 1.1.22 / 2.1.8 / 5.0.13 | Jest/ESLint/glob (dev) |
| `js-yaml` | 3.15.1 / 4.3.1 | 3.15.2 / 4.3.2 | Jest/ESLint (dev) |
| `handlebars` | 4.7.9 (**crítica, dev**) | 4.7.10 | `ts-jest` (dev) |
| `qs` | 6.15.3 | 6.17.1 | `express` |

**Sem `overrides`:** todas as correções couberam nos ranges das dependências existentes. Não foi usado `npm audit fix`, `npm audit fix --force`, upgrade major automático, downgrade de Jest, nem `@nestjs/cli` 12. As transitivas foram atualizadas com `npm update proxy-addr body-parser fast-uri handlebars brace-expansion js-yaml`, que respeita os ranges declarados.

## 3. Auditoria antes/depois

| Comando | Antes | Depois |
|---|---|---|
| `npm audit` | 32 (2 low, 18 moderate, **10 high, 2 critical**) | **19 (2 low, 17 moderate, 0 high, 0 critical)** |
| `npm audit --omit=dev` | 10 (1 moderate, **8 high, 1 critical**) | **0** |

Arquivos JSON das auditorias foram mantidos fora do repositório, no computador do autor. Totais são pacotes relatados pelo npm, não CVEs únicos nem prova de exploração.

### Achados remanescentes (somente desenvolvimento)

Todos são de toolchain e **não entram na imagem de runtime** (Jest, CLI do Nest, ESLint). Nenhum tem correção sem mudança major ou downgrade:

| Pacote/raiz | Severidade | Alcance | Por que não foi corrigido agora |
|---|---|---|---|
| `glob@13.0.6` (via `@nestjs/cli@11.0.24`, `jest@30.4.2`) | moderada | dev | correção indicada exige `@nestjs/cli` 12 (major) ou downgrade do Jest para 29.7.0 (major reverso) |
| `minimatch@3.1.5/10.2.x` (via glob, `typescript-eslint@8.67.0`, `@eslint/eslintrc`) | moderada | dev | `typescript-eslint` ≤8.72.2 fixa `minimatch@^10.2.2` (faixa afetada); não há 8.x corrigido disponível |
| `deepmerge@4.3.1` (via `jest-config`, `@nestjs/cli`) | baixa | dev | protótipo; exige toolchain major |
| `fork-ts-checker-webpack-plugin@9.1.0` (via `@nestjs/cli`) | baixa | dev | idem; corrigido apenas no CLI 12 |
| Pilha `jest`/`@jest/*` (8 pacotes) | moderada | dev | consequência de `glob`/`minimatch`; correção sugerida é downgrade 30 → 29.7.0 |
| Pilha `@typescript-eslint/*` (6 pacotes) | moderada | dev | consequência de `minimatch`; `fixAvailable` do npm sugere 8.36.0, que também está na faixa vulnerável |

**Decisão:** não aplicar upgrades major (`@nestjs/cli` 12, downgrade de Jest) sem autorização específica; risco residual restrito ao ambiente de desenvolvimento e sem exposição no runtime. Nenhuma exceção de produção está sendo solicitada.

## 4. Scripts de instalação (Prisma)

`npm install-scripts ls` continua acusando três scripts não aprovados: `prisma@7.10.1` (preinstall), `@prisma/engines@7.10.1` (postinstall) e `unrs-resolver@1.12.2` (postinstall). Nenhum foi aprovado manualmente.

Ainda assim, `npx prisma generate` gerou o Client 7.10.1 com sucesso no host. Isso **não comprova** o comportamento em container Linux limpo: a P2 deve rodar `prisma generate` explicitamente, documentar os scripts necessários e não aprovar pacotes indiscriminadamente.

## 5. Validações executadas

| Verificação | Resultado |
|---|---|
| `npm ci` (após as alterações finais) | **exit 0**, 873 pacotes instalados a partir do lockfile; lock reproduzível. Avisos: 3 install scripts pendentes e `glob`/`inflight` depreciados (dev). |
| `npm audit` | exit 1 esperado; 19 achados, 0 high/critical |
| `npm audit --omit=dev` | **0 achados** |
| `npx prisma generate` | **Prisma Client 7.10.1 gerado** |
| `npx tsc --noEmit -p tsconfig.json` | **exit 0** |
| `npm run build` | **exit 0** (`nest build`) |
| Jest — 26 suítes, 345 testes (Auth/JWT/Resend, Consultas, Clientes unitário, Dashboard via integração Auth mockada, WhatsApp, chatbot, Evolution, agenda/agendamentos unitários, idempotência, webhook) | **345 passed, 345 total** |
| ESLint nos arquivos alterados e módulos afetados | **exit 0** |

**Incompatibilidades encontradas:** nenhuma no build, typecheck ou testes. O ESLint global ainda acusa 2 erros preexistentes em `src/core/auth/guards/jwt-auth.guard.ts`; o arquivo é **byte a byte idêntico ao HEAD** e não foi tocado nesta tarefa.

**Caminho real do build:** `dist/src/main.js` (o `prisma.config.ts` na raiz desloca a saída), enquanto `package.json` mantém `start:prod: node dist/main`. Essa divergência é **preexistente**, não foi introduzida aqui e deve ser considerada no `CMD` do Dockerfile da P2.

## 6. Testes não executados e justificativas

- **Especificações que abrem PostgreSQL real** (ex.: `cliente.service.integration.spec.ts`, `agenda-*.integration.spec.ts`, `agendamento.integration.spec.ts`, `chatbot-*.integration.spec.ts`, `whatsapp-ingestion*.spec.ts`, `evolution-messaging.adapter.integration.spec.ts`, `message-idempotency.concurrency.spec.ts`): não executadas porque leem `DATABASE_URL` do `.env` local e poderiam alterar banco existente — proibido nesta autorização. As versões **unitárias/mockadas** correspondentes foram executadas.
- **`npm test` completo:** deliberadamente evitado pelo mesmo motivo.
- **E2E (`test/`)** e validação com PostgreSQL 16 real: reservados para P3, com banco demo isolado.
- **Evolution/WhatsApp/rede e envio de e-mail reais:** não executados; testes usam mocks/fetch simulado.
- **Lumière Web / aparelho Android:** não executados; nenhuma alteração de contrato HTTP foi feita.

## 7. Impacto no TCC original

- Mudança restrita a `package.json`/`package-lock.json`; nenhum contrato HTTP, DTO, schema, migration ou regra de negócio foi alterado.
- Node 24 atende aos `engines` do Prisma 7.10.1 (`^20.19 || ^22.12 || >=24.0`); PostgreSQL 16 ainda **não foi testado de fato** com o adapter atualizado.
- Fixar versões diretas evita que uma reinstalação futura reintroduza versões vulneráveis; atualizações futuras exigem decisão explícita.
- As alterações permanecem **não commitadas** no backend original, conforme os limites da autorização. O usuário decide se/quando commitá-las no repositório de origem.
- Os cinco diffs de Clientes/WhatsApp, o módulo Consultas e as correções JWT/Resend permanecem intactos.

## 8. Recomendação

1. **Aprovar a sincronização** de apenas `package.json` e `package-lock.json` do backend original para `lumiere-companion/backend/`, atualizando `SNAPSHOT_MANIFEST.sha256` e `docs/BACKEND_SNAPSHOT.md` com os novos hashes e a proveniência.
2. Após sincronizar, repetir no snapshot: `npm ci`, `npm audit`, `npm audit --omit=dev`, `prisma generate`, typecheck, build e as suítes sem banco; conferir o manifesto.
3. Com a árvore de produção limpa, **retomar a P2.2–P2.5** (Dockerfile multi-stage, Compose demo, `.env.demo.example`), usando `node dist/src/main.js` e rodando `prisma generate` no build.
4. Manter as 19 ocorrências de desenvolvimento documentadas; se o TCC exigir árvore completa zerada, planejar tarefa separada de upgrade major (`@nestjs/cli` 12 e revisão do Jest/ESLint) com testes próprios.
5. Não iniciar P3 (containers/migrations/seed) sem autorização específica.

**Nenhum commit, push, remote, imagem ou container foi criado.**
