# Bravus Work
**Organize. Execute. Evolua.** Este é o sistema interno de gestão da Bravus Mídia.

O app é leve (PWA, sem framework): roda no navegador e pode ser instalado no celular. Os dados ficam no Supabase, no plano gratuito.
Endereço atual: `https://www.bravusmidia.com.br/work/`

---

## O que o app faz
| Área | Resumo |
|---|---|
| Painel | Prioridades do dia, resumo do mês, quem está online e o tempo online de cada um |
| Clientes | Carteira com clientes online/offline, ticket bronze/prata/ouro, importação de CSV (Metrifiquei), WhatsApp, relatório |
| Financeiro | Mensalidades geradas a partir do contrato (até 2x no mês), status Pago / A receber / Em atraso marcado à mão, despesas |
| Agenda | Rotina Bravus Daily e Weekend, lembretes, feriados e datas comerciais |
| Reuniões | Agenda de reuniões, ticket, funil (Reunião → Proposta → Contrato → Onboarding → Carteira), "Não fecharam" |
| Horários livres | Bloquear, liberar ou abrir horário, **sempre com motivo**, e histórico. Página pública `horarios.html` (o cliente vê só livre/reservado) |
| Contratos | Contrato e proposta da Bravus editáveis, em PDF ou impressos |
| Metas, Conteúdo, Equipe, Alertas, Chat | Metas com contador, calendário editorial, produtividade, notificações (push 20 min antes da reunião) e chat interno |

**Permissões:** o admin (Andrade) mexe em tudo. O perfil comercial (Priscila) vê tudo e adiciona reuniões; só o admin exclui clientes e altera configurações e horários.

---

## Como o código está organizado
```
work/
├── index.html          página do app (com Content-Security-Policy)
├── app.js              GERADO pelo build — não edite à mão
├── src/                código-fonte dividido por área (01-base … 21-inicializacao)
├── build.mjs           junta src/ em app.js e confere a sintaxe
├── styles.css          visual
├── sw.js               service worker (offline + push)
├── vendor/             biblioteca do Supabase guardada no próprio app (sem CDN externo)
├── horarios.html       página pública de horários livres
├── tests/smoke.py      teste automático (todas as telas + fluxo de horários)
├── config.js           URL e chave PÚBLICA do Supabase
└── supabase/           scripts SQL por versão + função send-push
```

## Fluxo para cada nova versão (checklist)
1. Edite o arquivo certo em `src/` (nunca o `app.js` direto).
2. Suba a versão em 4 lugares: `src/01-base.js` (VERSION), `version.json`, `sw.js` (CACHE) e `index.html` (`?v=`). Escreva as novidades em `RELEASE` (`src/14-chat-avisos.js`).
3. `node work/build.mjs` gera o app.js.
4. `python3 work/tests/smoke.py` precisa dar **OK**.
5. Se mudou o banco, crie `supabase/vX.Y-nome.sql` (que possa rodar mais de uma vez) e rode no SQL Editor.
6. Commit e push. O GitHub Actions roda o build e o teste de novo, e o GitHub Pages publica em cerca de 1 minuto.
7. No celular, feche e abra o app. O aviso de versão nova aparece sozinho.

---

## Segurança
- **Nunca** coloque a `service_role` / chave secreta no `config.js` nem em qualquer arquivo do repositório. Ele é **público**.
- A chave `sb_publishable_…` do `config.js` é pública por natureza. Quem protege os dados são as regras RLS do banco: todas as tabelas têm RLS e cada usuário só vê a própria agência.
- Funções internas (alertas, `bw_notify`) não podem ser executadas de fora (veja `v3.6-seguranca.sql`).
- O membro não troca o próprio cargo nem a própria agência. Criar membro, trocar senha e remover membro checam `is_admin()` no servidor.
- Cadastro aberto desligado: em Authentication → Providers → Email, deixe *Allow new users to sign up* **desligado**.
- A página pública `horarios.html` recebe só datas e horários, sem nomes, telefones nem motivos.
- O CSP do `index.html` só permite scripts do próprio site e conexões com `*.supabase.co`.
- Uma vez por mês, abra **Supabase → Advisors → Security** e resolva o que aparecer.

## Banco de dados (Supabase)
Projeto: **bravusmidia Work** (`widrjidmnzhkaofaraov`). Os scripts em `supabase/` vão em ordem de versão. Instalação do zero: `setup-completo.sql`, e depois os `v*.sql` mais novos que ele.
Agendamentos (pg_cron): `bw-tasks` e `bw-reminders` a cada minuto, `bw-daily` às 08:00 de Fortaleza. O push chega ao celular pela função `send-push`, chamada por gatilho na tabela `notifications`.

## Pendências recomendadas
- Passar o app para um repositório **privado** (`bravusmidia/bravus-work`) com o domínio `app.bravusmidia.com.br` (Cloudflare Pages, grátis). Hoje o código fica visível no repositório público do site.
- Mover o funil das reuniões (hoje gravado em `tasks.category` como `pipe:{…}`) para uma coluna própria `pipeline jsonb`.
