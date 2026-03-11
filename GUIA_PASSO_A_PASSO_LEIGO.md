# Guia Completo de Integração e Personalização (Passo a Passo)

Este documento foi criado para guiá-lo em todo o processo de configuração do sistema de pagamentos PIX (Mercado Pago) e gerenciamento de usuários (Supabase), além de dicas de layout.

---

## PARTE 1: Configurando o Mercado Pago (Pagamentos)

O Mercado Pago é quem processará o pagamento via PIX.

1.  **Acesse o Painel de Desenvolvedores:**
    *   Vá para: [https://www.mercadopago.com.br/developers/panel](https://www.mercadopago.com.br/developers/panel)
    *   Faça login com sua conta do Mercado Livre/Pago.

2.  **Crie uma Aplicação:**
    *   Clique no botão azul **"Criar aplicação"**.
    *   Dê um nome para o app (ex: "Agicred App").
    *   Em "Qual tipo de solução você quer integrar?", escolha **"Pagamento on-line"**.
    *   Aceite os termos e clique em "Criar aplicação".

3.  **Obtenha as Credenciais (Chaves):**
    *   Na tela da aplicação criada, procure no menu lateral por **"Credenciais de produção"**.
    *   Você verá duas chaves: `Public Key` e `Access Token`.
    *   Copie o **Access Token**. (Ele começa com `APP_USR-...`).
    *   **Guarde este código**, você vai usá-lo na PARTE 3.

4.  **Configure as Notificações (Webhook):**
    *   Isso é crucial para o sistema saber que o pagamento foi aprovado.
    *   No menu lateral, clique em **"Notificações Webhooks"**.
    *   Em **"Modo Produção"**, preencha o campo **URL de produção** com o seguinte endereço:
        `https://<SUA-URL-DO-APP>.run.app/api/webhook/mercadopago`
        *(Substitua `<SUA-URL-DO-APP>` pelo endereço real onde seu site está hospedado. Se estiver testando localmente, precisará de um túnel como ngrok, mas na nuvem use a URL final).*
    *   Em **"Eventos"**, marque a caixa **"Pagamentos"**.
    *   Clique em "Salvar".

---

## PARTE 2: Configurando o Supabase (Banco de Dados)

O Supabase é onde os dados dos usuários são guardados.

1.  **Acesse o Painel do Supabase:**
    *   Vá para o seu projeto no Supabase.

2.  **Obtenha as Chaves de API:**
    *   No menu lateral esquerdo, clique no ícone de engrenagem (**Settings**).
    *   Clique em **"API"**.
    *   Copie a **Project URL** (URL do projeto).
    *   Copie a chave **service_role** (secret).
        *   *Atenção: Existem duas chaves, `anon` e `service_role`. Para o servidor funcionar, precisamos da `service_role`.*

---

## PARTE 3: Conectando Tudo (Variáveis de Ambiente)

Agora você precisa "dizer" ao seu aplicativo quais são essas chaves.

1.  **Onde configurar:**
    *   Se estiver rodando localmente, abra o arquivo `.env` na raiz do projeto.
    *   Se estiver hospedando (ex: Vercel, Google Cloud Run), vá nas configurações de "Environment Variables".

2.  **Adicione as seguintes variáveis:**

```env
# URL do seu projeto Supabase (Copiado na Parte 2)
VITE_SUPABASE_URL=https://seu-projeto.supabase.co

# Chave pública (anon) do Supabase (Copiada na Parte 2)
VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica

# Chave secreta (service_role) do Supabase (Copiada na Parte 2)
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role-secreta

# Token de Acesso do Mercado Pago (Copiado na Parte 1)
MERCADO_PAGO_ACCESS_TOKEN=seu-access-token-mercado-pago

# URL pública da sua aplicação (sem a barra no final)
APP_URL=https://sua-aplicacao.run.app
```

---

## PARTE 4: Dicas de Layout e Personalização

O layout do aplicativo foi construído pensando em simplicidade e modernidade (Glassmorphism). Aqui estão algumas dicas para você, como leigo, entender e pedir alterações se quiser:

### 1. Cores e Identidade Visual
O app usa o sistema **Tailwind CSS**. As cores principais são:
*   **Fundo:** `slate-900` (Cinza escuro/azulado) para dar um ar profissional.
*   **Painéis:** `glass-panel` (Branco translúcido) para criar camadas e profundidade.
*   **Ações Principais:** `violet-600` (Roxo) e `emerald-500` (Verde) para botões de sucesso/dinheiro.

**Dica:** Se quiser mudar a cor dos botões de "Roxo" para "Azul", basta pedir para trocar `violet-600` por `blue-600` no código.

### 2. Ícones
Usamos a biblioteca **Lucide React**. Ela tem ícones para tudo (usuário, dinheiro, calendário).
**Dica:** Se quiser trocar o ícone de "Dinheiro" por um "Saco de Dinheiro", peça para trocar o ícone `Banknote` por `Coins` ou `DollarSign`.

### 3. Textos e Mensagens
Todos os textos estão diretamente no código (`Dashboard.tsx`, `UpgradeModal.tsx`).
**Dica:** Se quiser mudar "UPGRADE PARA PRO" para "SEJA PREMIUM", basta pedir para alterar o texto no arquivo `UpgradeModal.tsx`.

### 4. O Modal de Pagamento (`UpgradeModal.tsx`)
Este modal foi desenhado para passar confiança:
*   **Passo 1 (Formulário):** Pede apenas o necessário (Nome, CPF, Email) para gerar o PIX.
*   **Passo 2 (QR Code):** Mostra o código grande e claro.
*   **Feedback:** Tem uma animação de "Aguardando confirmação..." que fica pulsando para o usuário saber que o sistema está trabalhando.

---

## Resumo do Fluxo de Sucesso

1.  O usuário clica em **"ATIVAR PRO"**.
2.  Preenche os dados e clica em **"GERAR QR CODE PIX"**.
3.  O app chama o Mercado Pago e mostra o QR Code.
4.  O usuário paga no app do banco dele.
5.  O Mercado Pago avisa seu servidor (via Webhook).
6.  Seu servidor atualiza o banco de dados (Supabase).
7.  A tela do usuário atualiza automaticamente para **"PAGAMENTO CONFIRMADO"**.

---

## PARTE 5: Configurando Notificações Push (Contratos Vencidos)

Para que o aplicativo consiga enviar uma notificação "Push" (aquelas que aparecem no topo do celular) avisando que um contrato venceu, nós utilizamos o **Firebase** do Google.

Como você é leigo, siga este passo a passo com calma. O código do servidor já está pronto para rodar todos os dias às 08:00 da manhã, verificar os contratos vencidos e enviar a notificação. Só precisamos da "Chave" do Firebase.

### Passo 1: Criar um Projeto no Firebase
1. Acesse: [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Faça login com sua conta do Google.
3. Clique em **"Adicionar projeto"** (ou "Criar projeto").
4. Dê um nome (ex: "Agicred Push").
5. Você pode desativar o Google Analytics se quiser (não é obrigatório para notificações).
6. Clique em **"Criar projeto"** e aguarde.

### Passo 2: Gerar a Chave de Serviço (Service Account)
Esta chave é o que permite ao nosso servidor enviar as notificações em seu nome.
1. Dentro do painel do Firebase, clique no ícone de **Engrenagem** (Configurações) no menu lateral esquerdo, ao lado de "Visão geral do projeto".
2. Clique em **"Configurações do projeto"**.
3. Vá até a aba **"Contas de serviço"** (Service accounts).
4. Você verá um botão azul escrito **"Gerar nova chave privada"** (Generate new private key). Clique nele.
5. Um aviso aparecerá. Confirme clicando em **"Gerar chave"**.
6. Um arquivo com final `.json` será baixado para o seu computador.

### Passo 3: Adicionar a Chave ao Aplicativo
O arquivo `.json` que você baixou contém um texto parecido com isso:
`{ "type": "service_account", "project_id": "agicred-push", "private_key": "-----BEGIN PRIVATE KEY-----\n...", ... }`

Você precisa copiar **TODO** o conteúdo desse arquivo e colocar nas variáveis de ambiente do seu sistema.

1. Abra o arquivo `.json` baixado usando o Bloco de Notas (ou qualquer editor de texto).
2. Copie todo o texto que está lá dentro.
3. Vá até as variáveis de ambiente do seu projeto (no arquivo `.env` se for local, ou no painel da sua hospedagem).
4. Crie uma nova variável chamada `FIREBASE_SERVICE_ACCOUNT`.
5. Cole todo o texto do arquivo `.json` como valor dessa variável.

**Exemplo de como deve ficar no seu `.env`:**
```env
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}
```
*(Importante: Cole tudo em uma única linha se possível, ou garanta que o sistema de hospedagem aceite o formato JSON completo).*

### Passo 4: Adicionar a coluna "push_token" no Supabase
Para que o sistema consiga salvar o código do celular do usuário, precisamos adicionar uma nova coluna na tabela `profiles`.

1. Acesse o painel do Supabase.
2. No menu lateral esquerdo, clique em **"Table Editor"** (ícone de tabela).
3. Clique na tabela **`profiles`**.
4. No canto superior direito da tabela, clique no botão **"Insert"** e depois em **"Insert column"** (ou "Add column").
5. Preencha os campos da seguinte forma:
   * **Name:** `push_token`
   * **Type:** `text`
   * Deixe o resto como está (não marque "Is Identity" nem "Is Primary Key").
6. Clique em **"Save"**.

### Como funciona?
* O aplicativo no celular do usuário pede permissão para receber notificações.
* Se ele aceitar, o celular gera um "Token" (um código único do aparelho) e salva no Supabase (na tabela `profiles`).
* Todos os dias às 08:00, o nosso servidor olha no Supabase: *"Tem algum contrato ativo que a data de fim (`end_date`) já passou?"*
* Se tiver, ele muda o status do contrato para `overdue` (vencido) e usa a chave do Firebase para mandar a notificação direto para o celular do usuário dono do contrato.

Se precisar de ajuda em qualquer etapa específica, basta perguntar!
