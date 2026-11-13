# Fase 4 — contratos de consulta implementados

Backend original: `lumiere/lumiere-backend/src/modules/consultas/`. Ambas as rotas exigem `Authorization: Bearer <JWT>` e `salaoId` obrigatório verificado contra vínculo `UsuarioSalao` com salão ativo e não excluído; ausência de vínculo resulta em 403. O ID selecionado no app **não concede** acesso por si só. Paginação `page` (1–100000, padrão 1) e `pageSize` (1–50, padrão 20), ordenação estável. Erro de parâmetros: 400. Nenhuma rota de escrita foi criada.

## Clientes

`GET /clientes?salaoId=<id>&search=<nome>&page=1&pageSize=20`. Busca opcional por nome, sem distinguir maiúsculas/minúsculas; exclui clientes com `deletedAt` preenchido. Resposta `{ salon: { id, name }, page, pageSize, total, hasMore, items: [{ id, nome, totalVisitas, ultimaVisita }] }`. `ultimaVisita` é ISO UTC ou `null`; não retorna telefones, e-mails ou observações.

## Agendamentos

`GET /agendamentos?salaoId=<id>&date=YYYY-MM-DD&status=PENDENTE&page=1&pageSize=20`. Data opcional (padrão: hoje em `America/Sao_Paulo`), status opcional (`PENDENTE`, `CONFIRMADO`, `CANCELADO`, `CONCLUIDO`, `FALTOU`). Resposta `{ salon, timezone: 'America/Sao_Paulo', date, page, pageSize, total, hasMore, items: [{ id, startsAt, durationMinutes, status, clientName, serviceName }] }`. `startsAt` é ISO UTC; janela de dia `[00:00, próximo 00:00)` no fuso do serviço. Datas impossíveis retornam 400. Não retorna observações nem contatos pessoais.

## Segurança e validação

Os testes de serviço e controlador com identidade/Prisma simulados passaram. Na P3, os contratos foram exercitados com **JWT real e PostgreSQL demo**, incluindo isolamento entre dois usuários/salões, salão inativo, busca, paginação, filtros, datas inválidas, 401 e 403; o roteiro `scripts/verify-demo.sh` executa 60 verificações. A P4 repetiu a instalação em uma cópia limpa e em um projeto Docker isolado. A validação do app Android (login, sessão e telas em aparelho/emulador) permanece **pendente** e não deve ser inferida desses testes HTTP.

Detalhes: [`ENTREGA_GITHUB_DOCKER_P3.md`](ENTREGA_GITHUB_DOCKER_P3.md) e [`ENTREGA_GITHUB_DOCKER_P4.md`](ENTREGA_GITHUB_DOCKER_P4.md). Alterações preexistentes no backend original, principalmente em `cliente.service.ts`, permaneceram intocadas.
