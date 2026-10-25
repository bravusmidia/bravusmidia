# Instalação do Bravus Lead — passo a passo

## 1. Banco de dados (Supabase) — obrigatório

1. Acesse https://supabase.com → **Start your project** → entre com o Google da Bravus.
2. **New project** → nome `bravus-lead` → crie uma senha forte para o banco (guarde num cofre) → região **South America (São Paulo)** → plano Free.
3. Quando terminar de criar, abra **SQL Editor → New query**:
   - Cole todo o conteúdo de `supabase/migrations/20261025000001_schema.sql` → **Run**.
   - Nova query, cole `supabase/migrations/20261025000002_security_logic.sql` → **Run**.
   - Deve aparecer “Success. No rows returned” nas duas.
4. **Authentication → URL Configuration**:
   - Site URL: `https://www.bravusmidia.com.br/crm/`
   - Redirect URLs: `https://www.bravusmidia.com.br/crm/**`
5. **Authentication → Sign In / Providers → Email**: mantenha *Confirm email* ligado. Em *Password requirements*, mínimo 10 caracteres.
6. **Project Settings → API**: copie a **Project URL** e a chave **anon public**.
   > Nunca use nem compartilhe a chave **service_role**.

## 2. Primeiro acesso

1. Abra https://www.bravusmidia.com.br/crm/
2. Cole a Project URL e a anon key → **Conectar** (uma vez por navegador/aparelho).
3. **Criar conta** → confirme pelo e-mail → **Entrar**.
4. Crie a empresa “Bravus Mídia”. Pronto: funil de 14 etapas, 8 serviços e 8 automações já vêm configurados.
5. Em **Segurança e auditoria**, ative a verificação em duas etapas (MFA).

> Para não precisar colar a URL/chave em cada aparelho: no GitHub, em *Settings → Secrets and variables → Actions → Variables*, crie `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (ambas públicas por design). O próximo deploy já vem conectado.

## 3. Equipe

**Usuários e equipe → Convidar funcionário** → e-mail + papel (ex.: Priscila como Vendedora). Envie o link do CRM; ela cria a conta com **o mesmo e-mail**, confirma e entra direto na equipe. Para tirar o acesso, desmarque “Acesso ativo”.

## 4. WhatsApp — API oficial (opcional, quando quiser enviar/receber pelo CRM)

> Atenção: o número conectado à Cloud API deixa de funcionar no app WhatsApp Business comum, a menos que você use a **coexistência** oferecida pela Meta. Avalie usar um número dedicado.

1. https://developers.facebook.com → **Meus apps → Criar app → Business** → adicione **WhatsApp**.
2. Em WhatsApp → **Configuração da API**: adicione e verifique o número. Anote **Phone Number ID** e **WhatsApp Business Account ID**.
3. Em https://business.facebook.com → Configurações → **Usuários do sistema** → crie um usuário Admin → **Gerar token** (sem expiração) com `whatsapp_business_messaging` e `whatsapp_business_management`.
4. No app da Meta → Configurações → Básico → copie a **Chave secreta do app**.
5. Instale a CLI do Supabase no computador (`npm i -g supabase`), depois, dentro da pasta `bravus-lead-crm`:
   ```bash
   supabase login
   supabase link --project-ref SEU_REF        # o código na URL do projeto
   supabase secrets set WHATSAPP_ACCESS_TOKEN="token-do-passo-3" \
     WHATSAPP_APP_SECRET="chave-do-passo-4" \
     WHATSAPP_VERIFY_TOKEN="invente-uma-frase-longa" \
     ALLOWED_ORIGINS="https://www.bravusmidia.com.br"
   supabase functions deploy whatsapp-webhook --no-verify-jwt
   supabase functions deploy whatsapp-send
   supabase functions deploy whatsapp-admin
   ```
6. Meta → WhatsApp → **Configuração → Webhook**: URL `https://SEU_REF.supabase.co/functions/v1/whatsapp-webhook`, Verify Token = a frase do passo 5 → **Verificar e salvar** → assine o campo **messages**.
7. No CRM → **Integrações**: cole os dois IDs → Salvar → **Verificar conexão** → **Sincronizar modelos** → mude para **Real**.
8. Crie modelos (templates) no WhatsApp Manager, sempre com instrução de saída (“Responda PARAR para não receber mais”).

### Boas práticas para não ter o número restringido
- Só envie modelos para quem deu opt-in, e registre a evidência no CRM.
- Personalize; evite mensagens repetitivas; respeite o horário de silêncio.
- Responda rápido quem escreve (janela de 24h é gratuita para responder).
- Acompanhe a **qualidade do número** em Integrações → Verificar conexão.
- Nenhuma ferramenta garante que o número nunca será restringido — a Meta avalia denúncias e bloqueios dos destinatários.

## 5. Backup e recuperação

- Supabase Free: backup diário automático por 7 dias (Pro: 7 dias + restauração pontual).
- Exportação manual: em Leads/Contatos/Relatórios, botão **Exportar** (CSV).
- Reconstruir o banco do zero: rodar as migrations em um projeto novo e importar os CSVs.
- Interface: cada versão fica no histórico do GitHub; `git revert` desfaz um deploy.
