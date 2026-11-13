# Fase P3 — ambiente demonstrativo, migrations, seed e testes integrados

**Data:** 13/11/2026. **Status:** P3.1–P3.4 e P3.6 concluídas; **P3.5 não validada em dispositivo** (nenhum emulador/aparelho disponível). **P4 executada posteriormente; P5 não iniciada.** Nenhum commit, remote ou publicação foi criado.

**Escopo:** diretório do projeto `lumiere-companion`. O backend original (`lumiere/lumiere-backend`), o frontend Web, o schema Prisma, as migrations e os dados/volumes do TCC **não foram alterados**.

**Pré-requisitos usados:** Docker/Compose v5, bash, `openssl`, `curl`, `jq` e `python3`.

## 1. Arquivos criados e modificados

**Criados:**

- `scripts/setup-demo.sh` — gera `.env.demo` local sem imprimir segredos.
- `scripts/seed-demo.js` — seed fictício e idempotente, executado no alvo Docker `migrate`.
- `scripts/verify-demo.sh` — 60 verificações HTTP, sem imprimir tokens.
- `docs/ENTREGA_GITHUB_DOCKER_P3.md` (este relatório).

**Modificados:**

- `compose.demo.yaml` — serviços de perfil `tools` `migrate` e `seed`, sem portas e sem execução automática.
- `.env.demo.example` — variáveis fictícias dos dois usuários demo (somente placeholders).

**Criado localmente e ignorado pelo Git:** `.env.demo` (permissão `600`, valores gerados aleatoriamente). **Backend/snapshot, schema, migrations e o app React Native não foram editados nesta fase.**

## 2. Configuração local e segredos

`./scripts/setup-demo.sh`:

- recusa sobrescrever `.env.demo` existente (exit 1, arquivo preservado — testado);
- gera `POSTGRES_PASSWORD` (24 bytes/48 hex), `JWT_SECRET` (48 bytes/96 hex, ≥32 bytes e ≥8 caracteres distintos) e duas senhas demo (24 bytes/48 hex) com `openssl rand`;
- cria o arquivo com `umask 077` e `chmod 600`;
- não imprime senhas, JWT ou `DATABASE_URL`;
- mantém `JWT_EXPIRES_IN` omitido (default interno `7d`, evitando o `parseInt` atual);
- não exige `RESEND_API_KEY`.

Verificações: `.env.demo` está coberto por `.gitignore`; nenhum `.env` real aparece no `git status`; os valores no arquivo têm os comprimentos esperados e nenhum placeholder `EXEMPLO_TROQUE` restou.

## 3. Isolamento antes de iniciar containers

Pré-checagem com `.env.demo`:

| Item | Valor efetivo |
|---|---|
| Projeto Compose | `lumiere-companion-demo` |
| Rede | `lumiere-companion-demo_demo` |
| Volume | `lumiere-companion-demo_pgdata` (novo, criado em 13/11/2026) |
| Container do banco | `lumiere-companion-demo-db-1` |
| Publicação do PostgreSQL | **nenhuma** (`5432/tcp` interno, sem host port) |
| API | `127.0.0.1:3101 → 3001/tcp` |
| Porta 3101 no host | livre antes da subida |
| Artefatos demo anteriores | nenhum container, volume ou rede com esse prefixo |

O banco demo estava vazio antes das migrations: `0` tabelas em `public` e `_prisma_migrations` inexistente. Nenhum dado foi apagado para prosseguir.

## 4. Migrations

Executado explicitamente:

```bash
docker compose --env-file .env.demo -f compose.demo.yaml run --rm migrate
```

Resultado: **6 migrations aplicadas com sucesso**, sem reset/push e sem execução no startup da API:

1. `20260813191221_init`
2. `20261029020624_whatsapp_instance_name_unique`
3. `20261030135912_add_mensagem_processada_idempotency`
4. `20261030205457_add_chatbot_configuration`
5. `20261030231921_add_salon_schedule_domain`
6. `20261031000813_remove_appointment_start_unique`

