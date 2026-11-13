# Fase P4 — documentação, instalação limpa e auditoria pré-publicação

**Data:** 13/11/2026. **Status:** P4.1, P4.2, P4.4 e P4.5 concluídas; **P4.3 (Android) não executada** por ausência de aparelho/emulador. **P5 não iniciada.** Nenhum commit, remote ou publicação foi criado.

**Escopo:** projeto `lumiere-companion`. O backend original (`lumiere/lumiere-backend`), o frontend Next.js, o schema Prisma, as migrations e os dados/volumes do TCC **não foram alterados**.

## 1. Arquivos criados e modificados

**Criados:**

- `docs/ENTREGA_GITHUB_DOCKER_P4.md` (este relatório).
- `docs/ARQUIVOS_PUBLICACAO_P4.md` — relação exata dos arquivos destinados à publicação e dos excluídos.

**Reescritos/atualizados:**

- `README.md` — guia completo de instalação, demo, Expo/Android, operação e limitações.
- `TUTORIAL.md` — tutorial curto de Android, sem caminho absoluto, alinhado ao README.
- `.env.example` — URL da API demo (`3101`) e orientação para emulador/USB.
- `.gitignore` — proteção explícita para `backups/`, `.temp/`, IDE/agentes e temporários.
- `docs/04_CONTRATOS_CONSULTA.md` — seção de validação atualizada com P3/P4.
- `docs/BACKEND_SNAPSHOT.md` — caminho local removido, backup interno identificado e atualização P3/P4.
- `docs/DEPENDENCIAS_BACKEND_CORRECAO_2026-11-13.md` — caminhos absolutos locais removidos.
- `docs/ENTREGA_GITHUB_DOCKER_P3.md` — caminho absoluto/IP local removidos e status histórico ajustado.

**Não alterados nesta fase:** código do app em `src/`, código do backend em `backend/`, `compose.demo.yaml`, `Dockerfile`, schema, migrations, manifesto do snapshot e dependências instaladas. Nenhuma correção funcional foi feita.

## 2. Estrutura definitiva proposta

```text
lumiere-companion/
├── README.md
├── TUTORIAL.md
├── LUMIERE_COMPANION_PLANO_TECNICO.md
├── app.json
├── package.json / package-lock.json
├── tsconfig.json / eslint.config.mjs
├── .gitignore / .env.example / .env.demo.example
├── compose.demo.yaml
├── scripts/
│   ├── setup-demo.sh
│   ├── seed-demo.js
│   └── verify-demo.sh
├── src/                         # Expo/React Native
├── backend/                     # snapshot distribuível da API (83 arquivos manifestados)
│   ├── Dockerfile / .dockerignore
│   ├── package.json / package-lock.json
│   ├── prisma/schema.prisma + 6 migrations
│   ├── src/
│   └── SNAPSHOT_MANIFEST.sha256
└── docs/
    ├── 04_CONTRATOS_CONSULTA.md
    ├── BACKEND_SNAPSHOT.md
    ├── DEPENDENCIAS_BACKEND_CORRECAO_2026-11-13.md
    ├── ENTREGA_GITHUB_DOCKER_P3.md
    ├── ENTREGA_GITHUB_DOCKER_P4.md
    └── ARQUIVOS_PUBLICACAO_P4.md
```

Ficam fora da distribuição: `.env`, `.env.demo`, `backups/`, `node_modules/`, `dist/`, `.expo/`, `expo-env.d.ts`, arquivos temporários/IDE, bancos/dumps e relatórios internos de planejamento/auditoria listados em `docs/ARQUIVOS_PUBLICACAO_P4.md`.

## 3. Simulação de instalação limpa

Não foi possível fazer um clone real porque o repositório local ainda **não possui commits**. Foi criada uma cópia temporária isolada com somente os arquivos previstos para distribuição, excluindo todo o conteúdo ignorado pelo Git, `backups/` e documentos internos.

Verificações da cópia:

| Item | Resultado |
|---|---|
| `.env` / `.env.demo` | ausentes |
| `node_modules/`, `dist/`, `.expo/`, `expo-env.d.ts` | ausentes |
| `backups/`, dumps, volumes, bancos | ausentes |
| `.git` aninhado em `backend/` | ausente |
| Caminhos absolutos do autor na cópia | nenhum encontrado |
| Segredos/tokens/chaves privadas na cópia | nenhum padrão encontrado |
| Manifesto do backend | 83/83 arquivos OK |

A instalação foi executada **sem reutilizar** o projeto, containers ou volume da P3:

