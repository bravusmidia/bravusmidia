# Segurança — Bravus Lead

- **Autenticação**: Supabase Auth (senha ≥ 10, confirmação de e-mail, PKCE, MFA TOTP opcional, “sair de todos os dispositivos”). Mensagens de login genéricas contra enumeração de contas.
- **Autorização**: Row Level Security em todas as tabelas. Funções `is_member`, `can_write`, `is_manager`, `is_admin` (security definer, `search_path` fixo). Papéis: owner, admin, manager, seller, viewer. Gatilho impede auto-promoção, atribuição de “owner” pela interface e remoção do último proprietário.
- **Isolamento**: cada organização só acessa as próprias linhas e os próprios arquivos (Storage privado por pasta `org_id/`, URLs assinadas de 2 minutos).
- **Dados financeiros**: pagamento “recebido” exige data, gerente+ e fica registrado com quem confirmou (constraint no banco).
- **WhatsApp**: webhook verifica `X-Hub-Signature-256` (HMAC, comparação em tempo constante), idempotência por id de evento, payload limitado a 1 MB. Token da Meta só em secrets. Envio valida sessão, papel, supressão, consentimento, janela, modelo aprovado, limites por minuto/dia e horário de silêncio no servidor. CORS restrito aos domínios autorizados.
- **Entrada de dados**: validação no cliente e no banco (checks, regex de e-mail/E.164), importação com validação de extensão + MIME, tamanho (10 MB), linhas (20 mil), remoção de caracteres de controle; arquivos nunca são executados.
- **Saída**: React escapa HTML (sem `dangerouslySetInnerHTML`); impressão de proposta escapa todos os campos; CSV protegido contra formula injection.
- **Navegador**: CSP restritiva, `noindex`, `referrer` estrito, HTTPS do GitHub Pages.
- **Auditoria**: gatilho registra criação/alteração/exclusão em leads, clientes, vendas, pagamentos, propostas, equipe, convites, consentimentos, supressão, integrações, automações, etapas e serviços (só campos alterados; sem tokens).
- **Testes**: `supabase/tests/01_rules_and_rls.sql` (26 verificações de regras e acesso) e `tests/rules.test.ts` (19 testes).
- **Dependências**: rode `npm audit` periodicamente; o workflow de deploy roda testes antes de publicar.
