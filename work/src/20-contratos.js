/* =====================================================================
   CONTRATOS & PROPOSTAS (v3.2) — modelos editáveis → PDF / impressão
   Guarda em `documents` (Supabase). Sem a tabela, guarda neste aparelho.
   ===================================================================== */
const DOC_LS = 'bw_docs_v1';
const DOC_TABS = [['contrato', 'Contratos'], ['proposta', 'Propostas']];
const DOC_LOGO = 'img/bravus-logo.jpg';

/* ---------- números por extenso (pt-BR) ---------- */
function porExtenso(n, fem = false) {
  n = Math.floor(Math.abs(+n || 0)); if (!n) return 'zero';
  const U = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const D = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const C = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
  const un = (u, f) => f && u === 1 ? 'uma' : f && u === 2 ? 'duas' : U[u];
  const tri = (x, f) => {
    if (x === 100) return 'cem';
    const c = Math.floor(x / 100), r = x % 100, p = [];
    if (c) p.push(f && c > 1 ? C[c].replace(/os$/, 'as') : C[c]);
    if (r) { if (r < 20) p.push(un(r, f)); else { const d = Math.floor(r / 10), u = r % 10; p.push(D[d] + (u ? ' e ' + un(u, f) : '')); } }
    return p.join(' e ');
  };
  const g = []; for (let x = n; x > 0; x = Math.floor(x / 1000)) g.push(x % 1000);
  const big = [['', ''], ['mil', 'mil'], ['milhão', 'milhões'], ['bilhão', 'bilhões']];
  const parts = [];
  g.forEach((v, i) => { if (!v) return; parts.unshift({ v, s: i === 0 ? tri(v, fem) : i === 1 ? (v === 1 ? 'mil' : tri(v, fem) + ' mil') : tri(v, false) + ' ' + big[i][v === 1 ? 0 : 1] }); });
  return parts.map((p, k) => k === 0 ? p.s : ((k === parts.length - 1 && (p.v < 100 || p.v % 100 === 0)) ? ' e ' : ' ') + p.s).join('');
}
function extensoBRL(v) {
  const t = Math.round((+v || 0) * 100), r = Math.floor(t / 100), c = t % 100; const p = [];
  if (r) p.push(porExtenso(r) + (r >= 1e6 && r % 1e6 === 0 ? ' de' : '') + (r === 1 ? ' real' : ' reais'));
  if (c) p.push(porExtenso(c) + (c === 1 ? ' centavo' : ' centavos'));
  return p.join(' e ') || 'zero real';
}
const nPor = (v, fem) => `${+v || 0} (${porExtenso(+v || 0, fem)})`;
const rPor = v => `${brl(v)} (${extensoBRL(v)})`;

/* ---------- modelos (lidos dos PDFs da Bravus) ---------- */
const docDefaults = () => (S.set && S.set.doc_defaults) || lsGet('bw_doc_defaults', {}) || {};
const CONTRATO_DEF = () => ({
  c_nome: '', c_email: '', c_doc: '', c_tel: '',
  d_nome: 'Francisco Silva Andrade', d_empresa: 'Bravus Mídia - Agência de Marketing Digital LTDA', d_email: 'bravusmidiaoficial@gmail.com', d_doc: '', d_tel: '(85) 9 9122-5865',
  objeto: 'A CONTRATADA prestará serviços de gestão de tráfego pago no Facebook Ads, incluindo configuração das ferramentas necessárias, criação, monitoramento e otimização de campanhas, bem como envio de relatórios periódicos e orientações para produção de anúncios.',
  par1: 'Parágrafo Primeiro. A CONTRATADA executará os serviços acima listados conforme autorização prévia da CONTRATANTE, correndo única e exclusivamente por conta da CONTRATANTE, todos os custos necessários à execução, como: investimento em anúncios, criativos estáticos e vídeos bem como pelo atendimento ao cliente final e qualidade das ofertas anunciadas.',
  mao_obra: 600, plataforma: 600, n_plat: 1,
  verba_txt: 'A verba de mídia será paga de forma parcelada via PIX Parcelado, conforme condições previamente acordadas entre as partes.',
  pix: '85991225865', banco: 'Brasil', pix_nome: 'Francisco Silva Andrade',
  par2: 'Parágrafo Segundo. A CONTRATANTE deverá fornecer os acessos necessários às plataformas para execução dos serviços, sendo vedado o uso desses acessos para qualquer finalidade fora deste contrato.',
  meses: 6, dia: 22, aviso: 7, multa: 30, foro: 'Fortaleza/CE',
  confid: 'A Contratada compromete-se a manter sigilo absoluto sobre todas as informações e documentos recebidos do Contratante, não os divulgando a terceiros sem prévia autorização por escrito.',
  gerais: 'A CONTRATADA não garante resultados específicos (como vendas ou faturamento), pois estes dependem de fatores externos como produto, oferta, atendimento e mercado.\nEste contrato representa o acordo completo entre as partes, não podendo ser alterado sem consentimento por escrito.',
  extra: '', cidade: 'Fortaleza-CE', data: today(),
  ...(docDefaults().contrato || {})
});
const PROPOSTA_DEF = () => ({
  cliente: '', titulo: 'Gestão de Tráfego Pago', n_emp: 2, data: today(), validade: '',
  pacotes: [{ nome: 'PACOTE EXECUTIVO', valor: 1200, desconto: 200, minimo: 700 }, { nome: 'PACOTE EXPANSÃO', valor: 900, desconto: 200, minimo: 700 }],
  pag2: true,
  como: 'O valor das campanhas é pago como crédito/pix diretamente na plataforma de anúncios (Meta Ads), em nome da sua empresa.\nO crédito é consumido conforme a veiculação dos anúncios e pode ser descontado da forma que preferir: diariamente, semanalmente ou de uma só vez.\nEsse valor não fica com a agência: é 100% investido nos anúncios.',
  acomp: 'Relatório de métricas 2 vezes por semana\nEnvio em um grupo VIP exclusivo no WhatsApp, com acompanhamento próximo dos resultados',
  cond_on: true, cond_valor: 200, cond_txt: 'válido para o fechamento das duas empresas', cond_prazo: 'até as 14h', cond_fim: 'da data programada.',
  ...(docDefaults().proposta || {})
});
const DOC_BRAVUS_KEYS = { contrato: ['d_nome', 'd_empresa', 'd_email', 'd_doc', 'd_tel', 'pix', 'banco', 'pix_nome', 'foro', 'cidade'], proposta: ['como', 'acomp'] };