Verificação posterior: **16 tabelas** em `public` e **6 registros** concluídos em `_prisma_migrations`.

## 5. Seed demonstrativo

Executado com `docker compose ... run --rm seed`. Segunda execução produziu exatamente os mesmos totais, confirmando idempotência:

| Entidade | Quantidade |
|---|---|
| Usuários | 2 (`demo.alfa@lumiere.test`, `demo.beta@lumiere.test`) |
| Salões | 3 (Alfa e Beta ativos; um salão inativo para teste de autorização) |
| Vínculos usuário–salão | 3 (A→Alfa, B→Beta, A→inativo) |
| Serviços | 4 (2 por salão ativo) |
| Clientes | 50 (25 por salão ativo) |
| Agendamentos | 26 (13 por salão ativo) |

Os registros são **inteiramente fictícios**: nomes “Cliente Alfa/Beta NN”, telefones/e-mails de exemplo (`example.test`), preços e observações de demonstração. Nenhum dado do banco original foi lido ou copiado. Senhas são gravadas com bcrypt; nenhum segredo foi impresso.

Cenários cobertos pelo seed: todos os status de agendamento, datas de hoje/ontem/amanhã/semana anterior/próximos dias, 25 clientes para paginação, nomes pesquisáveis e dois tenants independentes.

## 6. Inicialização real da API

`docker compose ... up -d api` iniciou o NestJS com `NODE_ENV=production`, usuário `node`, PostgreSQL demo conectado e **sem Resend**:

- `/health` → **200**, `status=ok`;
- log de boot: `MailService` avisa que recuperação por e-mail está indisponível, sem impedir a inicialização;
- `POST /auth/forgot-password` → **201** com mensagem neutra e **nenhum token gerado** (`tokenReset` permaneceu nulo);
- API acessível apenas em `127.0.0.1:3101`; tentativa pelo IP da rede local não respondeu (`000`).

## 7. Resultados dos endpoints (60 verificações)

`./scripts/verify-demo.sh` → **60/60 PASS**, sem imprimir tokens.

### Autenticação

| Caso | Resultado |
|---|---|
| `POST /auth/login` A e B | **201** com `access_token` e `user.saloes` |
| Senha incorreta | **401** |
| `GET /auth/me` A e B | **200**, e-mail correto, **sem campo `senha`** |
| Sem token / token inválido / token expirado | **401** nos três casos |

### Overview e isolamento

| Caso | Resultado |
|---|---|
| `GET /dashboard/overview` A (Alfa) | **200**; timezone `America/Sao_Paulo`; 25 clientes; 4 agendamentos ativos hoje; 7 na semana (+250%); 3 novos no mês; 3 pendentes; 4 próximos |
| Overview B (Beta) | **200**; 25 clientes |
| A solicitando salão B | **403** |
| A solicitando salão inativo | **403** |
| Sem token | **401** |

### Clientes

| Caso | Resultado |
|---|---|
| Listagem A | **200**, `total=25`, 20 itens, `hasMore=true` |
| Página 2 | 5 itens, `hasMore=false` |
| `pageSize=10&page=3` | 5 itens |
| Busca `Alfa 07` | 1 resultado |
| Busca sem correspondência | 0 resultados |
| `pageSize=51` / `salaoId` ausente | **400** |
| Sem token / inválido / expirado | **401** |
| A no salão B | **403** |
| B na própria base | 25 clientes, nomes “Cliente Beta” |

### Agendamentos

| Caso | Resultado |
|---|---|
| Hoje (A e B) | **200**, `total=6`, 6 itens, timezone e data corretos |
| Ordenação/timestamp | 09:00 em `America/Sao_Paulo` → **`2026-11-13T12:00:00.000Z`** |
| `status=PENDENTE` / `CANCELADO` | 1 cada |
| `pageSize=2&page=3` | 2 itens |
| Data válida sem registros (`2099-01-01`) | **200**, 0 itens |
| `date=2026-02-30` / `13-11-2026` | **400** |
| `status=INVALIDO` | **400** |
| Sem token | **401** |
| A no salão B / salão inativo | **403** |

