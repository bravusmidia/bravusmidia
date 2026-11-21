// TáFeito — Edge Function "tafeito-notion" (Supabase): CONECTORES
// • Notion: login com a conta do próprio filho (OAuth). O token fica guardado no servidor, ligado ao usuário do TáFeito.
// • Google Agenda / Outlook / qualquer calendário: endereço iCal (.ics).
// Deixe "Verify JWT" LIGADO. Segredos (Edge Functions → Secrets): NOTION_CLIENT_ID e NOTION_CLIENT_SECRET.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "apikey, authorization, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });
const URL_SB = Deno.env.get("SUPABASE_URL")!;
const adm = createClient(URL_SB, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const CID = Deno.env.get("NOTION_CLIENT_ID") || "";
const CSEC = Deno.env.get("NOTION_CLIENT_SECRET") || "";

async function notion(token: string, caminho: string, corpo: unknown) {
  const r = await fetch("https://api.notion.com/v1/" + caminho, {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
    body: JSON.stringify(corpo ?? {}),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.message || ("Notion respondeu " + r.status));
  return j;
}
const texto = (arr: any[] = []) => arr.map((t) => t.plain_text || "").join("").trim();
function valor(p: any): { tipo: string; v: string } {
  switch (p?.type) {
    case "title": return { tipo: "title", v: texto(p.title) };
    case "rich_text": return { tipo: "texto", v: texto(p.rich_text) };
    case "date": return { tipo: "date", v: p.date?.start || "" };
    case "select": return { tipo: "select", v: p.select?.name || "" };
    case "status": return { tipo: "status", v: p.status?.name || "" };
    case "multi_select": return { tipo: "select", v: (p.multi_select || []).map((x: any) => x.name).join(", ") };
    case "url": return { tipo: "url", v: p.url || "" };
    case "checkbox": return { tipo: "checkbox", v: p.checkbox ? "sim" : "" };
    case "number": return { tipo: "texto", v: p.number == null ? "" : String(p.number) };
    default: return { tipo: p?.type || "", v: "" };
  }
}
function linhaNotion(pg: any) {
  const lista = Object.entries(pg.properties || {}).map(([n, p]) => [n, valor(p)] as [string, { tipo: string; v: string }]);
  const titulo = lista.find(([, x]) => x.tipo === "title")?.[1].v || "";
  const data = lista.find(([, x]) => x.tipo === "date" && x.v)?.[1].v || "";
  const achar = (re: RegExp, tipos: string[]) => lista.find(([n, x]) => re.test(n) && tipos.includes(x.tipo) && x.v)?.[1].v || "";
  return {
    titulo, data: data.slice(0, 10), horario: data.length > 10 ? data.slice(11, 16) : "",
    instituicao: achar(/univers|institui|escola|banca|organiza|local|mat[eé]ria/i, ["select", "texto", "status"]),
    site: achar(/site|link|url|p[aá]gina/i, ["url", "texto"]) || lista.find(([, x]) => x.tipo === "url" && x.v)?.[1].v || "",
    texto: lista.filter(([, x]) => x.tipo === "texto" && x.v).map(([n, x]) => `${n}: ${x.v}`).join(" · ").slice(0, 400),
  };
}
// calendário iCal (.ics): Google Agenda, Outlook, Apple
function lerIcs(ics: string) {
  const linhas = ics.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
  const itens: any[] = []; let ev: any = null;
  const des = (s: string) => s.replace(/\\n/g, " ").replace(/\\,/g, ",").replace(/\;/g, ";").trim();
  for (const l of linhas) {
    if (l === "BEGIN:VEVENT") ev = {};
    else if (l === "END:VEVENT" && ev) { if (ev.titulo) itens.push(ev); ev = null; }
    else if (ev) {
      const i = l.indexOf(":"); if (i < 0) continue;
      const k = l.slice(0, i).split(";")[0], v = l.slice(i + 1);
      if (k === "SUMMARY") ev.titulo = des(v).slice(0, 80);
      else if (k === "DTSTART") {
        const m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2}))?(Z?)/);
        if (m) {
          let d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 12), +(m[5] || 0)));
          if (m[6] === "Z") d = new Date(d.getTime() - 3 * 3600e3); // horário de Brasília
          ev.data = d.toISOString().slice(0, 10); ev.horario = m[4] ? d.toISOString().slice(11, 16) : "";
        }
      } else if (k === "LOCATION") ev.instituicao = des(v).slice(0, 80);
      else if (k === "URL") ev.site = v.trim();
      else if (k === "DESCRIPTION") ev.texto = des(v).slice(0, 400);
    }
  }
  const hoje = new Date(Date.now() - 86400e3).toISOString().slice(0, 10);
  return itens.filter((e) => !e.data || e.data >= hoje).slice(0, 300);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const jwt = (req.headers.get("authorization") || "").replace(/^Bearer /i, "");
    const { data: u } = await adm.auth.getUser(jwt);
    const uid = u?.user?.id;
    if (!uid) return json({ erro: "Faça login no TáFeito." }, 401);
    const corpo = await req.json();
    const { acao } = corpo;
    const salvo = async () => (await adm.from("mok_conectores").select("*").eq("perfil", uid).eq("tipo", "notion").maybeSingle()).data;

    if (acao === "status") {
      const s = await salvo();
      return json({ notion: s ? { conta: s.conta, workspace: s.nome } : null, notion_cliente: CID || null });
    }
    if (acao === "oauth") {
      if (!CID || !CSEC) return json({ erro: "Login do Notion ainda não configurado (falta NOTION_CLIENT_ID e NOTION_CLIENT_SECRET)." }, 400);
      const r = await fetch("https://api.notion.com/v1/oauth/token", {
        method: "POST",
        headers: { Authorization: "Basic " + btoa(CID + ":" + CSEC), "Content-Type": "application/json", "Notion-Version": "2022-06-28" },
        body: JSON.stringify({ grant_type: "authorization_code", code: corpo.code, redirect_uri: corpo.redirect_uri }),
      });
      const j = await r.json();
      if (!r.ok) return json({ erro: j.error_description || j.message || "Notion recusou o login." }, 400);
      const conta = j.owner?.user?.person?.email || j.owner?.user?.name || "";
      await adm.from("mok_conectores").upsert({ perfil: uid, tipo: "notion", token: j.access_token, nome: j.workspace_name || "Notion", conta, criado_em: new Date().toISOString() });
      return json({ ok: true, workspace: j.workspace_name, conta });
    }
    if (acao === "sair") { await adm.from("mok_conectores").delete().eq("perfil", uid).eq("tipo", "notion"); return json({ ok: true }); }
    if (acao === "ical") {
      const url = String(corpo.url || "").trim().replace(/^webcal:/i, "https:");
      if (!/^https:\/\//.test(url)) return json({ erro: "Cole o endereço do calendário (começa com https:// ou webcal://)." }, 400);
      const r = await fetch(url); if (!r.ok) return json({ erro: "Não consegui abrir esse calendário (" + r.status + ")." }, 400);
      const t = await r.text(); if (!t.includes("BEGIN:VCALENDAR")) return json({ erro: "Esse link não é de um calendário iCal (.ics)." }, 400);
      return json({ itens: lerIcs(t) });
    }

    const token = corpo.token && /^(secret_|ntn_)/.test(corpo.token) ? corpo.token : (await salvo())?.token;
    if (!token) return json({ erro: "Notion não conectado. Toque em Entrar com Notion." }, 400);
    if (acao === "bases") {
      const r = await notion(token, "search", { filter: { property: "object", value: "database" }, page_size: 50 });
      return json({ bases: r.results.map((d: any) => ({ id: d.id, nome: texto(d.title) || "Sem título" })) });
    }
    if (acao === "linhas" && corpo.base) {
      const itens: any[] = []; let cursor: string | undefined;
      for (let i = 0; i < 6; i++) {
        const r = await notion(token, `databases/${corpo.base}/query`, { page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) });
        for (const pg of r.results) itens.push(linhaNotion(pg));
        if (!r.has_more) break; cursor = r.next_cursor;
      }
      return json({ itens });
    }
    return json({ erro: "Ação inválida." }, 400);
  } catch (e) {
    return json({ erro: String((e as Error).message || e) }, 500);
  }
});