/* ---------- cálculos ---------- */
const empWord = n => n === 1 ? 'uma empresa' : n === 2 ? 'duas empresas' : `${porExtenso(n, true)} empresas`;
function pkgCalc(p, n) {
  const valor = +p.valor || 0, desc = +p.desconto || 0, min = +p.minimo || 0;
  const bruto = valor * n, final = Math.max(0, bruto - desc), camp = min * n;
  return { valor, desc, min, bruto, final, camp, total: final + camp };
}
const contratoTotal = d => (+d.mao_obra || 0) + (+d.plataforma || 0);
const docValue = doc => doc.kind === 'contrato' ? contratoTotal(doc.data || {}) : ((doc.data && doc.data.pacotes || [])[0] ? pkgCalc(doc.data.pacotes[0], Math.max(1, +doc.data.n_emp || 1)).total : 0);
const docTitle = (kind, d) => kind === 'contrato' ? (d.c_nome || 'Contrato sem nome') : (d.cliente || ('Proposta — ' + (d.titulo || '')));

/* ---------- blocos que viram páginas A4 ---------- */
const pTxt = t => String(t || '').split(/\n+/).map(s => s.trim()).filter(Boolean).map(s => `<p>${esc(s)}</p>`).join('');
const kvLine = (l, v) => `<div class="kv"><b>${esc(l)}</b><span>${esc(v) || '&nbsp;'}</span></div>`;
function contratoBlocks(d) {
  const mo = +d.mao_obra || 0, pl = +d.plataforma || 0, np = Math.max(1, +d.n_plat || 1);
  const platTxt = `${nPor(np, true)} plataforma${np > 1 ? 's contempladas' : ' contemplada'} neste contrato`;
  const cl2 = pl > 0
    ? `Cláusula 2ª. Pelos serviços prestados, a CONTRATANTE pagará à CONTRATADA o valor ajustado em contrato de ${rPor(mo)} mensais referentes à mão de obra, acrescidos de ${rPor(pl)} relativos à plataforma, totalizando ${rPor(mo + pl)}, correspondentes a ${platTxt}.`
    : `Cláusula 2ª. Pelos serviços prestados, a CONTRATANTE pagará à CONTRATADA o valor mensal de ${rPor(mo)} referente à mão de obra, correspondente a ${platTxt}.`;
  let s = 0; const out = [];
  const sec = (title, ...paras) => { const ps = paras.filter(Boolean); out.push(`<div><h2 class="ch">${++s}. ${esc(title)}</h2>${ps[0] || ''}</div>`); ps.slice(1).forEach(p => out.push(`<div>${p}</div>`)); };
  out.push(`<div class="ct-head"><h1>CONTRATO DE PRESTAÇÃO DE SERVIÇO</h1><i></i><img src="${DOC_LOGO}" alt="Bravus Mídia"></div>`);
  out.push(`<div class="party"><h3>CONTRATANTE:</h3>${kvLine('Nome:', d.c_nome)}${kvLine('Email:', d.c_email)}<div class="kv2">${kvLine('CPF/CNPJ:', d.c_doc)}${kvLine('Telefone:', d.c_tel)}</div></div>`);
  out.push(`<div class="party"><h3>CONTRATADO:</h3>${kvLine('Nome:', d.d_nome)}${kvLine('Empresa:', d.d_empresa)}${kvLine('E-mail:', d.d_email)}<div class="kv2">${kvLine('CPF/CNPJ:', d.d_doc)}${kvLine('Telefone:', d.d_tel)}</div></div>`);
  sec('OBJETO DO CONTRATO:', pTxt('Cláusula 1ª. ' + (d.objeto || '')), pTxt(d.par1));
  const pix = [['Chave PIX:', d.pix], ['Banco:', d.banco], ['Nome:', d.pix_nome]].filter(x => x[1]);
  sec('VALOR DO CONTRATO:', pTxt(cl2), pTxt(d.verba_txt), pix.length ? `<ul class="pix">${pix.map(([l, v], i) => `<li>${l} ${i === 1 ? esc(v) : `<b>${esc(v)}</b>`}</li>`).join('')}</ul>` : '');
  sec('RESPONSABILIDADES DAS PARTES:', pTxt(d.par2), pTxt('Cláusula 3ª – Prazo, Pagamento e Rescisão'),
    pTxt(`O presente contrato tem duração de ${nPor(d.meses)} ${+d.meses === 1 ? 'mês' : 'meses'}, sendo renovado automaticamente por iguais períodos, salvo manifestação contrária das partes.\nO pagamento será realizado mensalmente via Pix até o dia ${nPor(d.dia)} de cada mês, sendo condição para o início e continuidade dos serviços.`),
    pTxt(`Qualquer das partes poderá rescindir o contrato mediante aviso prévio de ${nPor(d.aviso)} ${+d.aviso === 1 ? 'dia' : 'dias'}. O descumprimento do aviso prévio implicará multa de ${+d.multa || 0}% (${porExtenso(+d.multa || 0)} por cento) do valor mensal.`));
  sec('DO FORO', pTxt(`Fica eleito o foro da comarca de ${d.foro || '—'} para resolver quaisquer questões relacionadas a este contrato.`));
  sec('CONFIDENCIALIDADE:', pTxt(d.confid));
  sec('DISPOSIÇÕES GERAIS:', pTxt(d.gerais));
  if (String(d.extra || '').trim()) sec('CLÁUSULAS ADICIONAIS:', pTxt(d.extra));
  out.push(`<div class="sign"><p class="cdate">${esc(d.cidade || '')}, ${fdateY(d.data)}</p><div class="sg"><div><i></i><b>${esc(d.c_nome || 'Nome da Contratante')}</b><span>CONTRATANTE</span></div><div><i></i><b>${esc(d.d_nome || 'Nome do Contratado')}</b><span>CONTRATADO</span></div></div></div>`);
  return out;
}
function propostaBlocks(d) {
  const n = Math.max(1, +d.n_emp || 1), out = [];
  const allLbl = n === 1 ? 'Valor da gestão' : `Valor das ${empWord(n)}`;
  const campLbl = n === 1 ? 'Total para campanhas' : `Total para as ${empWord(n)}`;
  out.push(`<div class="pp-head"><img src="${DOC_LOGO}" class="pp-logo" alt="Bravus Mídia"><h1>PROPOSTA COMERCIAL — ${esc(d.titulo || '')}${n > 1 ? ` | ${n} Empresas` : ''}</h1>${d.cliente || d.validade ? `<p class="pp-to">${d.cliente ? `Para: <b>${esc(d.cliente)}</b> · ` : ''}${fdateY(d.data)}${d.validade ? ` · válida até ${fdateY(d.validade)}` : ''}</p>` : ''}</div>`);
  (d.pacotes || []).forEach((p, i) => {
    const c = pkgCalc(p, n); const r = (l, v, cls = '') => `<div class="pr ${cls}"><span>${l}</span><b>${v}</b></div>`;
    out.push(`<div class="pkg"><div class="pkg-h">${pad(i + 1)} | ${esc(p.nome || 'PACOTE')}${n > 1 ? ` — ${n} EMPRESAS` : ''}</div><div class="pkg-b">
      <h4>Gestão do tráfego (mão de obra)</h4>
      ${n > 1 ? r('Valor por empresa', brl(c.valor)) : ''}${r(allLbl, brl(c.bruto))}${c.desc ? r('Desconto especial', '– ' + brl(c.desc)) : ''}${c.desc ? r('Valor final da gestão', brl(c.final)) : ''}
      ${c.min ? `<h4>Investimento em campanhas</h4>${r(n > 1 ? 'Mínimo por empresa/campanha' : 'Mínimo para campanhas', brl(c.min))}${n > 1 ? r(campLbl, brl(c.camp)) : ''}` : ''}
      </div><div class="pkg-t"><span>INVESTIMENTO TOTAL</span><b><small>R$</small> ${(c.total).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></div></div>`);
  });
  if (d.pag2) {
    out.push('\f');
    out.push(`<div class="pp-logo2"><img src="${DOC_LOGO}" alt="Bravus Mídia"></div>`);
    const ul = t => `<ul class="sq">${String(t || '').split(/\n+/).map(s => s.trim()).filter(Boolean).map(s => `<li>${esc(s)}</li>`).join('')}</ul>`;
    if (String(d.como || '').trim()) out.push(`<div><h2 class="ph">Como funciona o investimento em campanhas</h2>${ul(d.como)}</div>`);
    if (String(d.acomp || '').trim()) out.push(`<div><h2 class="ph">Acompanhamento e transparência</h2>${ul(d.acomp)}</div>`);
    if (d.cond_on) out.push(`<div class="cond"><h3>Condição especial</h3><p>Desconto de <em>${brl(d.cond_valor)}</em> ${esc(d.cond_txt || '')} <em>${esc(d.cond_prazo || '')}</em> ${esc(d.cond_fim || '')}</p></div>`);
  }
  return out;
}
function docChrome(kind, n) {
  return kind === 'contrato'
    ? `<img class="a4wm" src="${DOC_LOGO}" alt=""><div class="a4b"></div><div class="a4f">Agência Bravus Mídia - Marketing Digital</div>`
    : `<div class="a4bar"></div><div class="a4b"></div><div class="a4f2"><span><b>BRAVUS MÍDIA</b> | Estratégia e performance digital — WhatsApp (85) 99122-5865 — Instagram @bravusmidia.</span><small>Bravus Mídia • ${n}</small></div>`;
}
/* monta as páginas: vai encaixando os blocos e abre página nova quando não cabe */
function docPaginate() {
  const host = $('#docPages'); if (!host || !S.docEdit) return;
  const { kind, data } = S.docEdit; const blocks = kind === 'contrato' ? contratoBlocks(data) : propostaBlocks(data);
  host.innerHTML = ''; let body, n = 0;
  const newPage = () => { n++; const w = document.createElement('div'); w.className = 'a4s'; w.innerHTML = `<div class="a4 a4-${kind}">${docChrome(kind, n)}</div>`; host.appendChild(w); body = w.querySelector('.a4b'); };
  newPage();
  blocks.forEach(b => {
    if (b === '\f') { if (body.children.length) newPage(); return; }
    const t = document.createElement('div'); t.innerHTML = b; const el = t.firstElementChild || t;
    body.appendChild(el);
    if (body.scrollHeight > body.clientHeight + 1 && body.children.length > 1) { body.removeChild(el); newPage(); body.appendChild(el); }
  });
  docScale();
}
function docScale() {
  const host = $('#docPages'); if (!host) return;
  const s = Math.min(1, (host.clientWidth || 794) / 794);
  host.querySelectorAll('.a4s').forEach(w => { w.style.width = 794 * s + 'px'; w.style.height = 1123 * s + 'px'; w.firstElementChild.style.transform = `scale(${s})`; });
}
addEventListener('resize', () => { if (S.route === 'contratos' && S.docEdit) docScale(); });

