# BRAVUS WORK v1.0
**Organize. Execute. Evolua.** — Sistema de gestão da Bravus Mídia.

App leve (PWA): abre no navegador do computador e instala no celular (Android e iPhone). Sem frameworks pesados, carrega rápido.

---

## O que já funciona

| Módulo | O que faz |
|---|---|
| **Login com PIN de 6 dígitos** | Andrade (administrador) e Priscila (comercial / co-founder). PIN criptografado, bloqueio após 5 erros, bloqueio automático após 15 min sem uso. |
| **Painel** | Entrou no mês, a receber, em atraso, saldo, clientes ativos (x/20), quem está **anunciando agora (online)** e quem está **parado (offline, sem saldo ou com problema)**, campanhas, tarefas, reuniões, publicações, gráfico de entradas x saídas de 6 meses, produtividade da semana e equipe online. |
| **Assistente Bravus** | Lista de prioridades do dia calculada automaticamente (inadimplentes, contas com problema, sem saldo, tarefas atrasadas, CTR baixo, conteúdo para aprovar). Não usa IA paga. |
| **Clientes** | Cadastro completo, serviços (tráfego, social media, site, landing page, automação, mentoria), limite de 20 clientes (ajustável), filtros Online / Offline / Inadimplentes, histórico de atividades, botão de WhatsApp. |
| **Campanhas (Ads Monitor)** | Investimento, alcance, impressões, cliques, CTR, CPC, CPM, leads, CPL, conversões. Registro manual hoje; automático quando a Meta for conectada. |
| **Financeiro** | Gera as mensalidades do mês a partir dos contratos, confirma recebimento (só com confirmação), despesas, saldo, cobrança pelo WhatsApp com mensagem pronta, envio para o Asaas. |
| **Agenda — Bravus Daily** | Rotina diária criada sozinha para Andrade e Priscila, metas com contador (+1/+5), ligações a partir das 12h, **reuniões só a partir das 18h30** (exceção só pelo admin), botão para mandar ao Google Calendar / iPhone / Android. |
| **Bravus Weekend** | Sábado: gravação e planejamento. Domingo: edição, Feed, Stories e programação da semana. |
| **Conteúdo** | Calendário editorial em quadro: Ideia → Gravado → Editado → **Aprovação** → Agendado → Publicado. Nada vai ao ar sem passar pela aprovação. |
| **Chat** | Chat interno em tempo real com quem está online/offline e último acesso. |
| **Equipe** | Produtividade de cada um: hoje, semana, atrasadas, metas e atividades recentes. |
| **Alertas (Bravus Notify)** | Bom dia com a programação, lembrete antes de cada tarefa/reunião, cobranças em -5/-2/0/+1/+5/+10 dias (ajustável), pagamento recebido, conta de anúncios com problema, cliente sem saldo, publicação para aprovar, nova mensagem. |
| **Relatórios** | Relatório por cliente pronto para salvar em PDF e resumo para enviar no WhatsApp. |
| **Boas práticas** | Orientações de Meta Ads, Instagram, WhatsApp Business e LGPD. |
| **Ajustes** | Horários, metas, prazos de cobrança, permissões da Priscila, rotinas, integrações, backup, troca de PIN. |

---

## Passo a passo para colocar no ar (tudo gratuito)

### 1. Banco de dados — Supabase (plano gratuito)
1. Crie uma conta em **supabase.com** → *New project* (região São Paulo).
2. Vá em **SQL Editor → New query**, cole todo o conteúdo de `supabase/schema.sql` e clique em **Run**.
3. Crie a agência e os usuários:
   - **Authentication → Users → Add user**: crie Andrade (seu e-mail) e Priscila, com a **senha = PIN de 6 dígitos**. Marque *Auto confirm*.
   - No **SQL Editor**, rode (troque os e-mails):
     ```sql
     insert into agencies(name) values ('Bravus Mídia') returning id;
     -- copie o id gerado e use abaixo:
     update profiles set agency_id = 'COLE_O_ID', role = 'admin', name = 'Andrade', color = '#2f7bff' where email = 'SEU_EMAIL';
     update profiles set agency_id = 'COLE_O_ID', role = 'comercial', name = 'Priscila', color = '#b44cff' where email = 'EMAIL_DA_PRISCILA';
     insert into settings(agency_id, id, data) values ('COLE_O_ID', 'main', '{}');
     ```
4. **Authentication → Providers → Email**: desligue *Allow new users to sign up* (ninguém de fora cria conta).
5. **Authentication → Policies**: deixe o tamanho mínimo de senha em 6.
6. **Project Settings → API**: copie a *Project URL* e a *anon public key* para o arquivo `config.js`.
   > A *anon key* é pública por natureza; quem protege os dados são as regras RLS do `schema.sql`. **Nunca** coloque a *service_role key* no `config.js`.

