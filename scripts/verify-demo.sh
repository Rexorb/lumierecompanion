#!/usr/bin/env bash
# Verifica a API demonstrativa em execução. Não imprime tokens nem senhas.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env.demo"
COMPOSE=(docker compose --env-file "${ENV_FILE}" -f "${ROOT_DIR}/compose.demo.yaml")

SALON_A="a0000000-0000-4000-8000-000000000001"
SALON_B="b0000000-0000-4000-8000-000000000001"
SALON_INACTIVE="c0000000-0000-4000-8000-000000000001"

set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

BASE="http://127.0.0.1:${DEMO_API_PORT:-3101}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

FAILURES=0

check() {
  local label="$1" expected="$2" actual="$3"
  if [[ "${expected}" == "${actual}" ]]; then
    echo "PASS  ${label} (${actual})"
  else
    echo "FAIL  ${label}: esperado=${expected} obtido=${actual}"
    FAILURES=$((FAILURES + 1))
  fi
}

http() {
  local method="$1" path="$2" token="${3:-}" data="${4:-}"
  local args=(-s -o "${TMP_DIR}/body" -w '%{http_code}' -X "${method}")
  [[ -n "${token}" ]] && args+=(-H "Authorization: Bearer ${token}")
  [[ -n "${data}" ]] && args+=(-H 'Content-Type: application/json' -d "${data}")
  curl "${args[@]}" "${BASE}${path}"
}

login() {
  local email="$1" password="$2"
  http POST /auth/login '' "{\"email\":\"${email}\",\"senha\":\"${password}\"}" >/dev/null
  jq -r '.access_token // empty' "${TMP_DIR}/body"
}