/* ---------- guardar (Supabase ou aparelho) ---------- */
const docsLocal = () => SUPA && S.docsMissing;
const docsAll = () => (docsLocal() ? lsGet(DOC_LS, []) : S.d.documents || []).slice().sort((a, b) => String(b.updated_at || b.created_at || '').localeCompare(String(a.updated_at || a.created_at || '')));
async function docPut(row) {
  const now = new Date().toISOString();
  if (docsLocal()) {
    const all = lsGet(DOC_LS, []); let r = row.id && all.find(x => x.id === row.id);
    if (r) Object.assign(r, row, { updated_at: now }); else { r = { id: uid(), created_at: now, created_by: S.me.id, ...row, updated_at: now }; all.push(r); }
    lsSet(DOC_LS, all); return r;
  }
  const r = row.id ? await store.update('documents', row.id, { kind: row.kind, client_id: row.client_id || null, title: row.title, data: row.data, updated_at: now })
    : await store.insert('documents', { kind: row.kind, client_id: row.client_id || null, title: row.title, data: row.data });
  await loadAll('documents'); return r;
}
async function docDel(id) {
  if (docsLocal()) { lsSet(DOC_LS, lsGet(DOC_LS, []).filter(x => x.id !== id)); return; }
  await store.remove('documents', id); await loadAll('documents');
}

