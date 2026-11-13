# Backend distribuível — snapshot controlado (Fase P1)

**Data da preparação:** 13/11/2026. **Fonte de verdade:** o backend NestJS original do Lumière (`lumiere/lumiere-backend`, fora desta distribuição). **Destino de distribuição:** `backend/` neste projeto. O backend original **não foi modificado nesta fase**. O snapshot é uma seleção de arquivos do commit local `491e7cf` (branch `master` do backend) com exceções expressamente autorizadas; não corresponde a um commit único do Git do backend, e o Companion ainda não tinha commit quando a P1 começou. O snapshot não pode virar uma segunda fonte de manutenção.

## Proveniência e manifesto

- **Base:** 69 arquivos binários/texto copiados byte a byte de `git show 491e7cf:<caminho>`, distribuídos pelos grupos abaixo; arquivos `*.spec.ts` da base foram excluídos por não serem necessários ao build, com exceção dos testes relevantes sobrepostos explicitamente.
- **Overlays aprovados:** 17 arquivos da árvore de trabalho do backend original. Cinco substituem arquivos de base; doze são arquivos extras de consultas/testes/configuração autorizados. Nenhum diff adicional de Clientes/WhatsApp foi aplicado.
- **Extra do snapshot:** `backend/.dockerignore` (revisado na P2) e `backend/Dockerfile` (multi-stage, adicionado na P2). Não há Compose dentro de `backend/`.
- **Total distribuível:** 83 arquivos anteriores ao manifesto (82 da P1 + `backend/Dockerfile`), mais [`backend/SNAPSHOT_MANIFEST.sha256`](../backend/SNAPSHOT_MANIFEST.sha256). O hash-raiz atual do manifesto é `4fd1d1b00668f537a157a215d68b787ba379ae393b86b0c62ed90a13f5e8f379`; a versão da P1 tinha 82 entradas e hash-raiz `c4a2f2f93c7e4031874c38a7c8e33c7a9bbfb26651dabb7c3bd32ac799f3fa8a`. O manifesto usa caminhos relativos a `backend/`, excluindo dependências instaladas e artefatos gerados. Para conferir futuramente: dentro de `backend/`, executar `sha256sum -c SNAPSHOT_MANIFEST.sha256`.

### Arquivos selecionados da base `491e7cf`

| Grupo | Conteúdo incluído |
|---|---|
| Raiz de backend | `package.json`, `package-lock.json`, `prisma.config.ts`, `nest-cli.json`, `tsconfig.json`, `tsconfig.build.json`. |
| Bootstrap | `src/main.ts`, `src/app.controller.ts`, `src/app.module.ts`, `src/app.service.ts`. |
| Autenticação/dados | Código de produção sob `src/core/auth/`, `src/core/users/`, `src/core/prisma/`. |
| Módulos efetivamente importados | Código de produção sob `src/modules/dashboard/`, `src/modules/whatsapp/`, `src/modules/webhooks/`, `src/modules/messaging/`, `src/modules/chatbot/` e `src/integrations/evolution/` (imports transitivos do `AppModule`, mesmo sem Evolution na demo). |
| Prisma | `prisma/schema.prisma`, todos os arquivos de `prisma/migrations/`, incluindo `migration_lock.toml`. Nenhuma migration foi alterada/executada nesta fase. |

### Overlays da árvore original autorizados

1. `src/app.module.ts`: registro de `ConsultasModule` **e** validação antecipada de `JWT_SECRET`; não inclui os cinco diffs excluídos.
2. `src/core/auth/auth.module.ts`, `src/core/auth/auth.service.ts`, `src/core/auth/strategies/jwt.strategy.ts`, `src/core/auth/services/mail.service.ts`: correções JWT/Resend aprovadas, sem outros patches.
3. `src/core/auth/jwt-config.ts` e testes `src/core/auth/{jwt-config.spec.ts,auth-config.integration.spec.ts,auth.service.mail.spec.ts}`, `src/core/auth/services/mail.service.spec.ts`, `src/core/auth/strategies/jwt.strategy.spec.ts`.
4. `src/modules/consultas/{consultas.controller.ts,consultas.dto.ts,consultas.module.ts,consultas.service.ts,consultas.controller.spec.ts,consultas.service.spec.ts}`: rotas de leitura e testes autorizados.