### Apresentação de horários

O contrato entrega ISO UTC + `timezone=America/Sao_Paulo`; o Companion formata com `Intl.DateTimeFormat` nesse fuso. A mesma conversão foi reproduzida em Node: `12:00Z` → **09:00** local. A validação visual no aparelho não foi possível (ver seção 9).

## 8. Persistência

Após `docker compose restart db api`:

- ambos os containers ficaram `healthy`;
- `pg_isready` confirmou conexão;
- os 60 testes passaram novamente;
- os dados fictícios permaneceram (volume `lumiere-companion-demo_pgdata` preservado, sem remoção).

## 9. Conectividade com React Native

**Não foi possível validar o app nesta fase.** `adb devices` não listou nenhum aparelho, não há emulador Android instalado e o Metro/Expo não estava em execução. Portanto:

- login, restauração de sessão, Overview, Agenda, Clientes, logout e tratamento de falhas no app **não foram testados**;
- o aplicativo **não é declarado aprovado** para a demo;
- a API permaneceu publicada apenas em `127.0.0.1:3101`, sem `0.0.0.0`, sem túnel e sem abertura pública.

Para a P4 será necessário: emulador com `10.0.2.2:3101` **ou** aparelho USB com `adb reverse tcp:3101 tcp:3101` e `EXPO_PUBLIC_API_URL` adequado, seguido de reinício do Metro e testes reais.

## 10. Verificação de isolamento e preservação

| Item | Resultado |
|---|---|
| Containers originais (`lumiere_db`, Evolution, Redis) | IDs, imagens, mounts e portas **inalterados** |
| Volume original `lumiere-backend_lumiere_pgdata` | **inalterado** (mesmo `CreatedAt`/labels) |
| PostgreSQL original | continua em `0.0.0.0:5432`, como antes; não foi acessado |
| Git e dependências do backend original | `git status` e hashes de `package.json`/`package-lock.json` **inalterados** |
| Volume demo | `lumiere-companion-demo_pgdata`, labels do projeto demo |
| Containers em execução do projeto demo | somente `db` e `api`; ferramentas `run --rm` já removidas |
| Porta 5432 do demo | **não publicada** |
| `.env.demo` | ignorado pelo Git, modo `600` |
| Serviços externos | nenhum (sem Evolution, Redis, n8n ou Next.js) |

O ambiente demo foi mantido em execução para revisão; nenhum volume foi removido.

## 11. Problemas encontrados e soluções

1. **Seed passava `key` para o Prisma** (`Unknown argument key`): campo removido antes do `create`; seed reexecutado com sucesso.
2. **Erro `salaoId is not defined`** no seed: abreviação incorreta de `salonId`; corrigido em `scripts/seed-demo.js`.
3. **Nomes com espaço quebravam `source .env.demo`**: valores de nome agora entre aspas no exemplo e no arquivo local.
4. **Teste esperava 200 no login**, mas o NestJS retorna **201** para `POST`: expectativa corrigida no script de verificação.
5. Nenhuma correção exigiu alterar código de negócio, schema, migrations ou contratos HTTP.

## 12. Pendências para a P4

1. Validar o Companion em emulador/aparelho com URL e rota adequadas; testar login, sessão, Overview, Agenda, Clientes, logout e falhas de rede.
2. Definir se a demo continuará em execução e como será encerrada sem remover o volume (preservar dados).
3. Decidir sobre commits/publicação (ainda não autorizados), incluindo `.env.demo.example`, scripts e docs.
4. Reavaliar riscos registrados na P2: 19 achados de desenvolvimento, `JWT_EXPIRES_IN` com `parseInt`, digests de imagens base e dependência `typescript` no runtime.
5. Se necessário, criar dados adicionais ou ajustar layout do seed — sempre fictícios, idempotentes e sem tocar no banco original.
