// TáFeito — Edge Function "tafeito-drive" (Supabase): ponte com o robô do Google Drive
// O robô (Google Apps Script, na conta do Drive do pai) chama esta função a cada 5 minutos:
//   • "pendentes": imagens novas (com link temporário para baixar) e imagens que mudaram de status/motivo
//   • "feito": grava o id do arquivo no Drive e o status que já foi copiado
//   • "mes": todas as imagens de um mês (para montar o checklist do mês no Drive)
// Deixe "Verify JWT" DESLIGADO. O robô manda o token do Google dele; só a conta listada em mok_drive_cfg.emails é aceita.
import { createClient } from "npm:@supabase/supabase-js@2";

const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });
const adm = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const CAMPOS = "id, filho_id, formato, numero, numero_formato, caminho, nome, status, motivo, criado_em, drive_id, drive_status";
const assinatura = (i: any) => (i.status || "pendente") + "|" + (i.motivo || "");

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ erro: "use POST" }, 405);
  const tok = (req.headers.get("x-google-token") || "").trim();
  const { data: cfg } = await adm.from("mok_drive_cfg").select("emails").eq("id", 1).maybeSingle();
  const permitidos = String(cfg?.emails || "").toLowerCase().split(/[,\s]+/).filter(Boolean);
  if (!tok || !permitidos.length) return json({ erro: "robô não autorizado" }, 401);
  const info = await fetch("https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=" + encodeURIComponent(tok)).then((r) => r.ok ? r.json() : null).catch(() => null);
  const email = String(info?.email || "").toLowerCase();
  if (!email || info?.email_verified === "false" || !permitidos.includes(email)) return json({ erro: "conta do Google não autorizada: " + (email || "?") }, 401);
  let b: any = {};
  try { b = await req.json(); } catch { /* vazio */ }
  const { data: fs } = await adm.from("mok_filhos").select("id, nome");
  const nomes: Record<string, string> = Object.fromEntries((fs || []).map((f: any) => [f.id, f.nome]));
  const vestir = (i: any) => ({ ...i, filho: nomes[i.filho_id] || i.filho_id, assinatura: assinatura(i) });

  if (b.acao === "pendentes") {
    const { data: novas, error } = await adm.from("mok_imagens").select(CAMPOS).is("drive_id", null).order("numero").limit(20);
    if (error) return json({ erro: error.message }, 500);
    const urls: Record<string, string> = {};
    if (novas && novas.length) {
      const { data: s } = await adm.storage.from("mok-imagens").createSignedUrls(novas.map((i: any) => i.caminho), 900);
      (s || []).forEach((x: any) => { if (x.signedUrl) urls[x.path] = x.signedUrl; });
    }
    const { data: todas } = await adm.from("mok_imagens").select(CAMPOS).not("drive_id", "is", null).limit(5000);
    const mudaram = (todas || []).filter((i: any) => i.drive_status !== assinatura(i)).slice(0, 100);
    return json({ novas: (novas || []).map((i: any) => ({ ...vestir(i), url: urls[i.caminho] || null })), mudaram: mudaram.map(vestir) });
  }

  if (b.acao === "feito") {
    let ok = 0;
    for (const it of (b.itens || []).slice(0, 200)) {
      if (!it.id) continue;
      const { error } = await adm.from("mok_imagens").update({ drive_id: it.drive_id, drive_status: it.assinatura, drive_em: new Date().toISOString() }).eq("id", it.id);
      if (!error) ok++;
    }
    return json({ ok });
  }

  if (b.acao === "mes") {
    // início e fim do mês no horário de Fortaleza (UTC-3)
    const ano = Number(b.ano), mes = Number(b.mes);
    if (!ano || !mes) return json({ erro: "ano/mes" }, 400);
    const ini = new Date(Date.UTC(ano, mes - 1, 1, 3)).toISOString();
    const fim = new Date(Date.UTC(ano, mes, 1, 3)).toISOString();
    const { data, error } = await adm.from("mok_imagens").select(CAMPOS).gte("criado_em", ini).lt("criado_em", fim).order("numero");
    if (error) return json({ erro: error.message }, 500);
    return json({ itens: (data || []).map(vestir) });
  }

  return json({ erro: "ação desconhecida" }, 400);
});