**Excluídos expressamente:** os três diffs locais de `src/modules/clientes/` e os dois de `src/modules/whatsapp/`. O snapshot **não contém** `src/modules/clientes/` de forma alguma (módulo não importado pelo `AppModule`); para `WhatsappModule`, contém a versão **commitada** dos arquivos de produção de `491e7cf`. A comparação automatizada da cópia com origem/commit não encontrou divergências inesperadas. O código original mantém as cinco alterações locais, sem alteração ou descarte.

## Exclusões e controles de segurança

Não há `.git` aninhado, `.env` real, configuração Evolution privada, `node_modules`, `dist`, `.temp`, volumes, logs, dumps, frontend Web, script administrativo `scripts/limpar-usuarios.ts`, IDE/agent configs nem banco de dados no snapshot distribuível. `node_modules/` e `dist/` **foram gerados apenas localmente durante a verificação e estão ignorados** pelo `.gitignore` do Companion; não fazem parte do manifesto. `.gitignore` e `backend/.dockerignore` bloqueiam esses artefatos e arquivos `.env`/chaves. Uma busca heurística por segredo não identificou fallback JWT, chaves privadas ou imports do Next.js; apontou apenas atribuições de chaves **fictícias dentro de testes isolados**. Essa verificação não substitui revisão humana de segredos no futuro staged diff e histórico antes de publicar.

O código de recuperação exige Resend somente se o serviço for usado: `MailService` não impede boot sem chave e não gera token quando ausente; com chave configurada mantém envio. O JWT é exigido e validado antecipadamente pelo `AppModule`, sem fallback hardcoded. Em P2/P3, gerar segredos locais no ambiente demo; nunca usar os testes como fonte de credenciais reais.

## Validações efetuadas **na cópia**

| Verificação | Resultado observado |
|---|---|
| `npm ci` | Passou, instalou 875 pacotes; npm reportou **32 avisos de vulnerabilidade (2 low, 18 moderate, 10 high, 2 critical)** e avisou sobre install scripts não aprovados; **não** foi aplicado `npm audit fix`. Revisão das dependências é risco antes da publicação. |
| `npx prisma generate` | Passou: cliente Prisma 7.9.1 gerado localmente, sem banco nem migration. |
| `npx tsc --noEmit -p tsconfig.json` | Passou. |
| `npm run build` | Passou (`nest build`, `dist/` ignorado). |
| `npx jest src/core/auth src/modules/consultas --runInBand` | Passou: **7 suítes, 27 testes**, com Prisma simulado. JWT válido/inválido/expirado, login, resposta de recuperação sem Resend e contratos das consultas entre os cenários cobertos. Não houve envio real de e-mail. |
| `npm run typecheck`, `npm run lint`, `npx expo install --check` na raiz Companion | Passaram após limitar a abrangência do TypeScript/ESLint mobile a seus próprios arquivos. |

**Não executado:** inicialização da API completa com Postgres real, teste de clone limpo, HTTP/JWT com duas contas reais, migrations, seed, containers, build Android instalável ou publicação. `GET /health` já existe na cópia mas não comprova disponibilidade do banco. As verificações existentes usam mocks e não substituem o gate da P2/P3. A próxima fase precisa decidir a estratégia de credenciais locais da demo, imagem Node/Prisma, healthcheck e revisão da árvore e do `npm audit` antes de distribuição.

## Sincronização de dependências corrigidas (P2 — 13/11/2026)

A correção foi feita primeiro no backend original e aprovada em [`DEPENDENCIAS_BACKEND_CORRECAO_2026-11-13.md`](DEPENDENCIAS_BACKEND_CORRECAO_2026-11-13.md). Para o snapshot foram copiados **exclusivamente** `package.json` e `package-lock.json`, conferidos byte a byte com a origem:

