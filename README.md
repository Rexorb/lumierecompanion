# Lumière Companion

Aplicativo mobile de consulta para salões de beleza, construído em **React Native + Expo** e integrado à API **NestJS** do Lumière. O app é somente leitura: permite entrar, consultar a visão geral, a agenda e os clientes de um salão autorizado.

> **Estado da entrega:** código do app, snapshot do backend, ambiente Docker demonstrativo, migrations, seed fictício e roteiro de instalação. A publicação no GitHub ocorre após autorização específica.

### Status de validação

| Item | Situação |
|---|---|
| API NestJS + PostgreSQL demo | **Validados** em ambiente Docker isolado (P3 e reinstalação limpa da P4). |
| Contratos HTTP do Companion | **60/60 verificações** integradas com JWT real, incluindo autorização, paginação, filtros e estados vazios. |
| Instalação limpa | **Reproduzida** a partir de cópia sem `.env`, `node_modules`, `dist` ou banco prévio. |
| App React Native em Android | **Não validado funcionalmente** em aparelho ou emulador; não declarar aprovado. |
| APK / App Bundle | **Não existe build instalável** nesta entrega. |
| Execução mobile prevista | **Expo Go** ou development build compatível com o SDK 58. |

Repositório de destino: <https://github.com/Rexorb/lumierecompanion>

## 1. Sobre o projeto

O **Lumière** é uma plataforma web de gestão para salões, com frontend Next.js, API NestJS, PostgreSQL/Prisma e integração com WhatsApp. O **Lumière Companion** é um cliente mobile independente: não é um segundo backend, não acessa o banco diretamente e não substitui o frontend web.

O Companion usa as mesmas contas e a mesma API do Lumière. Para a demonstração acadêmica, este repositório inclui:

- o aplicativo Expo/React Native em `src/`;
- um snapshot controlado da API NestJS em `backend/`;
- um ambiente Docker isolado com PostgreSQL 16;
- migrations e seed inteiramente fictício;
- scripts de configuração e verificação.

O frontend Next.js **não é necessário** para executar o Companion nem para a demo.

## 2. Arquitetura

```text
┌──────────────────────────┐      HTTP/JSON + Bearer JWT      ┌─────────────────────────────┐
│  Android / Expo          │ ───────────────────────────────> │  API NestJS (Docker)        │
│  React Native + Router   │                                  │  backend/ — porta interna 3001│
│  porta Metro 8083        │ <─────────────────────────────── │  publicada em 127.0.0.1:3101 │
└──────────────────────────┘                                  └──────────────┬──────────────┘
                                                                             │ Prisma / SQL
                                                                             ▼
                                                              ┌─────────────────────────────┐
                                                              │  PostgreSQL 16 (Docker)    │
                                                              │  volume isolado, sem porta │
                                                              │  publicada no host          │
                                                              └─────────────────────────────┘
```

- O app guarda o JWT no `expo-secure-store` no Android/iOS. No modo web do Expo há apenas uma prévia visual sem login.
- O `salaoId` enviado nas consultas é validado pela API contra o vínculo real do usuário; selecionar um salão no app não concede permissão.
- O PostgreSQL da demo não publica porta no host. A API é publicada apenas no loopback (`127.0.0.1:3101`) por padrão.
- Migrations e seed são executados **explicitamente**, nunca no startup automático da API.

## 3. Tecnologias e versões principais

| Camada | Tecnologia / versão |
|---|---|
| Mobile | Expo SDK `58.0.25`, React Native `0.88.1`, React `19.3.0`, Expo Router `58.0.31` |
| Linguagem do app | TypeScript `6.0.3` |
| Sessão | `expo-secure-store` `58.0.3` |
| Dados no app | TanStack Query `5.107.1`, Axios `1.21.1` |
| API | NestJS `11.2.10`, Node.js `24.21.0` |
| ORM / banco | Prisma `7.10.1`, `@prisma/adapter-pg`, PostgreSQL `16-alpine` |
| Autenticação | JWT (`@nestjs/jwt`, `passport-jwt`) e bcrypt |
| Container | Docker multi-stage; runtime sem a CLI do Prisma |

## 4. Funcionalidades

O app tem **quatro telas de conteúdo e três abas inferiores**:

1. **Login** — fora das abas; autentica em `POST /auth/login`, valida os campos, permite mostrar/ocultar a senha e exibe erros de credencial/rede.
2. **Início (Overview)** — primeira aba; exibe o salão, quatro indicadores e até quatro próximos agendamentos; permite alternar entre salões autorizados, atualizar por gesto e mantém a sessão ao reabrir o app.
3. **Agenda** — segunda aba; consulta agendamentos por dia e status, com navegação de datas, paginação, estados de carregamento/vazio/erro e horários no fuso retornado pela API (`America/Sao_Paulo`).
4. **Clientes** — terceira aba; lista paginada, busca por nome com debounce e estados de carregamento/vazio/erro. Telefone e e-mail não são exibidos.

