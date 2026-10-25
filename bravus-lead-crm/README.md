# Bravus Lead — CRM Comercial | Bravus Mídia

CRM comercial da Bravus Mídia: leads, funil Kanban, follow-ups, prospecção, caixa de entrada do WhatsApp (API oficial da Meta), clientes que entram e saem, propostas, vendas, recebimentos, relatórios, automações, equipe e auditoria.

**Online:** https://www.bravusmidia.com.br/crm/

| Camada | Tecnologia |
|---|---|
| Interface | React 18 + TypeScript + Vite + Tailwind CSS (responsivo: celular, tablet, computador e TV; modo claro/escuro) |
| Banco e login | Supabase (PostgreSQL + Auth + Storage + Realtime) com Row Level Security |
| Servidor | Supabase Edge Functions (WhatsApp: webhook, envio, administração) |
| Hospedagem | GitHub Pages (só a interface — banco e funções ficam no Supabase) |

## Como colocar para funcionar (≈ 15 minutos)

Veja o passo a passo completo em [`docs/INSTALACAO.md`](docs/INSTALACAO.md). Resumo:

1. Crie um projeto gratuito em https://supabase.com (região São Paulo).
2. No **SQL Editor**, rode na ordem os arquivos de `supabase/migrations/`.
3. Em **Authentication → URL Configuration**, coloque `https://www.bravusmidia.com.br/crm/` em *Site URL* e em *Redirect URLs*.
4. Abra o CRM, cole a **Project URL** e a **anon key** (Project Settings → API) e crie sua conta.
5. Crie a empresa “Bravus Mídia” — funil, serviços e automações são criados sozinhos.
6. Em **Usuários e equipe**, convide seus funcionários pelo e-mail.

Para conhecer sem configurar nada, use **“Conhecer em modo demonstração”** (dados fictícios, só no seu navegador).

## WhatsApp (API oficial)

Somente a **WhatsApp Business Platform (Cloud API)** oficial. Nada de WhatsApp Web, QR code ou extensões. Regras aplicadas no servidor (`supabase/functions/_shared/policy.ts`):

- Mensagem livre apenas dentro da janela de 24h após o contato escrever.
- Fora da janela: só modelo aprovado pela Meta + consentimento (opt-in) registrado.
- Opt-out automático (PARAR, SAIR, STOP, CANCELAR…) e lista de supressão.
- Sem disparo em massa; limites por minuto/dia; horário de silêncio; sem insistência.
- Modo demonstração nunca envia nada e diz isso claramente.

Configuração: `docs/INSTALACAO.md` → seção WhatsApp.

## Desenvolvimento

```bash
npm install
cp .env.example .env.local   # opcional: fixa a URL/anon key do Supabase
npm run dev                  # http://localhost:5173/crm/
npm test                     # testes de regras (telefone, importação, WhatsApp, métricas)
bash supabase/tests/run_local.sh   # testes do banco e de segurança (requer PostgreSQL local)
npm run build
```

## Deploy

O workflow `.github/workflows/crm-deploy.yml` (na raiz do repositório) roda testes, compila e publica em `/crm` a cada alteração nesta pasta. Rollback: reverter o commit (`git revert`) — o site volta à versão anterior em ~1 minuto. Banco: Supabase faz backup diário automático (Project Settings → Database → Backups).

## Estrutura

```
src/            interface (pages, components, lib)
supabase/
  migrations/   schema, regras, gatilhos, automações, RLS (versionados)
  functions/    Edge Functions do WhatsApp
  tests/        testes SQL de regras e segurança
tests/          testes automatizados (Vitest)
docs/           instalação, segurança, operação
```
