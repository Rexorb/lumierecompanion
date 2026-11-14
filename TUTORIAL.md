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

## Expo Go no celular Android via USB

Esse caminho mantém a API demo acessível **somente no computador** (`127.0.0.1:3101`): o `adb reverse` encaminha as portas do celular para o computador pelo cabo USB. Não é necessário publicar a API na rede Wi-Fi.

1. Instale no celular o **Expo Go compatível com o SDK 58**. Ative a depuração USB nas opções de desenvolvedor, conecte o cabo e autorize o computador quando o Android solicitar. No computador, instale `adb` e confira que o aparelho aparece como `device`:

   ```bash
   adb devices
   ```

2. Prepare e inicie o backend com os comandos da seção **Emulador Android** (passo 2). Se `.env.demo` e os containers já existirem, **não** execute `setup-demo.sh` novamente: ele não sobrescreve as credenciais. Confira a API:

   ```bash
   curl -fsS http://127.0.0.1:3101/health
   ```

3. Instale as dependências do app e crie `.env` apenas se ainda não existir. **Edite** esse arquivo para que contenha `EXPO_PUBLIC_API_URL=http://127.0.0.1:3101` (não use `10.0.2.2`, que é exclusivo do emulador):

   ```bash
   npm ci
   test -f .env || cp .env.example .env
   ```

   O `.env` é local e ignorado pelo Git. Não coloque senhas ou tokens em variáveis `EXPO_PUBLIC_*`.

4. Encaminhe as duas portas pelo USB: **3101** para a API e **8083** para o Expo/Metro. Confira os encaminhamentos:

   ```bash
   adb reverse tcp:3101 tcp:3101
   adb reverse tcp:8083 tcp:8083
   adb reverse --list
   ```

5. Reinicie o Metro **depois** de editar `.env` e force o modo Expo Go com conexão local:

   ```bash
   npx expo start --go --localhost --port 8083
   ```

   Com o aparelho conectado, pressione **`a`** no terminal do Expo para abrir o projeto no Android. Alternativamente, abra o **Expo Go no celular** e leia o QR Code mostrado pelo Expo; o endereço local do Metro funciona por causa do encaminhamento da porta 8083. Mantenha o cabo conectado durante a demonstração.

6. Entre com as credenciais fictícias geradas em `.env.demo`; consulte as senhas **somente no arquivo local** (veja o [`README.md`](README.md)). Se perder a conexão após reconectar o cabo, repita `adb devices`, os dois comandos `adb reverse` e reinicie o Metro se a URL da API mudou.

**Limite:** esse procedimento é um roteiro para execução, mas **ainda não foi validado em um aparelho nesta entrega**. Não há APK/App Bundle. Um celular conectado apenas pela mesma Wi-Fi **não** alcança a API padrão em `127.0.0.1:3101`; isso exigiria mudar o binding e revisar o firewall, o que não foi feito.
