# Guia Definitivo: Notificações Push com OneSignal e Median.co

Este guia foi feito para você, que não é programador, conseguir configurar as notificações push no seu aplicativo usando o **OneSignal** (que envia as mensagens) e o **Median.co** (que transforma seu site em um aplicativo de celular).

---

## PASSO 1: Criar e Configurar o OneSignal

O OneSignal é o "carteiro". É ele quem vai entregar as notificações no celular dos seus clientes.

1. **Crie uma conta:**
   * Acesse [https://onesignal.com/](https://onesignal.com/) e crie uma conta gratuita.
   * Faça o login.

2. **Crie um novo App (Aplicativo):**
   * No painel do OneSignal, clique no botão azul **"New App/Website"**.
   * Dê um nome para o seu app (ex: "Agicred App").
   * Escolha a opção **"Web"** (mesmo que vá usar no celular depois, o Median usa a base web para conectar).
   * Clique em **"Next: Configure Your Platform"**.

3. **Configuração Web:**
   * Escolha a opção **"Typical Site"**.
   * Em **"Site Setup"**:
     * **Site Name:** Agicred
     * **Site URL:** Cole a sua URL nova: `https://agicred-rv.netlify.app`
   * Em **"Permission Prompt Setup"**:
     * Clique em "Add a prompt" e escolha "Push Prompt" (isso faz a janelinha de permissão aparecer).
   * Desça até o final e clique em **"Save"**.
   * Na próxima tela, apenas clique em **"Finish"**.

4. **Pegue o seu APP ID (O mais importante!):**
   * No menu superior do OneSignal, clique em **"Settings"** (Configurações).
   * Clique em **"Keys & IDs"**.
   * Você verá um código longo chamado **"OneSignal App ID"** (ex: `1679fb28-2057-4bd7-9058-d8a8f5239cb1`).
   * **Copie esse código.** Você vai precisar dele no Passo 2 e no Passo 3.
   * *Atenção: Copie também a "Rest API Key" e guarde em um bloco de notas, pois o servidor precisará dela para enviar mensagens automáticas.*

---

## PASSO 2: Configurar as Variáveis no seu Sistema

Agora precisamos avisar o seu sistema (código) qual é o seu OneSignal.

1. Vá até as configurações de **Variáveis de Ambiente** (Environment Variables) onde seu sistema está hospedado (ou no arquivo `.env` se for local).
2. Adicione a seguinte variável:
   * **Nome:** `VITE_ONESIGNAL_APP_ID`
   * **Valor:** Cole o "OneSignal App ID" que você copiou no Passo 1.
3. Adicione também a chave da API para o servidor conseguir enviar as mensagens:
   * **Nome:** `ONESIGNAL_REST_API_KEY`
   * **Valor:** Cole a "Rest API Key" que você copiou no Passo 1.
   
*(Nota: O sistema já está programado para ler essas variáveis automaticamente).*

---

## PASSO 3: Configurar o Median.co (Transformar em App)

O Median.co vai pegar o seu site e envelopar ele num aplicativo de verdade (APK para Android ou IPA para iPhone), e ele já tem integração nativa com o OneSignal.

1. **Crie o App no Median:**
   * Acesse [https://median.co/](https://median.co/) e faça login.
   * Clique em **"Create App"**.
   * No campo **"Website URL"**, cole a sua URL: `https://agicred-rv.netlify.app`
   * Dê um nome para o App e clique em "Build".

2. **Ativar o OneSignal dentro do Median:**
   * No menu lateral esquerdo do Median, procure pela seção **"Push Notifications"** (Notificações Push).
   * Clique em **"OneSignal"**.
   * Marque a caixa para ativar (Enable OneSignal).
   * Vai aparecer um campo pedindo o **"OneSignal App ID"**. Cole aquele mesmo código que você copiou no Passo 1.
   * Salve as configurações.

3. **Gerar o Aplicativo:**
   * Vá na aba **"Build"** no menu superior do Median.
   * Clique para gerar o seu aplicativo (Android APK, por exemplo).
   * Baixe o aplicativo e instale no seu celular para testar.

---

## PASSO 4: Como o sistema vai funcionar na prática?

1. **Quando o usuário abrir o App no celular:**
   * O código que já está no seu sistema vai perceber que está rodando dentro do Median.co.
   * Ele vai pedir permissão para enviar notificações (aquela janelinha padrão do celular).
   * Se o usuário aceitar, o sistema vai pegar o "Código do Celular" (Player ID) e salvar no banco de dados (Supabase) na tabela `profiles`, na coluna `push_token`.

2. **Como enviar notificações:**
   * **Manualmente:** Você pode entrar no painel do OneSignal, clicar em "New Message" -> "Push" e enviar uma mensagem para todos que instalaram o app.
   * **Automaticamente (Vencimentos):** O seu servidor já tem uma rota (`/api/trigger-overdue-check`) que roda todos os dias. Quando ela rodar, ela vai olhar quem está com contrato vencido, pegar o `push_token` dessa pessoa no banco de dados, e usar o OneSignal para mandar a mensagem direto para o celular dela.

## Dica de Ouro para Testes
Se você quiser testar se está funcionando antes de esperar um contrato vencer:
1. Instale o app gerado pelo Median no seu celular.
2. Faça login na sua conta do Agicred.
3. Aceite receber notificações.
4. Vá no painel do Supabase, na tabela `profiles`, e veja se a coluna `push_token` foi preenchida com um código longo. Se sim, a integração foi um sucesso absoluto!