TODAY="$(TZ=America/Sao_Paulo date +%F)"
EXPECTED_FIRST_ISO="$(python3 -c "from datetime import datetime,timezone; print(datetime.fromisoformat('${TODAY}T09:00:00-03:00').astimezone(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z'))")"

# --- health ---
check "GET /health" "200" "$(http GET /health)"
check "health.status" "ok" "$(jq -r '.status' "${TMP_DIR}/body")"

# --- autenticação ---
check "login A HTTP 201" "201" "$(http POST /auth/login '' "{\"email\":\"${DEMO_USER_A_EMAIL}\",\"senha\":\"${DEMO_PASSWORD_A}\"}")"
TOKEN_A="$(login "${DEMO_USER_A_EMAIL}" "${DEMO_PASSWORD_A}")"
check "login A retorna token" "yes" "$([[ -n "${TOKEN_A}" ]] && echo yes || echo no)"
http POST /auth/login '' "{\"email\":\"${DEMO_USER_A_EMAIL}\",\"senha\":\"${DEMO_PASSWORD_A}\"}" >/dev/null
check "login A user.saloes>=2" "yes" "$([[ "$(jq '.user.saloes | length' "${TMP_DIR}/body")" -ge 2 ]] && echo yes || echo no)"
check "login A não expõe senha" "true" "$(jq '.user | has("senha") | not' "${TMP_DIR}/body")"

TOKEN_B="$(login "${DEMO_USER_B_EMAIL}" "${DEMO_PASSWORD_B}")"
check "login B retorna token" "yes" "$([[ -n "${TOKEN_B}" ]] && echo yes || echo no)"

check "login senha incorreta" "401" "$(http POST /auth/login '' "{\"email\":\"${DEMO_USER_A_EMAIL}\",\"senha\":\"errada-demo\"}")"

check "GET /auth/me A" "200" "$(http GET /auth/me "${TOKEN_A}")"
check "me A e-mail" "${DEMO_USER_A_EMAIL}" "$(jq -r '.email' "${TMP_DIR}/body")"
check "me A não expõe senha" "true" "$(jq 'has("senha") | not' "${TMP_DIR}/body")"
check "GET /auth/me B" "200" "$(http GET /auth/me "${TOKEN_B}")"
check "me B email" "${DEMO_USER_B_EMAIL}" "$(jq -r '.email' "${TMP_DIR}/body")"

# --- dashboard ---
check "overview A" "200" "$(http GET "/dashboard/overview?salaoId=${SALON_A}" "${TOKEN_A}")"
check "overview timezone" "America/Sao_Paulo" "$(jq -r '.timezone' "${TMP_DIR}/body")"
check "overview salão A" "${SALON_A}" "$(jq -r '.salon.id' "${TMP_DIR}/body")"
check "overview clientes" "25" "$(jq -r '.metrics.clients.value' "${TMP_DIR}/body")"
check "overview hoje (4 ativos)" "4" "$(jq -r '.metrics.today.value' "${TMP_DIR}/body")"
check "overview upcoming>=2" "yes" "$([[ "$(jq '.upcoming | length' "${TMP_DIR}/body")" -ge 2 ]] && echo yes || echo no)"
check "overview sem salaoId (A)" "200" "$(http GET /dashboard/overview "${TOKEN_A}")"
check "overview A no salão B" "403" "$(http GET "/dashboard/overview?salaoId=${SALON_B}" "${TOKEN_A}")"
check "overview A no salão inativo" "403" "$(http GET "/dashboard/overview?salaoId=${SALON_INACTIVE}" "${TOKEN_A}")"
check "overview B" "200" "$(http GET "/dashboard/overview?salaoId=${SALON_B}" "${TOKEN_B}")"
check "overview B clientes" "25" "$(jq -r '.metrics.clients.value' "${TMP_DIR}/body")"
check "overview sem token" "401" "$(http GET /dashboard/overview)"

# --- clientes ---
check "clientes A page 1" "200" "$(http GET "/clientes?salaoId=${SALON_A}" "${TOKEN_A}")"
check "clientes A total" "25" "$(jq -r '.total' "${TMP_DIR}/body")"
check "clientes A page1 itens" "20" "$(jq -r '.items | length' "${TMP_DIR}/body")"
check "clientes A hasMore" "true" "$(jq -r '.hasMore' "${TMP_DIR}/body")"
check "clientes A page 2" "5" "$(http GET "/clientes?salaoId=${SALON_A}&page=2" "${TOKEN_A}" >/dev/null; jq -r '.items | length' "${TMP_DIR}/body")"
check "clientes A page2 hasMore" "false" "$(jq -r '.hasMore' "${TMP_DIR}/body")"
check "clientes A pageSize 10 / page 3" "5" "$(http GET "/clientes?salaoId=${SALON_A}&page=3&pageSize=10" "${TOKEN_A}" >/dev/null; jq -r '.items | length' "${TMP_DIR}/body")"
check "clientes busca" "1" "$(http GET "/clientes?salaoId=${SALON_A}&search=Alfa%2007" "${TOKEN_A}" >/dev/null; jq -r '.total' "${TMP_DIR}/body")"
check "clientes busca sem resultado" "0" "$(http GET "/clientes?salaoId=${SALON_A}&search=inexistente-xyz" "${TOKEN_A}" >/dev/null; jq -r '.total' "${TMP_DIR}/body")"
check "clientes pageSize inválido" "400" "$(http GET "/clientes?salaoId=${SALON_A}&pageSize=51" "${TOKEN_A}")"
check "clientes sem salaoId" "400" "$(http GET /clientes "${TOKEN_A}")"
check "clientes sem token" "401" "$(http GET "/clientes?salaoId=${SALON_A}")"
check "clientes token inválido" "401" "$(http GET "/clientes?salaoId=${SALON_A}" "token-invalido")"
check "clientes A no salão B" "403" "$(http GET "/clientes?salaoId=${SALON_B}" "${TOKEN_A}")"
check "clientes B total" "25" "$(http GET "/clientes?salaoId=${SALON_B}" "${TOKEN_B}" >/dev/null; jq -r '.total' "${TMP_DIR}/body")"
check "clientes B nome Beta" "true" "$(jq -r '.items[0].nome | startswith("Cliente Beta")' "${TMP_DIR}/body")"

EXPIRED_TOKEN="$("${COMPOSE[@]}" exec -T api node -e 'const jwt=require("jsonwebtoken");process.stdout.write(jwt.sign({sub:"a0000000-0000-4000-8000-0000000000a1",email:"demo@example.test",nome:"Demo",tipo:"DONO_SALAO"},process.env.JWT_SECRET,{expiresIn:-10}))')"
check "clientes token expirado" "401" "$(http GET "/clientes?salaoId=${SALON_A}" "${EXPIRED_TOKEN}")"

# --- agendamentos ---
check "agendamentos A hoje" "200" "$(http GET "/agendamentos?salaoId=${SALON_A}&date=${TODAY}" "${TOKEN_A}")"
check "agendamentos total hoje" "6" "$(jq -r '.total' "${TMP_DIR}/body")"
check "agendamentos timezone" "America/Sao_Paulo" "$(jq -r '.timezone' "${TMP_DIR}/body")"
check "agendamentos data" "${TODAY}" "$(jq -r '.date' "${TMP_DIR}/body")"
check "agendamentos primeiro ISO (09:00 SP)" "${EXPECTED_FIRST_ISO}" "$(jq -r '.items[0].startsAt' "${TMP_DIR}/body")"
check "agendamentos página 1 itens" "6" "$(jq -r '.items | length' "${TMP_DIR}/body")"
check "agendamentos status PENDENTE" "1" "$(http GET "/agendamentos?salaoId=${SALON_A}&date=${TODAY}&status=PENDENTE" "${TOKEN_A}" >/dev/null; jq -r '.total' "${TMP_DIR}/body")"
check "agendamentos status CANCELADO" "1" "$(http GET "/agendamentos?salaoId=${SALON_A}&date=${TODAY}&status=CANCELADO" "${TOKEN_A}" >/dev/null; jq -r '.total' "${TMP_DIR}/body")"
check "agendamentos paginação 2" "2" "$(http GET "/agendamentos?salaoId=${SALON_A}&date=${TODAY}&pageSize=2&page=3" "${TOKEN_A}" >/dev/null; jq -r '.items | length' "${TMP_DIR}/body")"
check "agendamentos data sem registros" "200" "$(http GET "/agendamentos?salaoId=${SALON_A}&date=2099-01-01" "${TOKEN_A}")"
check "agendamentos estado vazio" "0" "$(jq -r '.items | length' "${TMP_DIR}/body")"
check "agendamentos data inválida" "400" "$(http GET "/agendamentos?salaoId=${SALON_A}&date=2026-02-30" "${TOKEN_A}")"
check "agendamentos formato de data inválido" "400" "$(http GET "/agendamentos?salaoId=${SALON_A}&date=13-11-2026" "${TOKEN_A}")"
check "agendamentos status inválido" "400" "$(http GET "/agendamentos?salaoId=${SALON_A}&status=INVALIDO" "${TOKEN_A}")"
check "agendamentos A no salão B" "403" "$(http GET "/agendamentos?salaoId=${SALON_B}&date=${TODAY}" "${TOKEN_A}")"
check "agendamentos A no salão inativo" "403" "$(http GET "/agendamentos?salaoId=${SALON_INACTIVE}&date=${TODAY}" "${TOKEN_A}")"
check "agendamentos B hoje" "6" "$(http GET "/agendamentos?salaoId=${SALON_B}&date=${TODAY}" "${TOKEN_B}" >/dev/null; jq -r '.total' "${TMP_DIR}/body")"
check "agendamentos sem token" "401" "$(http GET "/agendamentos?salaoId=${SALON_A}")"

echo
if [[ "${FAILURES}" -eq 0 ]]; then
  echo "RESULTADO: todos os testes passaram."
else
  echo "RESULTADO: ${FAILURES} falha(s)."
  exit 1
fi