O escopo é **somente leitura**: não há cadastro, edição, exclusão, notificações push ou administração de WhatsApp no Companion.

## 5. Organização dos diretórios

```text
lumiere-companion/
├── src/                         # aplicativo Expo (rotas, telas, hooks, serviços, tema)
├── backend/                     # snapshot distribuível da API NestJS
│   ├── src/                     # código da API
│   ├── prisma/                  # schema e migrations
│   ├── Dockerfile               # alvos runtime e migrate
│   └── SNAPSHOT_MANIFEST.sha256
├── compose.demo.yaml            # PostgreSQL + API + ferramentas (migrate/seed)
├── scripts/
│   ├── setup-demo.sh            # cria .env.demo local com segredos aleatórios
│   ├── seed-demo.js             # dados fictícios idempotentes
│   └── verify-demo.sh           # verificações HTTP da demo
├── docs/                        # contratos, proveniência e relatórios
├── .env.example                 # URL pública da API para o app
├── .env.demo.example            # modelo das variáveis da demo
├── README.md
└── TUTORIAL.md
```

Arquivos locais como `.env`, `.env.demo`, `node_modules/`, `dist/`, `.expo/` e `backups/` **não fazem parte da distribuição**.

## 6. Pré-requisitos

Para a demo completa no computador:

- **Node.js 24.x** e npm 11.x (o container usa Node 24.21.0; o app usa Expo SDK 58);
- **Docker Engine** com Docker Compose v2 ou superior;
- **Git**;
- `bash`, `openssl`, `curl`, `jq` e `python3` para os scripts de setup/verificação;
- portas livres: **3101** (API demo) e **8083** (Expo/Metro). A porta 5432 do PostgreSQL demo **não** é publicada.

Para abrir o app:

- **Android Emulator** com Android Studio, **ou** aparelho Android com **Expo Go** compatível com o SDK 58, **ou** uma development build;
- `adb` disponível para aparelho físico.

## 7. Instalação da demo — passo a passo

Execute os comandos na raiz do projeto.

### 7.1 Clonar e entrar no diretório

```bash
git clone https://github.com/Rexorb/lumierecompanion.git
cd lumierecompanion
```

> Enquanto a publicação não for autorizada, use a cópia local do projeto. Os comandos abaixo valem para qualquer diretório que contenha estes arquivos.

### 7.2 Gerar as credenciais locais

```bash
./scripts/setup-demo.sh
```

O script:

- cria `.env.demo` com permissão `600`;
- gera aleatoriamente a senha do PostgreSQL, o `JWT_SECRET` e as senhas dos dois usuários fictícios;
- **não** sobrescreve um `.env.demo` existente;
- não imprime senhas nem o JWT no terminal.

Os e-mails fictícios são exibidos pelo script e ficam em `.env.demo`:

```bash
grep -E '^DEMO_USER_[AB]_EMAIL=' .env.demo
```

As senhas estão nas linhas `DEMO_PASSWORD_A` e `DEMO_PASSWORD_B` do mesmo arquivo. Consulte-as **somente no seu computador** (por exemplo, abrindo `.env.demo`) e nunca as copie para issues, chats, commits ou capturas de tela. O arquivo é ignorado pelo Git.

### 7.3 Construir as imagens

```bash
docker compose --env-file .env.demo -f compose.demo.yaml build
```

O build compila o snapshot do backend e gera dois alvos: a API de runtime e a ferramenta de migrations.

### 7.4 Iniciar somente o PostgreSQL

```bash
docker compose --env-file .env.demo -f compose.demo.yaml up -d db
```

O banco demo é o serviço `db`, com volume próprio `lumiere-companion-demo_pgdata`. A porta 5432 fica disponível somente dentro da rede Docker do projeto.

### 7.5 Aplicar as migrations (explícito)

```bash
docker compose --env-file .env.demo -f compose.demo.yaml run --rm migrate
```

Esse comando executa `prisma migrate deploy` no banco demo vazio. **Não há migration automática no startup da API.** Se o banco já contiver migrations inesperadas, interrompa e diagnostique; não apague o volume para contornar o problema.

### 7.6 Carregar o seed fictício

```bash
docker compose --env-file .env.demo -f compose.demo.yaml run --rm seed
```

O seed é idempotente e cria dados de demonstração:

- 2 usuários;
- 3 salões (2 ativos e 1 inativo para o teste de autorização);
- 3 vínculos usuário–salão;
- 4 serviços;
- 25 clientes e 13 agendamentos por salão ativo, totalizando **50 clientes e 26 agendamentos**.

