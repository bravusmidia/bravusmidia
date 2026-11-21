// TáFeito — Edge Function "tafeito-notion" (Supabase)
// Lê as bases de dados do Notion que o usuário compartilhou com a integração dele
// e devolve as linhas num formato simples para o app (nome, data, horário, instituição, site, texto).
// O token do Notion vem do próprio aparelho do usuário a cada pedido; nada fica guardado aqui.
// Deixe "Verify JWT" LIGADO: só quem está logado no TáFeito consegue usar.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "apikey, authorization, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { token, acao, base } = await req.json();
    if (!token || !/^(secret_|ntn_)/.test(token)) return json({ erro: "Token do Notion inválido (começa com ntn_ ou secret_)." }, 400);
    if (acao === "bases") {
      const r = await notion(token, "search", { filter: { property: "object", value: "database" }, page_size: 50 });
      return json({ bases: r.results.map((d: any) => ({ id: d.id, nome: texto(d.title) || "Sem título" })) });
    }
    if (acao === "linhas" && base) {
      const itens: any[] = []; let cursor: string | undefined;
      for (let i = 0; i < 6; i++) {
        const r = await notion(token, `databases/${base}/query`, { page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) });
        for (const pg of r.results) {
          const props: Record<string, any> = {};
          for (const [nome, p] of Object.entries(pg.properties || {})) props[nome] = valor(p);
          const lista = Object.entries(props);
          const titulo = lista.find(([, x]) => x.tipo === "title")?.[1].v || "";
          const data = lista.find(([, x]) => x.tipo === "date" && x.v)?.[1].v || "";
          const achar = (re: RegExp, tipos: string[]) => lista.find(([n, x]) => re.test(n) && tipos.includes(x.tipo) && x.v)?.[1].v || "";
          itens.push({
            titulo, data: data.slice(0, 10), horario: data.length > 10 ? data.slice(11, 16) : "",
            instituicao: achar(/univers|institui|escola|banca|organiza|local/i, ["select", "texto", "status"]),
            site: achar(/site|link|url|p[aá]gina/i, ["url", "texto"]) || lista.find(([, x]) => x.tipo === "url" && x.v)?.[1].v || "",
            tipo: achar(/tipo|categoria|tag/i, ["select", "texto", "status"]),
            texto: lista.filter(([, x]) => x.tipo === "texto" && x.v).map(([n, x]) => `${n}: ${x.v}`).join(" · ").slice(0, 400),
            notion: pg.url,
          });
        }
        if (!r.has_more) break; cursor = r.next_cursor;
      }
      return json({ itens });
    }
    return json({ erro: "Ação inválida." }, 400);
  } catch (e) {
    return json({ erro: String((e as Error).message || e) }, 500);
  }
});
