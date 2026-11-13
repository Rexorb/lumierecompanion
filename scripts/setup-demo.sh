#!/usr/bin/env bash
# Cria o .env.demo local do ambiente demonstrativo, sem imprimir segredos.
# Não sobrescreve um .env.demo existente. Requer openssl.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env.demo"
EXAMPLE_FILE="${ROOT_DIR}/.env.demo.example"

if [[ -e "${ENV_FILE}" ]]; then
  echo "ERRO: ${ENV_FILE} já existe; nada foi alterado." >&2
  exit 1
fi

if [[ ! -f "${EXAMPLE_FILE}" ]]; then
  echo "ERRO: ${EXAMPLE_FILE} não encontrado." >&2
  exit 1
fi

if ! command -v openssl >/dev/null 2>&1; then
  echo "ERRO: openssl é necessário para gerar os segredos." >&2
  exit 1
fi

umask 077

POSTGRES_PASSWORD="$(openssl rand -hex 24)"
JWT_SECRET="$(openssl rand -hex 48)"
DEMO_PASSWORD_A="$(openssl rand -hex 24)"
DEMO_PASSWORD_B="$(openssl rand -hex 24)"

TMP_FILE="$(mktemp "${ENV_FILE}.tmp.XXXXXX")"
trap 'rm -f "${TMP_FILE}"' EXIT

sed \
  -e "s|^POSTGRES_PASSWORD=.*$|POSTGRES_PASSWORD=${POSTGRES_PASSWORD}|" \
  -e "s|^JWT_SECRET=.*$|JWT_SECRET=${JWT_SECRET}|" \
  -e "s|^DEMO_PASSWORD_A=.*$|DEMO_PASSWORD_A=${DEMO_PASSWORD_A}|" \
  -e "s|^DEMO_PASSWORD_B=.*$|DEMO_PASSWORD_B=${DEMO_PASSWORD_B}|" \
  "${EXAMPLE_FILE}" > "${TMP_FILE}"

chmod 600 "${TMP_FILE}"

if [[ -e "${ENV_FILE}" ]]; then
  echo "ERRO: ${ENV_FILE} já existe; nada foi alterado." >&2
  rm -f "${TMP_FILE}"
  trap - EXIT
  exit 1
fi

mv "${TMP_FILE}" "${ENV_FILE}"
trap - EXIT

echo "OK: ${ENV_FILE} criado com permissão 600."
echo "Usuários fictícios definidos (senhas não são exibidas):"
grep -E '^DEMO_USER_[AB]_EMAIL=' "${ENV_FILE}" || true
echo "Para ver os valores localmente: leia .env.demo diretamente."