| Item | P3 | Instância P4 |
|---|---|---|
| Projeto Compose | `lumiere-companion-demo` | `lumiere-companion-p4check` |
| Volume | `lumiere-companion-demo_pgdata` | `lumiere-companion-p4check_pgdata` |
| Porta da API | `127.0.0.1:3101` | `127.0.0.1:3102` |
| PostgreSQL no host | não publicado | não publicado |
| Containers P3 | mantidos e saudáveis | não reutilizados |

O build foi executado com `--no-cache` na cópia limpa. A ausência de `node_modules`/`dist` locais não impediu a construção da imagem, as migrations, o seed ou a API.

### O que funcionou sem ajustes

1. Criação do `.env.demo` pelo script, com permissão `600` e sem sobrescrita.
2. Configuração Compose com nome/volume/porta exclusivos via `COMPOSE_PROJECT_NAME` e `DEMO_API_PORT`.
3. Build Docker do zero a partir de `backend/`.
4. Subida apenas do PostgreSQL, com volume novo e nenhuma porta no host.
5. Banco vazio antes das migrations.
6. `prisma migrate deploy` explícito: **6 migrations**, **16 tabelas**.
7. Seed idempotente: **2 usuários, 3 salões, 3 vínculos, 4 serviços, 50 clientes, 26 agendamentos**.
8. API em `127.0.0.1:3102`, saudável.
9. **60/60 verificações HTTP** passaram.
10. Reinício normal de `db` e `api`: containers saudáveis e 60/60 novamente.
11. Instalação do app na cópia limpa: `npm ci` concluiu; `npm run typecheck`, `npm run lint` e `npx expo install --check` passaram.

### Ajustes necessários no roteiro

Nenhum ajuste de código foi necessário. A única adaptação operacional foi definir um **nome de projeto Compose, volume e porta diferentes** para a segunda instância, como previsto na autorização. Ao final, os containers da instância P4 foram **parados** com `docker compose stop`; o volume `lumiere-companion-p4check_pgdata` foi preservado. A P3 permaneceu em execução.

## 4. Testes Docker e HTTP

Comandos efetivamente usados na cópia limpa (com `COMPOSE_PROJECT_NAME=lumiere-companion-p4check` e `DEMO_API_PORT=3102`):

```bash
./scripts/setup-demo.sh
docker compose --env-file .env.demo -f compose.demo.yaml build --no-cache
docker compose --env-file .env.demo -f compose.demo.yaml up -d db
docker compose --env-file .env.demo -f compose.demo.yaml run --rm migrate
docker compose --env-file .env.demo -f compose.demo.yaml run --rm seed
docker compose --env-file .env.demo -f compose.demo.yaml up -d api
./scripts/verify-demo.sh
```

Resultados:

- `/health` → **200**;
- login A/B → **201** com JWT real;
- `/auth/me`, overview, clientes e agendamentos → contratos esperados;
- sem token, token inválido e token expirado → **401**;
- acesso cruzado e salão inativo → **403**;
- busca, paginação, estados vazios, filtros e datas inválidas → conforme P3;
- horário `09:00 America/Sao_Paulo` → `12:00Z` e apresentação `09:00` no fuso;
- seed reexecutado sem duplicação;
- nenhum token ou senha foi impresso no relatório.

## 5. Testes do React Native

### Disponibilidade do ambiente

| Item | Resultado |
|---|---|
| Aparelho Android via ADB | nenhum dispositivo listado |
| Emulador Android instalado | ausente |
| Expo CLI | disponível (`58.1.20`) |
| Metro/Expo em execução | não estava rodando |
| Expo Go/development build | não verificável sem dispositivo |

Portanto, **nenhum teste funcional Android foi executado**. Os itens 1–12 da autorização (login, sessão, abas, Overview, isolamento visual, Agenda, Clientes, estados, perda de conexão, logout, fuso no aparelho e tamanhos de tela) permanecem **não validados**.

O que foi validado estaticamente na cópia limpa:

- `npm ci` concluiu;
- `npm run typecheck` passou;
- `npm run lint` passou;
- `npx expo install --check` respondeu “Dependencies are up to date”;
- `npm audit` reportou **8 avisos moderados**, sendo **3 na árvore de produção** (cadeia Expo/`@expo/fingerprint`/`minimatch`); nenhuma correção automática foi aplicada.

O roteiro manual para emulador e aparelho USB está no `README.md` e em `TUTORIAL.md`. O fluxo USB com `adb reverse` **não foi executado** e não deve ser declarado aprovado.

## 6. Auditoria pré-publicação

