# Tutorial rápido — Android

O roteiro completo, com Docker, migrations, seed e solução de problemas, está no [`README.md`](README.md).

## Emulador Android

1. Instale Node.js 24.x, Docker com Compose e o Android Studio.
2. Na raiz do projeto, prepare e suba o backend demo:

   ```bash
   ./scripts/setup-demo.sh # somente na primeira vez; não sobrescreve .env.demo
   docker compose --env-file .env.demo -f compose.demo.yaml build
   docker compose --env-file .env.demo -f compose.demo.yaml up -d db
   docker compose --env-file .env.demo -f compose.demo.yaml run --rm migrate
   docker compose --env-file .env.demo -f compose.demo.yaml run --rm seed
   docker compose --env-file .env.demo -f compose.demo.yaml up -d api
   ```

3. Instale as dependências do app e configure a URL:

   ```bash
   npm ci
   test -f .env || cp .env.example .env
   # Para o emulador, use EXPO_PUBLIC_API_URL=http://10.0.2.2:3101 em .env.
   ```

4. Inicie um AVD no Android Studio e execute:

   ```bash
   npm run android
   ```

5. Entre com o e-mail e a senha fictícios gerados em `.env.demo` (veja a seção de credenciais do README).

## Expo Go no celular Android por QR Code (mesma rede local)

Não é necessário cabo USB nem `adb`. **O celular deve estar na mesma rede local confiável do computador** (o computador pode usar Wi-Fi ou Ethernet). O QR Code conecta o Expo Go ao Metro, mas o app também precisa acessar a API: por padrão ela escuta apenas em `127.0.0.1` e não funciona no celular. A opção abaixo publica a API **somente no IPv4 local do computador**, não em `0.0.0.0`.

1. Instale no celular o **Expo Go compatível com o SDK 58**. Descubra o **IPv4 da interface do computador nessa rede local** (não use `127.0.0.1`, `10.0.2.2`, IP de Docker ou VPN):

   ```bash
   ip -4 addr show
   ```

   Nos passos seguintes, substitua `IP_DO_PC` por esse IPv4. O celular precisa conseguir acessar as portas **3101** (API) e **8083** (Expo/Metro); se houver firewall, permita somente a rede/dispositivo confiável. Não use Wi-Fi pública nem abra essas portas na internet.

2. Na raiz do projeto, gere `.env.demo` **somente se ainda não existir**:

   ```bash
   test -f .env.demo || ./scripts/setup-demo.sh
   ```

   Edite `.env.demo` e acrescente esta linha com o IP real, sem aspas:

   ```dotenv
   DEMO_API_HOST=IP_DO_PC
   ```

   Para uma **primeira instalação**, execute na ordem (migrations e seed são explícitos):

   ```bash
   docker compose --env-file .env.demo -f compose.demo.yaml build
   docker compose --env-file .env.demo -f compose.demo.yaml up -d db
   docker compose --env-file .env.demo -f compose.demo.yaml run --rm migrate
   docker compose --env-file .env.demo -f compose.demo.yaml run --rm seed
   docker compose --env-file .env.demo -f compose.demo.yaml up -d api
   ```

   Se a demo **já estava em execução**, não repita o setup, as migrations ou o seed; aplique a alteração do IP recriando apenas a API (o volume do banco é preservado):

   ```bash
   docker compose --env-file .env.demo -f compose.demo.yaml up -d --no-deps --force-recreate api
   docker compose --env-file .env.demo -f compose.demo.yaml ps api
   ```

   Confirme que a porta aparece publicada em **`IP_DO_PC:3101`**, e não em `0.0.0.0`. Teste `http://IP_DO_PC:3101/health` no navegador **do celular**; o endpoint deve responder antes de abrir o app.

3. Instale as dependências do app e crie `.env` apenas se ainda não existir:

   ```bash
   npm ci
   test -f .env || cp .env.example .env
   ```

   Edite `.env` para conter `EXPO_PUBLIC_API_URL=http://IP_DO_PC:3101`, substituindo `IP_DO_PC` pelo mesmo IPv4. Não use `localhost` ou `10.0.2.2` no celular. Não coloque senha ou token em variáveis `EXPO_PUBLIC_*`.

4. **Reinicie** o Expo depois de alterar `.env` e inicie o Metro no modo LAN/Expo Go:

   ```bash
   npx expo start --go --lan --port 8083
   ```

   Abra o **Expo Go no celular** e escaneie o **QR Code** exibido no terminal. O endereço do QR deve conter o IP local do computador, não `localhost`. Entre com as credenciais fictícias de `.env.demo`; consulte as senhas apenas no arquivo local (veja o [`README.md`](README.md)).

5. Se o QR abrir mas o login falhar, confira o IP em `.env`, o teste `/health` no celular, o firewall e se o Expo foi reiniciado. Redes com isolamento de clientes Wi-Fi podem impedir a comunicação mesmo com o IP correto. Ao terminar, remova `DEMO_API_HOST` de `.env.demo` (ou volte a `127.0.0.1`) e recrie **somente** a API com `docker compose --env-file .env.demo -f compose.demo.yaml up -d --no-deps --force-recreate api` para voltar ao isolamento padrão.

**Limite:** o fluxo por QR Code ainda **não foi validado em um aparelho** nesta entrega. Não há APK/App Bundle. Expor a API à rede local é opcional e deve ser feito apenas durante o teste em rede confiável.
