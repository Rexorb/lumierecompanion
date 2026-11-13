# Tutorial rápido — Android

O roteiro completo, com Docker, migrations, seed e solução de problemas, está no [`README.md`](README.md).

## Emulador Android

1. Instale Node.js 24.x, Docker com Compose e o Android Studio.
2. Na raiz do projeto, prepare e suba o backend demo:

   ```bash
   ./scripts/setup-demo.sh
   docker compose --env-file .env.demo -f compose.demo.yaml build
   docker compose --env-file .env.demo -f compose.demo.yaml up -d db
   docker compose --env-file .env.demo -f compose.demo.yaml run --rm migrate
   docker compose --env-file .env.demo -f compose.demo.yaml run --rm seed
   docker compose --env-file .env.demo -f compose.demo.yaml up -d api
   ```

3. Instale as dependências do app e configure a URL:

   ```bash
   npm ci
   cp .env.example .env
   # .env já vem com http://10.0.2.2:3101 para o emulador padrão.
   ```

4. Inicie um AVD no Android Studio e execute:

   ```bash
   npm run android
   ```

5. Entre com o e-mail e a senha fictícios gerados em `.env.demo` (veja a seção de credenciais do README).

## Aparelho Android por USB

1. Autorize a depuração USB e confirme o aparelho:

   ```bash
   adb devices
   adb reverse tcp:3101 tcp:3101
   adb reverse tcp:8083 tcp:8083
   ```

2. Em `.env`, use `EXPO_PUBLIC_API_URL=http://127.0.0.1:3101`.
3. Reinicie o Metro com `npm start` e abra o projeto no Expo Go.

Esse fluxo de USB ainda **não foi validado** nesta entrega. Para celular na mesma Wi-Fi, a API publicada apenas em `127.0.0.1:3101` não é alcançável; seria necessário alterar o binding da demo e revisar firewall, o que não faz parte do padrão atual.