- `.gitignore` cobre `.env`, `.env.demo`, `node_modules`, `dist`, `.expo`, logs, temporários e, agora, `backups/`, `.temp/`, `.tmp/`, IDE/agentes e os seis relatórios internos de planejamento/auditoria.
- `.dockerignore` do backend exclui `.env*`, `node_modules`, `dist`, backups, testes e chaves.
- O `.env.demo` real foi mantido apenas localmente, modo `600`, e não entrou na cópia.
- `backups/` foi preservado no computador do autor e excluído da distribuição.
- Não há `.git` aninhado em `backend/`, banco, dump, volume, PEM/key ou arquivo de IDE na cópia.
- Caminhos absolutos do autor foram removidos dos documentos públicos.
- Nenhum token, senha, JWT real ou chave de API foi encontrado na varredura da cópia.
- A relação completa de incluídos/excluídos está em [`ARQUIVOS_PUBLICACAO_P4.md`](ARQUIVOS_PUBLICACAO_P4.md).
- A cópia final de distribuição contém **139 arquivos**, sem artefatos locais; o manifesto do backend continua **83/83 OK**.
- **Não foi executado `git add .`**.

## 7. Estado do Git local e do repositório remoto

**Local:**

- branch `master`;
- **zero commits**;
- **nenhum remote configurado**;
- todos os arquivos da entrega ainda não rastreados;
- os cinco diffs preexistentes do backend original e o backend original permanecem intactos fora deste repositório.

**Remoto:**

- `https://github.com/Rexorb/lumierecompanion` respondeu **HTTP 404** sem autenticação;
- a API do GitHub respondeu `Not Found`;
- `git ls-remote` solicitou credenciais e não pôde ser concluído com prompt desativado.

Conclusão: **não foi possível verificar** se o repositório é privado, inexistente ou inacessível para esta sessão. Não se assume que esteja vazio. Permissões e conteúdo só poderão ser confirmados com autenticação/autorização do proprietário.

## 8. Passos recomendados para a P5 (não executados)

1. Revisar `docs/ARQUIVOS_PUBLICACAO_P4.md` e confirmar que nenhum arquivo interno/backup será incluído.
2. Conferir o estado: `git status --short` e `git diff --stat`.
3. Adicionar **explicitamente** os grupos aprovados (os arquivos ignorados ficam de fora):

   ```bash
   git add .gitignore .env.example .env.demo.example README.md TUTORIAL.md \
     LUMIERE_COMPANION_PLANO_TECNICO.md app.json package.json package-lock.json \
     tsconfig.json eslint.config.mjs compose.demo.yaml scripts src backend docs
   ```

4. Conferir o staging e a lista:

   ```bash
   git status --short
   git diff --cached --stat
   # o conjunto deve coincidir com docs/ARQUIVOS_PUBLICACAO_P4.md
   git diff --cached --name-only
   ```

5. Criar o primeiro commit com mensagem descritiva:

   ```bash
   git commit -m "Entrega Lumière Companion: app Expo, backend demo e Docker"
   ```

6. Configurar `origin` somente após confirmar acesso/permissão e conferir que o remoto não tem conteúdo conflitante:

   ```bash
   git remote add origin https://github.com/Rexorb/lumierecompanion.git
   git remote -v
   GIT_TERMINAL_PROMPT=0 git ls-remote origin
   git push -u origin master
   ```

7. Se o remoto já tiver conteúdo, **não** use `--force`; interromper e revisar a divergência.
8. Publicar o repositório com a ressalva explícita de que a validação Android ainda está pendente.

Nenhum desses passos foi executado.

## 9. Limitações e pendências

- **Android não validado**: sem aparelho, emulador ou build; o app não deve ser declarado aprovado.
- **Sem APK/App Bundle**: execução prevista via Expo Go/development build.
- **API em loopback**: emulador usa `10.0.2.2`; USB pode usar `adb reverse`; celular na Wi-Fi não alcança a API no binding padrão.
- **Auditoria do app**: 8 avisos moderados no total, 3 na árvore de produção; não corrigidos para não alterar dependências/SDK sem autorização.
- **Backend**: 19 avisos apenas de desenvolvimento; `npm audit --omit=dev` = 0.
- **`JWT_EXPIRES_IN`**: comportamento `parseInt` preexistente; demo omite a variável.
- **Migrations**: exigem o alvo Docker `migrate`, por decisão de segurança.
- **Resend**: ausente na demo; recuperação de senha neutra e sem envio.
- **Git remoto**: inacessível/não verificável sem autenticação; primeiro push ainda não autorizado.
- **P3**: containers seguem em execução e o volume foi preservado; a instância P4 foi parada, sem remover volume.

## 10. Recomendação objetiva

A documentação, o snapshot do backend, o ambiente Docker, as migrations, o seed e os contratos HTTP estão **prontos para revisão e publicação**, com a ressalva de que o aplicativo **não foi validado em Android**. Recomenda-se autorizar a P5 para commit/push somente após revisão da lista de arquivos e confirmação de acesso ao repositório remoto. Não recomendo declarar o aplicativo ou o MVP como validados em dispositivo antes da execução dos testes manuais pendentes.