/* ---------- telas ---------- */
const docKind = () => S.docTab === 'proposta' ? 'proposta' : 'contrato';
V.contratos = () => {
  if (S.docEdit) { setTimeout(docPaginate, 0); return docEditor(); }
  const k = docKind(); const all = docsAll(); const list = all.filter(x => x.kind === k);
  const word = k === 'contrato' ? 'contrato' : 'proposta';
  return head('Contratos', 'Contratos e propostas da Bravus · edite, baixe em PDF e envie ao cliente', `<button class="btn pri" data-act="docNew" data-k="${k}">${ic('plus')}${k === 'contrato' ? 'Novo contrato' : 'Nova proposta'}</button>`) + `
    <div class="tabs" style="margin-bottom:14px">${DOC_TABS.map(([v, l]) => `<button data-act="docTab" data-id="${v}" class="${k === v ? 'on' : ''}">${l} <small>${all.filter(x => x.kind === v).length}</small></button>`).join('')}</div>
    ${docsLocal() ? `<div class="card warnbox" style="margin-bottom:14px">${ic('shield')}<div><b>Salvando só neste aparelho.</b> Para os ${word}s aparecerem também para a equipe, rode no Supabase o script <code>supabase/v3.2-contratos.sql</code> (SQL Editor → New query → Run).</div></div>` : ''}
    <div class="card">
      ${list.length ? `<div class="list">${list.map(x => { const c = x.client_id && client(x.client_id); return `<div class="li"><div class="doc-ic ${x.kind}">${ic('file')}</div><div class="t" data-act="docOpen" data-id="${x.id}" style="cursor:pointer"><b>${esc(x.title || docTitle(x.kind, x.data || {}))}</b><small>${brl(docValue(x))}${x.kind === 'contrato' ? '/mês' : ' (1º pacote)'} · atualizado ${fdateY(String(x.updated_at || x.created_at || '').slice(0, 10))}${x.created_by ? ' · por ' + esc(firstName(x.created_by)) : ''}${c ? ' · ' + esc(c.name) : ''}</small></div>
        <button class="btn sm" data-act="docOpen" data-id="${x.id}">${ic('edit')}Abrir</button><button class="btn sm ic" title="Duplicar" data-act="docDup" data-id="${x.id}">${ic('plus')}</button>${isAdmin() ? `<button class="btn sm ic bad" title="Excluir" data-act="docDelete" data-id="${x.id}">${ic('trash')}</button>` : ''}</div>`; }).join('')}</div>`
      : empty(`Nenhum${k === 'contrato' ? ' contrato' : 'a proposta'} ainda. Toque em “${k === 'contrato' ? 'Novo contrato' : 'Nova proposta'}”: o modelo da Bravus já vem preenchido, é só trocar os dados do cliente e os valores.`)}
    </div>`;
};
function docEditor() {
  const e = S.docEdit, d = e.data, K = e.kind;
  const num = (l, n, v, x = '') => fld(l, n, v, 'number', `step="0.01" min="0" inputmode="decimal" ${x}`);
  const box = (t, inner, open = true) => `<details class="card dsec" ${open ? 'open' : ''}><summary>${t}</summary><div class="f">${inner}</div></details>`;
  const cliSel = `<label class="fl">Puxar dados de um cliente<select name="_client"><option value="">— digitar manualmente —</option>${S.d.clients.slice().sort((a, b) => a.name.localeCompare(b.name)).map(c => `<option value="${c.id}" ${c.id === e.client_id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>`;
  let form;
  if (K === 'contrato') {
    form = box('Contratante (cliente)', `${cliSel}${fld('Nome', 'c_nome', d.c_nome)}${fld('E-mail', 'c_email', d.c_email, 'email')}<div class="grid g2">${fld('CPF/CNPJ', 'c_doc', d.c_doc)}${fld('Telefone', 'c_tel', d.c_tel, 'tel')}</div>`)
      + box('Valores e prazos', `<div class="grid g2">${num('Mão de obra (R$/mês)', 'mao_obra', d.mao_obra)}${num('Plataforma (R$/mês)', 'plataforma', d.plataforma)}</div>
        <p class="note" style="margin:0">Total mensal: <b>${brl(contratoTotal(d))}</b> (${esc(extensoBRL(contratoTotal(d)))})</p>
        <div class="grid g2">${fld('Nº de plataformas', 'n_plat', d.n_plat, 'number', 'min="1" step="1"')}${fld('Duração (meses)', 'meses', d.meses, 'number', 'min="1" step="1"')}${fld('Vencimento (dia do mês)', 'dia', d.dia, 'number', 'min="1" max="31" step="1"')}${fld('Aviso prévio (dias)', 'aviso', d.aviso, 'number', 'min="0" step="1"')}${fld('Multa (%)', 'multa', d.multa, 'number', 'min="0" step="1"')}${fld('Foro', 'foro', d.foro)}</div>
        <div class="grid g2">${fld('Cidade', 'cidade', d.cidade)}${fld('Data', 'data', d.data, 'date')}</div>`)
      + box('Pagamento (PIX)', `<div class="grid g2">${fld('Chave PIX', 'pix', d.pix)}${fld('Banco', 'banco', d.banco)}</div>${fld('Nome do recebedor', 'pix_nome', d.pix_nome)}${area('Verba de mídia', 'verba_txt', d.verba_txt)}`, false)
      + box('Contratado (Bravus)', `${fld('Nome', 'd_nome', d.d_nome)}${fld('Empresa', 'd_empresa', d.d_empresa)}${fld('E-mail', 'd_email', d.d_email, 'email')}<div class="grid g2">${fld('CPF/CNPJ', 'd_doc', d.d_doc)}${fld('Telefone', 'd_tel', d.d_tel, 'tel')}</div>`, !d.d_doc)
      + box('Textos das cláusulas', `${area('Cláusula 1ª — objeto (o serviço)', 'objeto', d.objeto)}${area('Parágrafo Primeiro', 'par1', d.par1)}${area('Parágrafo Segundo', 'par2', d.par2)}${area('Confidencialidade', 'confid', d.confid)}${area('Disposições gerais', 'gerais', d.gerais)}${area('Cláusulas adicionais (opcional — aparece no fim)', 'extra', d.extra)}<p class="note" style="margin:0">As cláusulas de valor e de prazo/rescisão são escritas sozinhas a partir dos campos de “Valores e prazos”, com os valores por extenso.</p>`, false);
  } else {
    const n = Math.max(1, +d.n_emp || 1);
    form = box('Cliente e proposta', `${cliSel}${fld('Cliente (aparece como “Para:”, opcional)', 'cliente', d.cliente)}${fld('Serviço (título)', 'titulo', d.titulo)}<div class="grid g2">${fld('Nº de empresas', 'n_emp', d.n_emp, 'number', 'min="1" max="20" step="1"')}${fld('Data', 'data', d.data, 'date')}</div>${fld('Válida até (opcional)', 'validade', d.validade, 'date')}`)
      + (d.pacotes || []).map((p, i) => { const c = pkgCalc(p, n); return box(`Pacote ${pad(i + 1)} — ${esc(p.nome || '')}`, `${fld('Nome do pacote', `p${i}_nome`, p.nome)}<div class="grid g2">${num('Valor por empresa (R$)', `p${i}_valor`, p.valor)}${num('Desconto (R$)', `p${i}_desconto`, p.desconto)}</div>${num('Investimento mínimo em campanhas por empresa (R$)', `p${i}_minimo`, p.minimo)}
        <p class="note" style="margin:0">Gestão: <b>${brl(c.final)}</b> · campanhas: <b>${brl(c.camp)}</b> · <b style="color:var(--blue2)">total ${brl(c.total)}</b></p>${(d.pacotes || []).length > 1 ? `<button type="button" class="btn sm bad" data-act="docPkgDel" data-i="${i}" style="align-self:flex-start">${ic('trash')}Remover pacote</button>` : ''}`); }).join('')
      + ((d.pacotes || []).length < 4 ? `<button type="button" class="btn" data-act="docPkgAdd" style="margin-bottom:12px">${ic('plus')}Adicionar pacote</button>` : '')
      + box('Página 2 — como funciona', `<label class="sw"><input type="checkbox" name="pag2" ${d.pag2 ? 'checked' : ''}> Incluir a página 2</label>${area('Como funciona o investimento (um item por linha)', 'como', d.como)}${area('Acompanhamento e transparência (um item por linha)', 'acomp', d.acomp)}`, false)
      + box('Condição especial', `<label class="sw"><input type="checkbox" name="cond_on" ${d.cond_on ? 'checked' : ''}> Mostrar condição especial</label>${num('Desconto (R$)', 'cond_valor', d.cond_valor)}${fld('Texto', 'cond_txt', d.cond_txt)}<div class="grid g2">${fld('Prazo (destaque)', 'cond_prazo', d.cond_prazo)}${fld('Final da frase', 'cond_fim', d.cond_fim)}</div>`, false);
  }
  const share = !!(navigator.canShare && window.File);
  return head(e.id ? 'Editar ' + (K === 'contrato' ? 'contrato' : 'proposta') : (K === 'contrato' ? 'Novo contrato' : 'Nova proposta'), esc(docTitle(K, d)), `<button class="btn" data-act="docBack">${ic('left')}Voltar</button>`) + `
    <div class="doc-bar card"><button class="btn pri" data-act="docSave">${ic('check')}Salvar</button><button class="btn ok" data-act="docPdf">${ic('down')}Baixar PDF</button>${share ? `<button class="btn" data-act="docShare">${ic('wa')}Enviar</button>` : ''}<button class="btn" data-act="docPrint">${ic('file')}Imprimir</button><button class="btn mob-only" data-act="docSeePrev">${ic('file')}Ver prévia</button><span class="sp"></span>${isAdmin() ? `<button class="btn sm" data-act="docDefaults" title="Guarda os dados da Bravus (CPF/CNPJ, PIX, foro…) para todo contrato novo">${ic('star')}Salvar dados da Bravus como padrão</button>` : ''}</div>
    <div class="doc-ed"><form id="docForm" class="doc-form" autocomplete="off">${form}</form>
      <div class="doc-prev"><div class="muted small" style="margin-bottom:8px">Prévia · fica igual no PDF</div><div id="docPages"></div></div></div>`;
}
/* lê o formulário para o rascunho (sem perder o que não está na tela) */
function docRead() {
  const f = $('#docForm'); if (!f || !S.docEdit) return;
  const d = JSON.parse(JSON.stringify(S.docEdit.data));
  [...f.elements].forEach(el => {
    if (!el.name || el.name === '_client') return;
    const v = el.type === 'checkbox' ? el.checked : el.type === 'number' ? (el.value === '' ? '' : +el.value) : el.value;
    const m = el.name.match(/^p(\d+)_(\w+)$/);
    if (m) { if (d.pacotes && d.pacotes[+m[1]]) d.pacotes[+m[1]][m[2]] = v; } else d[el.name] = v;
  });
  S.docEdit.data = d;
}
let docT;
document.addEventListener('input', e => {
  if (!e.target.closest || !e.target.closest('#docForm')) return;
  docRead(); S.docEdit.dirty = true; clearTimeout(docT); docT = setTimeout(() => { docPaginate(); docNotes(); }, 180);
});
/* atualiza os totais escritos no formulário sem redesenhar os campos */
function docNotes() {
  const f = $('#docForm'); if (!f || !S.docEdit) return; const d = S.docEdit.data;
  if (S.docEdit.kind === 'contrato') { const p = f.querySelector('[name="plataforma"]'); const n = p && p.closest('.f').querySelector('.note'); if (n) n.innerHTML = `Total mensal: <b>${brl(contratoTotal(d))}</b> (${esc(extensoBRL(contratoTotal(d)))})`; return; }
  const n = Math.max(1, +d.n_emp || 1);
  (d.pacotes || []).forEach((p, i) => { const el = f.querySelector(`[name="p${i}_minimo"]`); const nt = el && el.closest('.f').querySelector('.note'); if (nt) { const c = pkgCalc(p, n); nt.innerHTML = `Gestão: <b>${brl(c.final)}</b> · campanhas: <b>${brl(c.camp)}</b> · <b style="color:var(--blue2)">total ${brl(c.total)}</b>`; } });
}
document.addEventListener('change', e => {
  if (!e.target.closest || !e.target.closest('#docForm') || e.target.name !== '_client') return;
  docRead(); const c = client(e.target.value); S.docEdit.client_id = c ? c.id : null; if (!c) return;
  const d = S.docEdit.data;
  if (S.docEdit.kind === 'contrato') Object.assign(d, { c_nome: c.name || d.c_nome, c_email: c.email || d.c_email, c_tel: c.whatsapp || c.phone || d.c_tel, ...(c.due_day ? { dia: +c.due_day } : {}) });
  else d.cliente = c.name || d.cliente;
  renderView(true); toast('Dados do cliente puxados', c.name, 'ok');
});

/* ---------- PDF / impressão ---------- */
const loadJs = src => new Promise((ok, bad) => { if (document.querySelector(`script[src="${src}"]`)) return ok(); const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => bad(new Error('Sem internet para gerar o PDF. Tente de novo.')); document.head.appendChild(s); });
async function docMakePdf() {
  docRead(); docPaginate();
  await Promise.all([loadJs('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js'), loadJs('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js')]);
  if (document.fonts && document.fonts.ready) await document.fonts.ready;
  const stage = document.createElement('div'); stage.className = 'doc-stage';
  document.querySelectorAll('#docPages .a4').forEach(p => { const c = p.cloneNode(true); c.style.transform = 'none'; stage.appendChild(c); });
  document.body.appendChild(stage);
  try {
    await Promise.all([...stage.querySelectorAll('img')].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; })));
    const pdf = new window.jspdf.jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
    const pages = [...stage.children];
    for (let i = 0; i < pages.length; i++) {
      const cv = await window.html2canvas(pages[i], { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false, width: 794, height: 1123, windowWidth: 794 });
      if (i) pdf.addPage();
      pdf.addImage(cv.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
    }
    return pdf;
  } finally { stage.remove(); }
}
const docFileName = () => { const e = S.docEdit; const nm = (e.kind === 'proposta' ? (e.data.cliente || e.data.titulo || '') : docTitle(e.kind, e.data)).replace(/[\\/:*?"<>|]+/g, '').trim(); return `${e.kind === 'contrato' ? 'Contrato' : 'Proposta'} - ${nm || 'Bravus Mídia'}.pdf`; };
async function docSaveNow(quiet) {
  docRead(); const e = S.docEdit;
  const r = await docPut({ id: e.id, kind: e.kind, client_id: e.client_id, title: docTitle(e.kind, e.data), data: e.data });
  const novo = !e.id; e.id = r && r.id || e.id; e.dirty = false;
  if (novo) log(`Criou ${e.kind === 'contrato' ? 'contrato' : 'proposta'}: ${docTitle(e.kind, e.data)}`, e.client_id || null);
  if (!quiet) toast('Salvo', docTitle(e.kind, e.data), 'ok');
}
Object.assign(A, {
  docTab: d => { S.docTab = d.id; renderView(); },
  docSeePrev: () => { const p = $('.doc-prev'); if (p) p.scrollIntoView({ behavior: 'smooth', block: 'start' }); },
  docNew: d => { const k = d.k === 'proposta' ? 'proposta' : 'contrato'; S.docTab = k; S.docEdit = { kind: k, id: null, client_id: null, data: k === 'contrato' ? CONTRATO_DEF() : PROPOSTA_DEF() }; renderView(); },
  docOpen: d => { const x = docsAll().find(y => y.id === d.id); if (!x) return; const base = x.kind === 'contrato' ? CONTRATO_DEF() : PROPOSTA_DEF(); S.docEdit = { kind: x.kind, id: x.id, client_id: x.client_id, data: { ...base, ...(x.data || {}) } }; renderView(); },
  docDup: async d => { const x = docsAll().find(y => y.id === d.id); if (!x) return; const data = JSON.parse(JSON.stringify(x.data || {})); data.data = today(); S.docEdit = { kind: x.kind, id: null, client_id: x.client_id, data, dirty: true }; renderView(); toast('Cópia criada', 'Altere o que precisar e toque em Salvar.', 'ok'); },
  docDelete: async d => { if (!isAdmin()) return; const x = docsAll().find(y => y.id === d.id); if (!x || !confirm(`Excluir “${x.title}”?`)) return; await docDel(d.id); toast('Excluído', x.title, 'ok'); renderView(true); },
  docBack: () => { if (S.docEdit && S.docEdit.dirty && !confirm('Sair sem salvar as alterações?')) return; S.docEdit = null; renderView(); },
  docSave: async () => { await docSaveNow(); renderView(true); },
  docPkgAdd: () => { docRead(); const p = S.docEdit.data.pacotes = S.docEdit.data.pacotes || []; p.push({ nome: 'NOVO PACOTE', valor: 0, desconto: 0, minimo: 700 }); renderView(true); },
  docPkgDel: d => { docRead(); S.docEdit.data.pacotes.splice(+d.i, 1); renderView(true); },
  docPdf: async (d, el) => { el.disabled = true; const t = el.innerHTML; el.innerHTML = 'Gerando PDF…'; try { await docSaveNow(true); const pdf = await docMakePdf(); pdf.save(docFileName()); toast('PDF baixado', docFileName(), 'ok'); } finally { el.disabled = false; el.innerHTML = t; } },
  docShare: async (d, el) => { el.disabled = true; try { await docSaveNow(true); const pdf = await docMakePdf(); const file = new File([pdf.output('blob')], docFileName(), { type: 'application/pdf' }); if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: docFileName() }).catch(() => {}); else { pdf.save(docFileName()); toast('PDF baixado', 'Este aparelho não envia arquivo direto; anexe o PDF no WhatsApp.', 'ok'); } } finally { el.disabled = false; } },
  docPrint: async () => { docRead(); docPaginate(); if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const area = document.createElement('div'); area.id = 'printArea'; document.querySelectorAll('#docPages .a4').forEach(p => { const c = p.cloneNode(true); c.style.transform = 'none'; area.appendChild(c); });
    document.body.appendChild(area); document.body.classList.add('printing'); const done = () => { document.body.classList.remove('printing'); area.remove(); removeEventListener('afterprint', done); };
    addEventListener('afterprint', done); setTimeout(() => window.print(), 150); setTimeout(() => { if (document.body.classList.contains('printing') && !matchMedia('print').matches) done(); }, 60000); },
  docDefaults: async () => { if (!isAdmin()) return; docRead(); const e = S.docEdit; const cur = docDefaults(); const keep = {}; DOC_BRAVUS_KEYS[e.kind].forEach(k => keep[k] = e.data[k]);
    const next = { ...cur, [e.kind]: { ...(cur[e.kind] || {}), ...keep } }; lsSet('bw_doc_defaults', next);
    try { await store.upsertSettings({ ...S.set, doc_defaults: next }); await loadAll('settings'); } catch {}
    toast('Padrão salvo', `Os próximos ${e.kind === 'contrato' ? 'contratos' : 'propostas'} já vêm com esses dados da Bravus.`, 'ok'); }
});