Nenhum dado real é copiado. O seed pode ser executado novamente sem duplicar os registros.

### 7.7 Iniciar a API

```bash
docker compose --env-file .env.demo -f compose.demo.yaml up -d api
```

A API fica em `http://127.0.0.1:3101`. O endpoint de saúde é público:

```bash
curl -fsS http://127.0.0.1:3101/health
```

### 7.8 Verificar os contratos da demo

```bash
./scripts/verify-demo.sh
```

O script executa 60 verificações HTTP usando os usuários e salões do seed: login, perfil, overview, clientes, agendamentos, busca, paginação, filtros, datas inválidas, 401, 403, token expirado, isolamento entre salões e estado vazio. Ele **não imprime tokens**.

## 8. Executar o aplicativo Expo

### 8.1 Instalar dependências

```bash
npm ci
```

### 8.2 Configurar a URL da API

```bash
cp .env.example .env
```

Edite `.env` conforme o ambiente:

| Ambiente | `EXPO_PUBLIC_API_URL` | Observação |
|---|---|---|
| Emulador Android padrão | `http://10.0.2.2:3101` | `10.0.2.2` é o host do computador visto pelo emulador |
| Aparelho Android por USB | `http://127.0.0.1:3101` | Requer `adb reverse tcp:3101 tcp:3101` |
| Celular na mesma Wi-Fi | não suportado pelo binding padrão | A API está em loopback; seria necessário publicar em `0.0.0.0` e revisar firewall, o que não foi feito |
| Expo web | — | A prévia web não faz login, pois não há SecureStore no navegador |

Depois de alterar `.env`, **reinicie o Metro**. A variável é pública no bundle: não coloque JWT, senha ou chave de API nela.

### 8.3 Iniciar o Metro

```bash
npm start
```

O Expo/Metro usa a porta **8083**. Abra o QR Code com o Expo Go ou use um emulador já iniciado. Para tentar abrir diretamente no Android:

```bash
npm run android
```

### 8.4 Aparelho Android por USB (procedimento não validado nesta fase)

Com o aparelho autorizado para depuração USB:

```bash
adb devices
adb reverse tcp:3101 tcp:3101
# opcional, se o Metro também precisar ser acessado via USB:
adb reverse tcp:8083 tcp:8083
```

Configure `.env` com `EXPO_PUBLIC_API_URL=http://127.0.0.1:3101` e reinicie o Expo. Se o QR Code usar o endereço de rede do computador, consulte `npx expo start --help` para iniciar o Metro no modo local/adequado ao seu aparelho. Esse fluxo **não foi executado** na P4 por ausência de dispositivo.

### 8.5 Emulador Android

1. Inicie um AVD no Android Studio.
2. Confirme `.env` com `http://10.0.2.2:3101`.
3. Execute `npm run android` ou `npm start` e abra o projeto no Expo Go.

O acesso da API por `10.0.2.2` pressupõe que a API esteja publicada no loopback do host, que é o padrão do Compose.

## 9. Credenciais demonstrativas

As credenciais são **locais e aleatórias**:

- e-mails: `DEMO_USER_A_EMAIL` e `DEMO_USER_B_EMAIL` em `.env.demo`;
- senhas: `DEMO_PASSWORD_A` e `DEMO_PASSWORD_B` no mesmo arquivo;
- usuário A acessa o salão Alfa; usuário B acessa o salão Beta;
- o usuário A também tem vínculo com um salão inativo, usado para validar a recusa de acesso.

Para consultar os e-mails sem imprimir as senhas:

```bash
grep -E '^DEMO_USER_[AB]_EMAIL=' .env.demo
```

Para as senhas, abra o arquivo localmente (por exemplo, `less .env.demo`). Não há credenciais reais ou fixas no repositório. Se você perder o arquivo, não é possível recuperar os valores; crie um novo ambiente demo com um novo `.env.demo` e um novo volume/projeto, sem apagar dados existentes sem necessidade.

## 10. Iniciar, parar e reiniciar sem perder dados

```bash
# parar os containers da demo, preservando o volume
docker compose --env-file .env.demo -f compose.demo.yaml stop

# iniciar novamente
docker compose --env-file .env.demo -f compose.demo.yaml start

# reiniciar apenas a API (por exemplo, após alterar configuração)
docker compose --env-file .env.demo -f compose.demo.yaml restart api

# ver logs
docker compose --env-file .env.demo -f compose.demo.yaml logs -f api

# estado dos serviços
docker compose --env-file .env.demo -f compose.demo.yaml ps
```

