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

Se precisar de ajuda em qualquer etapa específica, basta perguntar!