| Arquivo | SHA-256 sincronizado |
|---|---|
| `package.json` | `73f27d74560acdfbe3dad2b7186a4c81d11b3567fda3fd747a780eeb46d0307a` |
| `package-lock.json` | `2ad8901506d5038a354df281cb4371e46858167a30ee4437fb81af7914ae87f2` |

Backup local dos arquivos anteriores (não distribuído) (`package.json` `47ef453e…628867`, `package-lock.json` `eacd97c0…d93c4e`, iguais aos hashes da P1). Nenhum outro arquivo do backend original foi copiado; JWT/Resend, `ConsultasModule` e o restante do snapshot permaneceram inalterados.

**Versões efetivas:** NestJS `common`/`core`/`platform-express`/`testing` 11.2.10; Prisma CLI/client/adapter-pg 7.10.1; `proxy-addr` 2.0.8; `body-parser` 2.4.0; `multer` 2.5.0; `fast-uri` 3.1.9; `deepmerge-ts` 8.0.2; `mysql2` 3.24.4.

**Validações na cópia:**

| Verificação | Resultado |
|---|---|
| `npm ci` | exit 0; lock reproduzível; 19 avisos de vulnerabilidade (todos de desenvolvimento). |
| `npm audit` | 19: 2 low, 17 moderate, **0 high, 0 critical**. |
| `npm audit --omit=dev` | **0**. |
| `npx prisma generate` | Client 7.10.1 gerado. |
| `npx tsc --noEmit -p tsconfig.json` | exit 0. |
| `npm run build` | exit 0; saída real em `dist/src/main.js`. |
| `npx jest src/core/auth src/modules/consultas --runInBand` | **7 suítes, 27 testes aprovados**. |
| Manifesto | **83/83 arquivos OK**, hash-raiz `4fd1d1b0…8f379`. |

`backend/Dockerfile` e `backend/.dockerignore` passaram a fazer parte do manifesto. `compose.demo.yaml` e `.env.demo.example` ficam na raiz do Companion e **não** integram o snapshot do backend. `node_modules/` e `dist/` continuam fora do manifesto e ignorados.

## Sincronização futura

> A etapa 1 abaixo foi concluída em 13/11/2026 para as dependências (ver seção anterior). As demais regras continuam válidas para qualquer nova sincronização.

1. **Corrigir primeiro o backend original**, com autorização, backup e testes. Nunca fazer correção funcional diretamente em `backend/` como fonte principal.
2. Registrar novo commit de origem ou diffs aprovados; comparar cada arquivo de `backend/SNAPSHOT_MANIFEST.sha256` com a versão anterior e revisar mudanças externas ao escopo. Não sobrescrever automaticamente arquivos locais do Companion.
3. Copiar somente o conjunto autorizado, preservar schema/migrations conforme revisão, executar novamente `npm ci`, `prisma generate`, typecheck, build e testes isolados; regenerar o manifesto apenas após conferir os resultados.
4. Reavaliar possíveis mudanças na cópia de WhatsApp com base na versão commitada usada aqui. A saída de `git diff` do backend original contém trabalho alheio que não foi sincronizado. Anotar todas as diferenças aprovadas em nova versão deste documento.

**Gate P1:** snapshot criado/validado e pronto para revisão. Não autoriza P2, execução Docker, banco ou push.

## Atualização P3/P4 — ambiente demonstrativo validado

A P3 aplicou as seis migrations em um PostgreSQL demo vazio, executou o seed fictício idempotente e validou 60 verificações HTTP com JWTs reais. A P4 repetiu a instalação a partir de uma cópia limpa, sem `node_modules`, `dist`, `.env` ou banco prévio, usando um projeto Compose exclusivo e outra porta; o resultado foi equivalente. O snapshot de `backend/` **não foi alterado** nessas fases, e o manifesto continua com 83 arquivos. Relatórios: [`ENTREGA_GITHUB_DOCKER_P3.md`](ENTREGA_GITHUB_DOCKER_P3.md) e [`ENTREGA_GITHUB_DOCKER_P4.md`](ENTREGA_GITHUB_DOCKER_P4.md).