### 2. Alertas com o app fechado (opcional, recomendado)
1. **Database → Extensions**: ative `pg_cron`.
2. No SQL Editor:
   ```sql
   select cron.schedule('bw-daily',  '0 11 * * *',   'select bw_daily_alerts()');  -- 08:00 em Fortaleza
   select cron.schedule('bw-tasks',  '*/5 * * * *',  'select bw_task_alerts()');   -- lembretes de tarefas
   ```
3. Push no celular: gere chaves com `npx web-push generate-vapid-keys`, coloque a pública em `config.js` (`VAPID_PUBLIC_KEY`) e as duas nos *secrets* do Supabase (abaixo). Depois crie um **Database Webhook** (tabela `notifications`, evento *Insert*) chamando a função `send-push` com o header `x-webhook-secret`.

### 3. Integrações (funções do servidor)
Instale o Supabase CLI e, na pasta do projeto:
```bash
supabase login
supabase link --project-ref SEU_PROJETO
supabase secrets set META_ACCESS_TOKEN=... ASAAS_API_KEY=... ASAAS_ENV=sandbox ASAAS_WEBHOOK_TOKEN=... \
  VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:bravusmidiaoficial@gmail.com PUSH_WEBHOOK_SECRET=...
supabase functions deploy meta-sync
supabase functions deploy asaas-charge
supabase functions deploy asaas-webhook --no-verify-jwt
supabase functions deploy send-push --no-verify-jwt
```
- **Meta Ads**: no Business Manager, crie um *Usuário do sistema* com permissão `ads_read` nas contas dos clientes e gere o token. No cadastro de cada cliente, preencha o **ID da conta de anúncios** (`act_...`). O botão *Sincronizar Meta* traz campanhas, métricas dos últimos 30 dias, situação da conta e o saldo **somente quando a Meta informa** (saldo pré-pago ou limite de gastos).
- **Asaas**: comece com `ASAAS_ENV=sandbox`. No Asaas, cadastre o webhook apontando para `https://SEU_PROJETO.supabase.co/functions/v1/asaas-webhook` com o mesmo token. Preencha o **ID do cliente no Asaas** (`cus_...`) no cadastro do cliente.

### 4. Publicar em app.bravusmidia.com.br
- **Cloudflare Pages** (recomendado, gratuito): suba a pasta para um repositório no GitHub (`bravusmidia/bravus-work`, **privado**) → Cloudflare Pages → conectar o repo → sem comando de build, pasta de saída `/`. Em *Custom domains*, adicione `app.bravusmidia.com.br` e crie o CNAME no Registro.br conforme o Cloudflare indicar. O arquivo `_headers` já aplica cabeçalhos de segurança.
- Alternativa: GitHub Pages (o arquivo `CNAME` já está pronto).

### 5. Instalar no celular
- **Android (Chrome)**: abrir o site → menu ⋮ → *Instalar app*.
- **iPhone (Safari)**: abrir o site → Compartilhar → *Adicionar à Tela de Início* → abrir pelo ícone BW → Alertas → *Ativar* (no iPhone as notificações só funcionam pelo app instalado).

---

## Segurança
- Regras de acesso no banco (RLS) em todas as tabelas: cada agência só vê os próprios dados; financeiro só para o admin (ou Priscila, se liberado).
- Tokens da Meta, Asaas e WhatsApp ficam **apenas** nos secrets do Supabase.
- Webhooks validados por token; chamadas às funções exigem login da equipe.
- PIN com bloqueio progressivo, sessão bloqueada por inatividade, CSP e cabeçalhos de segurança.
- Instagram: o app **organiza e registra** as ações de seguir/deixar de seguir — nada é automatizado, conforme as regras da plataforma.

## Modo local
Com `config.js` vazio, o app funciona inteiro no aparelho (dados guardados no navegador). Serve para testar e usar já. Ao conectar o Supabase, os dados passam a ficar na nuvem e sincronizados entre você e a Priscila — exporte um backup antes (Ajustes → Backup).

## Próximas etapas
1. **Bravus Client** — área de login para cada cliente ver os próprios resultados (o banco já tem o papel `cliente`).
2. WhatsApp Business Platform (API oficial com modelos aprovados) para cobranças automáticas.
3. Instagram Graph API (seguidores e métricas), RD Station e ClickUp.
4. Conjuntos de anúncios e anúncios individuais no Ads Monitor.