O volume nomeado `lumiere-companion-demo_pgdata` mantém os dados entre paradas e reinícios normais. **Não use `docker compose down -v`**, `prisma migrate reset`, `db push --force-reset` nem exclusão manual de volumes: esses comandos apagam os dados.

Para recriar o banco do zero em um ambiente separado, use outro nome de projeto Compose, outro volume e outra porta, em vez de destruir a demo atual.

## 11. Endpoints usados pelo Companion

| Método | Rota | Autenticação | Uso |
|---|---|---|---|
| `GET` | `/health` | pública | saúde do processo |
| `POST` | `/auth/login` | pública | obter JWT |
| `GET` | `/auth/me` | Bearer JWT | restaurar sessão |
| `GET` | `/dashboard/overview?salaoId=...` | Bearer JWT | indicadores e próximos agendamentos |
| `GET` | `/clientes?salaoId=...&search=...&page=...&pageSize=...` | Bearer JWT | clientes paginados |
| `GET` | `/agendamentos?salaoId=...&date=YYYY-MM-DD&status=...&page=...&pageSize=...` | Bearer JWT | agenda por dia/status |

Contratos detalhados: [`docs/04_CONTRATOS_CONSULTA.md`](docs/04_CONTRATOS_CONSULTA.md).

## 12. Limitações conhecidas

- **Validação Android pendente:** não há emulador/aparelho disponível na P4; login, sessão, abas, Agenda, Clientes, logout, falhas de rede e tamanhos de tela **não foram testados no app**. Não considere o aplicativo aprovado para a demo sem essa execução.
- **Sem APK/App Bundle:** o projeto executa via Expo Go/development build; não há build Android instalável.
- **API em loopback:** por padrão, celular na mesma Wi-Fi não alcança `127.0.0.1:3101`; o fluxo previsto é emulador com `10.0.2.2` ou USB com `adb reverse`.
- **Recuperação de senha:** sem `RESEND_API_KEY`, o boot funciona e o endpoint responde de forma neutra, mas não envia e-mail. A demo não depende de Resend.
- **`JWT_EXPIRES_IN`:** o backend atual usa `parseInt`; por isso a demo **omite** essa variável e usa o default interno de 7 dias. Não use `"1d"`.
- **Migrations:** dependem do alvo Docker `migrate`; não são automáticas.
- **Dependências de desenvolvimento:** o backend mantém 19 avisos npm restritos a ferramentas de desenvolvimento (`@nestjs/cli`, Jest, ESLint). A árvore de produção está com 0 achados no `npm audit --omit=dev`.
- **Auditoria do app:** o `npm audit` do Expo reporta 8 avisos moderados no total, sendo 3 na árvore de produção (cadeia Expo/`@expo/fingerprint`/`minimatch`). Não foi aplicado `npm audit fix --force` nem upgrade de SDK nesta fase.
- **Snapshot:** `backend/` é uma cópia controlada e manifestada, não um segundo histórico Git do backend original.
- **Web:** `npm run web` serve apenas para inspeção visual; o login é exclusivo de Android/iOS por causa do SecureStore.

## 13. Documentação técnica

- [`docs/04_CONTRATOS_CONSULTA.md`](docs/04_CONTRATOS_CONSULTA.md) — contratos HTTP de clientes e agendamentos.
- [`docs/BACKEND_SNAPSHOT.md`](docs/BACKEND_SNAPSHOT.md) — proveniência e validação do snapshot do backend.
- [`docs/DEPENDENCIAS_BACKEND_CORRECAO_2026-11-13.md`](docs/DEPENDENCIAS_BACKEND_CORRECAO_2026-11-13.md) — versões e auditoria de dependências.
- [`docs/ENTREGA_GITHUB_DOCKER_P3.md`](docs/ENTREGA_GITHUB_DOCKER_P3.md) — ambiente Docker, migrations, seed e testes da P3.
- [`docs/ENTREGA_GITHUB_DOCKER_P4.md`](docs/ENTREGA_GITHUB_DOCKER_P4.md) — instalação limpa, auditoria pré-publicação e estado da P4.
- [`LUMIERE_COMPANION_PLANO_TECNICO.md`](LUMIERE_COMPANION_PLANO_TECNICO.md) — plano técnico e decisões de arquitetura.

## 14. Publicação

O repositório Git local ainda não possui commits e a publicação depende de autorização específica. Não execute `git add .` indiscriminadamente; a lista de arquivos destinados à distribuição e as exclusões de segurança estão em [`docs/ARQUIVOS_PUBLICACAO_P4.md`](docs/ARQUIVOS_PUBLICACAO_P4.md).

Projeto acadêmico — Lumière Companion. Consulte o autor para uso, créditos e condições de distribuição.
