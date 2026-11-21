'use strict';
/* =====================================================================
   MISSÃO OK — tarefas da família com fotos, missões e prêmios
   Desenvolvido por Andrade
   ===================================================================== */
const VERSAO = '2.5.0';
const LIXEIRAS = ['Lixeira da cozinha', 'Lixeira do banheiro', 'Lixeira do quarto'];
const TABELAS = ['config', 'filhos', 'tarefas', 'registros', 'pedidos', 'missoes', 'resgates', 'pagamentos', 'mensagens', 'perfis', 'provas', 'cientes', 'uso', 'avisos', 'imagens'];
const AREAS = { tarefas: 'Tarefas e horários', missoes: 'Missões', premios: 'Prêmios e tempo de tela', perfil: 'Meu perfil (nome)', outro: 'Outro assunto' };
const CATS = { casa: { nome: 'Casa', icone: '🏠' }, trabalho: { nome: 'Work', icone: '💼' } };
// Estudo saiu do app (o filho já cuida disso sozinho): tarefas e missões antigas de estudo ficam ocultas.
const SEM_ESTUDO = { tarefas: t => t.categoria !== 'estudo', missoes: m => !(m.tipo === 'categoria' && m.categoria === 'estudo') };
const PATENTES = ['Recruta', 'Soldado', 'Cabo', '3º Sargento', '2º Sargento', '1º Sargento', 'Suboficial', 'Aspirante', 'Tenente', 'Capitão', 'Major', 'Tenente-Coronel', 'Coronel', 'Brigadeiro'];
const DSEM = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const RRDIA = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const TIPOS_MISSAO = { total: 'Concluir X tarefas', categoria: 'Concluir X tarefas de uma categoria', sequencia: 'X dias seguidos com tudo feito', dias: 'X dias (não precisa ser seguido) com tudo feito' };
const ETAPAS = { '2d': { h: 48, tit: '📚 Prova em 2 dias' }, '1d': { h: 24, tit: '⚠️ Prova AMANHÃ' }, '2h': { h: 2, tit: '🚨 Prova em 2 HORAS' } };
const ICONES = {
  'Casa': ['🛏️','👕','🧺','🧹','🧽','🪣','🧼','🗑️','🍽️','🍳','🥘','🚿','🛁','🚽','🪟','🪑','🛋️','🚪','🧸','📦','👟','🌱','🐶','🐱','🐟','🚗','🧴','🪥','🔌','💡'],
  'Estudo': ['📚','📖','✏️','📝','📐','🧮','🔬','🧪','🌎','🗺️','💻','⌨️','🎓','🧠','📅','🗣️','🇺🇸','🎹','🎸','🎨'],
  'Esporte e saúde': ['🏋️','💪','🏃','🚴','⚽','🏀','🏐','🥊','🥋','🏊','🧘','🤸','🛹','🥗','🍎','💧','😴','🦷','💊','❤️'],
  'Trabalho': ['💼','🖼️','📲','📸','🎬','🖥️','📊','📈','🛒','📣','✂️','🧾','💰','💵','🤝','📧','🔧','🛠️','⚙️','🧰'],
  'Prêmios': ['🏆','🎖️','🥇','⭐','🔥','🎯','🎮','🕹️','🎁','🍕','🍔','🍦','🎉','🚀','👑','💎','🏅','🎟️','📺','🎧']
};
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const CORES = ['#4f7cff', '#f5a524', '#22c55e', '#e649a6', '#14b8a6'];

/* ---------------- utilidades ---------------- */
const $ = (s, el = document) => el.querySelector(s);
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
const hojeISO = (d = new Date()) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const agoraISO = () => new Date().toISOString();
const addDias = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return hojeISO(d); };
const dow = iso => new Date(iso + 'T12:00:00').getDay();
const diaLocal = ts => ts ? hojeISO(new Date(ts)) : '';
const hora = ts => ts ? new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
const dataBR = iso => iso ? iso.slice(0, 10).split('-').reverse().join('/') : '';
const dataHoraBR = ts => ts ? new Date(ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
const minutos = hm => { const [h, m] = (hm || '0:0').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const brl = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const num = v => Number(v || 0);
const horasTxt = h => { h = num(h); const hh = Math.floor(h), mm = Math.round((h - hh) * 60); return mm ? `${hh}h${String(mm).padStart(2, '0')}` : `${hh}h`; };
const b64enc = o => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64dec = s => JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/')))));
const lsGet = (k, d = null) => { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { console.warn(e); } };
const msgErro = e => { const m = (e && (e.message || e.error_description || e.msg)) || String(e); if (/Failed to fetch|NetworkError/i.test(m)) return 'Sem internet. Tente de novo.'; if (/Invalid login/i.test(m)) return 'Senha/PIN incorreto.'; if (/schema cache|Could not find the (function|.*column)|column .* does not exist|relation .*mok_.* does not exist/i.test(m)) return '⚠️ O banco ainda não foi atualizado. Abra bravusmidia.com.br/tafeito/sql.html, copie e rode no Supabase (SQL Editor → Run).'; if (/Email not confirmed/i.test(m)) return 'E-mail não confirmado: no Supabase, desligue "Confirm email" (veja o guia).'; return m; };

/* ---------------- estado ---------------- */
const S = {
  modo: null, papel: null, eu: null, filhoSel: null, tela: null, diaVer: hojeISO(),
  dados: Object.fromEntries(TABELAS.map(t => [t, []])), config: {}, online: new Set(),
  vistos: { ok: false }, abaPedidos: 'novo', calMes: hojeISO().slice(0, 7)
};
let DB = null;
let promptInstalar = null;

const fid = () => S.papel === 'pai' ? S.filhoSel : S.eu;
const filhoAtual = () => S.dados.filhos.find(f => f.id === fid()) || { id: fid(), nome: '—', horas_pc: 0, horas_cel: 0 };
const nomeFilho = id => (S.dados.filhos.find(f => f.id === id) || {}).nome || id;
const deFilho = (t, id = fid()) => S.dados[t].filter(x => x.filho_id === id);
const tarefaPorId = id => S.dados.tarefas.find(t => t.id === id);
const corFilho = id => CORES[(S.dados.filhos.findIndex(f => f.id === id) + 1) % CORES.length] || CORES[1];

/* ===================================================================
   ARMAZENAMENTO — modo demonstração (só neste aparelho)
   =================================================================== */
class LocalStore {
  constructor() {
    this.key = 'mok_demo_db';
    this.fn = null;
    window.addEventListener('storage', e => { if (e.key === this.key && this.fn) this.fn('*'); });
    if (!localStorage.getItem(this.key)) this._semear();
  }
  _load() { return lsGet(this.key, {}) || {}; }
  _save(db) {
    try { localStorage.setItem(this.key, JSON.stringify(db)); }
    catch (e) { // sem espaço: apaga fotos antigas e tenta de novo
      const lim = addDias(hojeISO(), -2);
      (db.registros || []).forEach(r => { if (r.data < lim) { r.foto_antes = r.foto_antes && 'apagada'; r.foto_depois = r.foto_depois && 'apagada'; } });
      localStorage.setItem(this.key, JSON.stringify(db));
    }
  }
  _semear() {
    const db = { config: [{ id: 1, familia: 'demo', semeado: true }], filhos: [
      { id: 'henrique', nome: 'Henrique', ordem: 1, horas_pc: 2, horas_cel: 2, premio_extra: '', exigir_aprovacao: false, criado_em: agoraISO() },
      { id: 'lorenzo', nome: 'Lorenzo', ordem: 2, horas_pc: 1, horas_cel: 1, premio_extra: '', exigir_aprovacao: false, criado_em: agoraISO() }] };
    const s = sementes('henrique');
    db.tarefas = s.tarefas; db.missoes = s.missoes;
    db.mensagens = [{ id: uid(), filho_id: 'henrique', autor: 'pai', texto: 'Bem-vindo ao TáFeito! Faça suas missões e libere o computador. 💪', lido: false, criado_em: agoraISO() }];
    this._save(db);
  }
  async rpc(n, a) {
    if (n === 'mok_meu_perfil') {
      const db = this._load(); const id = S.papel === 'pai' ? null : S.eu;
      if (id) { const f = db.filhos.find(x => x.id === id); if (a.p_foto != null) f.foto = a.p_foto; if (a.p_mascote) f.mascote = a.p_mascote; if (a.p_whatsapp != null) f.whatsapp = a.p_whatsapp.replace(/\D/g, ''); }
      else { const c = db.config[0]; if (a.p_foto != null) c.foto_pai = a.p_foto; if (a.p_whatsapp != null) c.whatsapp_pai = a.p_whatsapp.replace(/\D/g, ''); if (a.p_mascote) c.mascote_pai = a.p_mascote; }
      this._save(db); return null;
    }
    if (n === 'mok_notif_pai') { const db = this._load(); db.config[0].notif_pai_off = a.p_off || []; this._save(db); return null; }
    if (n === 'mok_ciente') { const db = this._load(); db.cientes = db.cientes || []; const pr = (db.provas || []).find(x => x.id === a.p_prova);
      db.cientes.push({ id: Date.now(), filho_id: pr.filho_id, prova_id: pr.id, materia: pr.materia, etapa: a.p_etapa, criado_em: agoraISO() }); this._save(db);
      return db.cientes.filter(c => c.filho_id === pr.filho_id).length; }
    return null;
  }
  async listar(t) { const d = this._load()[t] || []; return t === 'filhos' ? d.sort((a, b) => a.ordem - b.ordem) : d; }
  async salvar(t, row) {
    const db = this._load(); db[t] = db[t] || [];
    const i = db[t].findIndex(r => r.id === row.id);
    if (i >= 0) db[t][i] = { ...db[t][i], ...row }; else db[t].push(row);
    this._save(db); return row;
  }
  async inserir(t, row) { return this.salvar(t, row); }
  async atualizar(t, id, patch) { return this.salvar(t, { id, ...patch }); }
  async remover(t, id) { const db = this._load(); db[t] = (db[t] || []).filter(r => r.id !== id); this._save(db); }
  async enviarFoto(blob) { return await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob); }); }
  assinar(fn) { this.fn = fn; }
  presenca() { }
  async ping() { }
}

/* ===================================================================
   ARMAZENAMENTO — online (Supabase): pai e filhos em aparelhos diferentes
   =================================================================== */
class SupaStore {
  constructor(c) {
    this.c = c;
    this.sb = window.supabase.createClient(c.u, c.k, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'mok-auth' } });
  }
  async listar(t) {
    let q = this.sb.from('mok_' + t).select('*');
    if (t === 'mensagens') q = q.order('criado_em', { ascending: false }).limit(500);
    if (t === 'filhos') q = q.order('ordem');
    if (t === 'cientes') q = q.order('criado_em', { ascending: false }).limit(2000);
    if (t === 'uso') q = q.order('dia', { ascending: false }).limit(400);
    if (t === 'imagens') q = q.order('numero', { ascending: false }).limit(2000);
    if (t === 'avisos') q = q.order('criado_em', { ascending: false }).limit(150);
    const { data, error } = await q;
    if (error) throw error;
    return t === 'mensagens' ? data.reverse() : data;
  }
  async salvar(t, row) {
    const { data, error } = await this.sb.from('mok_' + t).upsert(row).select().single();
    if (error) throw error; return data;
  }
  async inserir(t, row) {
    const { data, error } = await this.sb.from('mok_' + t).insert(row).select().single();
    if (error) throw error; return data;
  }
  async atualizar(t, id, patch) { const { error } = await this.sb.from('mok_' + t).update(patch).eq('id', id); if (error) throw error; }
  async remover(t, id) { const { error } = await this.sb.from('mok_' + t).delete().eq('id', id); if (error) throw error; }
  async enviarFoto(blob) {
    const caminho = `${fid()}/${hojeISO()}/${uid()}.jpg`;
    const { error } = await this.sb.storage.from('mok-fotos').upload(caminho, blob, { contentType: 'image/jpeg', upsert: false });
    if (error) throw error;
    return this.sb.storage.from('mok-fotos').getPublicUrl(caminho).data.publicUrl;
  }
  async rpc(n, a) { const { data, error } = await this.sb.rpc(n, a); if (error) throw error; return data; }
  assinar(fn) {
    this.sb.channel('mok-db').on('postgres_changes', { event: '*', schema: 'public' }, p => {
      if (p.table && p.table.startsWith('mok_')) fn(p.table.slice(4));
    }).subscribe();
  }
  presenca(eu, aoMudar) {
    const ch = this.sb.channel('mok-presenca', { config: { presence: { key: eu } } });
    ch.on('presence', { event: 'sync' }, () => aoMudar(Object.keys(ch.presenceState())))
      .subscribe(async st => { if (st === 'SUBSCRIBED') await ch.track({ eu, em: agoraISO() }); });
    this.pch = ch;
  }
  async ping() { try { await this.rpc('mok_ping'); } catch { } }
}

/* ---------------- tarefas e missões sugeridas ---------------- */
function sementes(filhoId) {
  const criado = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
  const T = (icone, titulo, categoria, horario, extra = {}) => ({
    id: uid(), filho_id: filhoId, icone, titulo, categoria, descricao: '', recorrencia: 'diaria', dias: [], data_unica: null,
    horario, aviso_antes: 30, foto: true, obrigatoria: categoria !== 'trabalho', xp: 10, valor: 0, ativa: true, criado_em: criado, ...extra
  });
  const tarefas = [
    T('🛏️', 'Arrumar o quarto', 'casa', '08:00', { descricao: 'Cama feita, roupas no lugar e nada jogado no chão.' }),
    T('👕', 'Arrumar o guarda-roupa', 'casa', '08:15', { descricao: 'Roupas dobradas e separadas, portas fechando.' }),
    T('🪑', 'Limpar a mesa', 'casa', '08:30', { descricao: 'Mesa limpa e organizada, sem lixo.' }),
    T('↔️', 'Afastar a cama', 'casa', '08:45', { descricao: 'Afastar a cama para varrer embaixo.' }),
    T('🧹', 'Varrer o chão (tudo)', 'casa', '09:00', { descricao: 'Varrer o quarto todo, inclusive embaixo da cama.' }),
    T('🧽', 'Passar pano', 'casa', '09:15', { descricao: 'Pano no chão depois de varrer.' }),
    T('🍽️', 'Lavar a louça', 'casa', '13:00', { descricao: 'Louça lavada, escorrida e pia limpa.' }),
    T('🗑️', 'Tirar o lixo', 'casa', '19:00', { descricao: 'Esvaziar as 3 lixeiras e colocar saco novo. Marque cada uma.', itens: LIXEIRAS.slice() }),
    T('🚿', 'Lavar o banheiro', 'casa', '10:00', { dias: [6], descricao: 'Vaso, pia, box e chão. (Sábado)', xp: 30 }),
    T('🖼️', 'Tarefas de imagem', 'trabalho', '', { recorrencia: 'unica', data_unica: hojeISO(), valor: 10, xp: 20, descricao: 'O pai explica no chat o que fazer.' }),
    T('📲', 'Deixar de seguir perfis no Instagram', 'trabalho', '', { recorrencia: 'unica', data_unica: hojeISO(), valor: 5, xp: 20, descricao: 'Manual, um por um, da lista que o pai passar.' })
  ];
  const M = (icone, titulo, tipo, meta, extra = {}) => ({ id: uid(), filho_id: filhoId, icone, titulo, descricao: '', tipo, meta, categoria: '', premio: '', valor: 0, xp: 50, ativa: true, criado_em: criado, ...extra });
  const missoes = [
    M('🔥', 'Semana de ouro', 'sequencia', 7, { descricao: '7 dias seguidos com todas as tarefas feitas.', premio: '+2h de jogo no fim de semana', valor: 10, xp: 100 }),
    M('🧹', 'Faxineiro de elite', 'categoria', 30, { categoria: 'casa', descricao: '30 tarefas de casa concluídas.', premio: 'Escolher o lanche do sábado', valor: 20, xp: 100 }),
    M('💼', 'Trabalhador', 'categoria', 5, { categoria: 'trabalho', descricao: '5 trabalhos concluídos.', premio: 'Bônus em dinheiro', valor: 15, xp: 80 }),
    M('🎖️', 'Primeira patente', 'total', 20, { descricao: '20 tarefas concluídas no total.', premio: 'Medalha de Cabo', xp: 50 })
  ];
  return { tarefas, missoes };
}

/* ===================================================================
   REGRAS DO JOGO
   =================================================================== */
const regId = (t, dia) => t.recorrencia === 'unica' ? t.id + '_u' : t.id + '_' + dia;
const regDe = (t, dia) => S.dados.registros.find(r => r.id === regId(t, dia));
const ehFeita = r => !!r && (r.status === 'feita' || r.status === 'aprovada');
function ehConcluida(r) {
  if (!r) return false;
  const f = S.dados.filhos.find(x => x.id === r.filho_id);
  return f && f.exigir_aprovacao ? r.status === 'aprovada' : ehFeita(r);
}

function tarefasDoDia(dia, cats, soDiarias = false, filhoId = fid()) {
  const d = dow(dia);
  return S.dados.tarefas.filter(t => t.filho_id === filhoId && t.ativa !== false && (!cats || cats.includes(t.categoria))).filter(t => {
    if (t.recorrencia === 'unica') {
      if (soDiarias) return false;
      const ini = t.data_unica || diaLocal(t.criado_em);
      if (ini > dia) return false;
      const r = regDe(t, dia);
      if (ehFeita(r) && r.feito_em && diaLocal(r.feito_em) < dia) return false;
      return true;
    }
    if (diaLocal(t.criado_em) > dia) return false;
    const dias = t.dias || [];
    return !dias.length || dias.includes(d);
  }).sort((a, b) => (a.horario || '99').localeCompare(b.horario || '99'));
}

function statusDia(dia = hojeISO(), soDiarias = false, filhoId = fid()) {
  const fx = S.dados.filhos.find(x => x.id === filhoId) || {};
  const obr = tarefasDoDia(dia, null, soDiarias, filhoId).filter(t => t.obrigatoria || fx.exigir_todas !== false);
  const feitas = obr.filter(t => ehConcluida(regDe(t, dia))).length;
  return { total: obr.length, feitas, liberado: obr.length > 0 && feitas === obr.length };
}

const concluidos = (filhoId = fid()) => S.dados.registros.filter(r => r.filho_id === filhoId && ehConcluida(r));
const xpTotal = (filhoId = fid()) => concluidos(filhoId).reduce((s, r) => s + num(r.xp), 0) + deFilho('resgates', filhoId).reduce((s, r) => s + num(r.xp), 0);
function nivel(filhoId = fid()) {
  const xp = xpTotal(filhoId); const n = Math.floor(xp / 100);
  return { xp, n: n + 1, patente: PATENTES[Math.min(n, PATENTES.length - 1)], prox: PATENTES[Math.min(n + 1, PATENTES.length - 1)], pct: xp % 100 };
}
function carteira(filhoId = fid()) {
  const ganho = concluidos(filhoId).reduce((s, r) => s + num(r.valor), 0) + deFilho('resgates', filhoId).reduce((s, r) => s + num(r.valor), 0) + deFilho('imagens', filhoId).reduce((s, r) => s + num(r.valor), 0);
  const pago = deFilho('pagamentos', filhoId).reduce((s, p) => s + num(p.valor), 0);
  return { ganho, pago, saldo: ganho - pago };
}
function sequencia(filhoId = fid()) {
  const tars = S.dados.tarefas.filter(t => t.filho_id === filhoId && t.recorrencia !== 'unica');
  if (!tars.length) return 0;
  const inicio = tars.map(t => diaLocal(t.criado_em)).sort()[0];
  let dia = hojeISO(); if (!statusDia(dia, true, filhoId).liberado) dia = addDias(dia, -1);
  let n = 0;
  for (let i = 0; i < 400 && dia >= inicio; i++) {
    const s = statusDia(dia, true, filhoId);
    if (s.total === 0) { dia = addDias(dia, -1); continue; }
    if (!s.liberado) break;
    n++; dia = addDias(dia, -1);
  }
  return n;
}
function progressoMissao(m) {
  const desde = new Date(m.criado_em || 0);
  const regs = concluidos(m.filho_id).filter(r => r.feito_em && new Date(r.feito_em) >= desde);
  if (m.tipo === 'total') return regs.length;
  if (m.tipo === 'categoria') return regs.filter(r => r.categoria === m.categoria).length;
  if (m.tipo === 'sequencia') return sequencia(m.filho_id);
  if (m.tipo === 'dias') {
    let n = 0, dia = diaLocal(m.criado_em) || hojeISO();
    for (let i = 0; i < 400 && dia <= hojeISO(); i++) { if (statusDia(dia, true, m.filho_id).liberado) n++; dia = addDias(dia, 1); }
    return n;
  }
  return 0;
}
const resgatada = m => S.dados.resgates.some(r => r.missao_id === m.id);
const permAtiva = (area, filhoId = S.eu) => S.dados.pedidos.find(p => p.filho_id === filhoId && p.area === area && p.status === 'aprovado' && p.expira_em && new Date(p.expira_em) > new Date());
const pode = area => S.papel === 'pai' || !!permAtiva(area);
const naoLidas = (filhoId = fid()) => S.dados.mensagens.filter(m => m.filho_id === filhoId && !m.lido && m.autor !== (S.papel === 'pai' ? 'pai' : S.eu)).length;
const pedidosPendentes = () => S.dados.pedidos.filter(p => p.status === 'pendente');

/* ===================================================================
   INÍCIO
   =================================================================== */
function lerConexao() {
  const m = location.hash.match(/c=([^&]+)/);
  if (m) {
    try { const o = b64dec(m[1]); if (o.u && o.k) { lsSet('mok_conn', { u: o.u, k: o.k }); localStorage.removeItem('mok_modo'); } } catch (e) { console.warn(e); }
    history.replaceState(null, '', location.pathname + location.search);
  }
  const cfg = window.MISSAO_CONFIG || {};
  if (cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY) return { u: cfg.SUPABASE_URL.trim(), k: cfg.SUPABASE_ANON_KEY.trim() };
  return lsGet('mok_conn');
}

async function iniciar() {
  registrarSW();
  const conn = lerConexao();
  if (conn && conn.u && conn.k) {
    if (!window.supabase) return telaErro('Sem internet', 'Não consegui carregar o app. Verifique a internet e abra de novo.');
    S.modo = 'online';
    DB = new SupaStore(conn);
    const { data } = await DB.sb.auth.getSession();
    if (data.session) return entrarComSessao(data.session.user);
    return telaLogin();
  }
  if (localStorage.getItem('mok_modo') === 'demo') { S.modo = 'local'; DB = new LocalStore(); return telaLoginDemo(); }
  telaBoasVindas();
}

function logoImg(cls = '') { return `<img src="icons/icon-192.png" alt="" class="${cls}">`; }

function telaErro(t, m) {
  $('#app').innerHTML = `<div class="login"><div class="card centro"><h2>${esc(t)}</h2><p class="mut">${esc(m)}</p>
  <button class="btn pri" onclick="location.reload()">Tentar de novo</button></div></div>`;
}

function telaBoasVindas() {
  $('#app').innerHTML = `<div class="login">
    ${logoImg('logo')}<h1>TáFeito</h1>
    <p class="centro mut">Tarefas da família com foto, missões e prêmios.</p>
    <div class="card" style="margin-top:18px">
      <h3>👨 Sou o pai: conectar o app</h3>
      <p class="mut peq">Cole os dados do seu projeto Supabase (Project Settings → API). Só precisa fazer uma vez; depois o app gera o link para os filhos.</p>
      <form data-form="conectar">
        <label class="campo"><span>Project URL</span><input name="u" placeholder="https://xxxx.supabase.co" required inputmode="url" autocomplete="off"></label>
        <label class="campo"><span>Chave anon public</span><input name="k" placeholder="eyJhbGciOi..." required autocomplete="off"></label>
        <button class="btn pri">Conectar</button>
      </form>
    </div>
    <div class="card">
      <h3>🧪 Só quero testar</h3>
      <p class="mut peq">Modo demonstração: funciona na hora, mas os dados ficam só neste aparelho.</p>
      <button class="btn ghost" data-act="modoDemo">Abrir modo demonstração</button>
    </div>
    <p class="rodape">Recebeu o link do seu pai? Abra o link que ele mandou no WhatsApp.<br>Desenvolvido por Andrade</p>
  </div>`;
}

async function telaLogin() {
  $('#app').innerHTML = `<div class="carregando"><div class="spin"></div></div>`;
  let ini;
  try { ini = await DB.rpc('mok_inicio'); }
  catch (e) {
    return $('#app').innerHTML = `<div class="login"><div class="card"><h2>Banco ainda não preparado</h2>
      <p class="mut">Rode o arquivo <b>supabase.sql</b> no SQL Editor do Supabase e abra o app de novo.</p>
      <p class="peq mut">Detalhe: ${esc(msgErro(e))}</p>
      <button class="btn pri" onclick="location.reload()">Tentar de novo</button>
      <button class="btn ghost" style="margin-top:8px" data-act="trocarConexao">Trocar conexão</button></div></div>`;
  }
  S.ini = ini;
  if (!ini.tem_pai) {
    return $('#app').innerHTML = `<div class="login">${logoImg('logo')}<h1>TáFeito</h1>
      <div class="card"><h3>👨 Criar a conta do Pai</h3><p class="mut peq">Só o pai controla tudo: tarefas, prêmios e permissões.</p>
      <form data-form="criarPai">
        <label class="campo"><span>Seu nome</span><input name="nome" value="Pai" required></label>
        <label class="campo"><span>E-mail</span><input name="email" type="email" required autocomplete="email"></label>
        <label class="campo"><span>Senha (mín. 6 caracteres)</span><input name="senha" type="password" minlength="6" required autocomplete="new-password"></label>
        <button class="btn pri">Criar conta e entrar</button>
      </form></div>
      <button class="btn ghost" data-act="trocarConexao">Trocar conexão</button></div>`;
  }
  const pessoas = [`<button class="pessoa" data-act="loginPai"><div class="av" style="background:linear-gradient(135deg,#4f7cff,#7b5cff)">👨</div><div><b>Pai 👑</b><span class="mut peq">Administrador · e-mail e senha</span></div></button>`]
    .concat(ini.filhos.map((f, i) => `<button class="pessoa" data-act="loginFilho" data-id="${esc(f.id)}" data-nome="${esc(f.nome)}">
      <div class="av" style="background:${CORES[(i + 1) % CORES.length]}">${esc(f.nome[0] || '?')}</div>
      <div><b>${esc(f.nome)}</b><span class="mut peq">${ini.com_acesso.includes(f.id) ? 'Entrar com PIN' : 'Acesso ainda não criado'}</span></div></button>`));
  $('#app').innerHTML = `<div class="login">${logoImg('logo')}<h1>TáFeito</h1><p class="centro mut">Quem vai entrar?</p>
    <div class="pessoas">${pessoas.join('')}</div><p class="rodape">Desenvolvido por Andrade · v${VERSAO}</p></div>`;
}

function telaLoginDemo() {
  const filhos = [{ id: 'henrique', nome: 'Henrique' }, { id: 'lorenzo', nome: 'Lorenzo' }];
  const salvos = lsGet('mok_demo_db', {}).filhos || filhos;
  $('#app').innerHTML = `<div class="login">${logoImg('logo')}<h1>TáFeito</h1>
    <p class="centro mut">Quem vai entrar? <span class="tag warn">modo demonstração</span></p>
    <div class="pessoas">
      <button class="pessoa" data-act="demoPai"><div class="av" style="background:linear-gradient(135deg,#4f7cff,#7b5cff)">👨</div><div><b>Pai</b><span class="mut peq">${lsGet('mok_demo_pin') ? 'Entrar com PIN' : 'Criar PIN do pai'}</span></div></button>
      ${salvos.sort((a, b) => (a.ordem || 0) - (b.ordem || 0)).map((f, i) => `<button class="pessoa" data-act="demoFilho" data-id="${esc(f.id)}"><div class="av" style="background:${CORES[(i + 1) % CORES.length]}">${esc(f.nome[0])}</div><div><b>${esc(f.nome)}</b><span class="mut peq">Ver minhas tarefas</span></div></button>`).join('')}
    </div>
    <button class="btn ghost" style="margin-top:18px" data-act="sairDemo">Conectar ao Supabase (uso real)</button>
    <p class="rodape">Desenvolvido por Andrade · v${VERSAO}</p></div>`;
}

async function entrarComSessao(user) {
  $('#app').innerHTML = `<div class="carregando"><div class="spin"></div><p>Entrando…</p></div>`;
  try {
    let { data: perfil, error } = await DB.sb.from('mok_perfis').select('*').eq('id', user.id).maybeSingle();
    if (error) throw error;
    if (!perfil && localStorage.getItem('mok_novo_pai')) {
      await DB.rpc('mok_registrar_pai', { p_nome: localStorage.getItem('mok_novo_pai') });
      localStorage.removeItem('mok_novo_pai');
      ({ data: perfil } = await DB.sb.from('mok_perfis').select('*').eq('id', user.id).maybeSingle());
    }
    if (!perfil) {
      return $('#app').innerHTML = `<div class="login"><div class="card"><h2>Conta sem perfil</h2><p class="mut">Esta conta não está cadastrada no TáFeito.</p><button class="btn pri" data-act="sair">Voltar</button></div></div>`;
    }
    S.papel = perfil.papel; S.eu = perfil.papel === 'pai' ? 'pai' : perfil.filho_id; S.email = user.email || ''; S.meuNome = perfil.nome || '';
    await abrirApp();
  } catch (e) { telaErro('Não consegui entrar', msgErro(e)); }
}

async function abrirApp() {
  await carregarTudo();
  if (S.papel === 'pai' && S.modo === 'online' && S.config && !S.config.semeado) {
    try {
      const alvo = S.dados.filhos.find(f => f.id === 'henrique') || S.dados.filhos[0];
      if (alvo && !deFilho('tarefas', alvo.id).length) {
        const s = sementes(alvo.id);
        for (const t of s.tarefas) await DB.salvar('tarefas', t);
        for (const m of s.missoes) await DB.salvar('missoes', m);
      }
      await DB.salvar('config', { id: 1, familia: S.config.familia, semeado: true });
      await carregarTudo();
    } catch (e) { console.warn('semente', e); }
  }
  S.filhoSel = S.papel === 'pai' ? (lsGet('mok_filho_sel') && S.dados.filhos.some(f => f.id === lsGet('mok_filho_sel')) ? lsGet('mok_filho_sel') : (S.dados.filhos[0] || {}).id) : S.eu;
  S.tela = S.papel === 'pai' ? 'painel' : 'hoje';
  detectarNovidades();
  DB.assinar(aoMudarBanco);
  DB.presenca(S.eu, chaves => { S.online = new Set(chaves); render(); });
  DB.ping(); setInterval(() => { if (document.visibilityState === 'visible') DB.ping(); }, 60000);
  if (S.papel === 'pai' && S.modo === 'online') setInterval(recarregarUso, 60000);
  setInterval(checarProvas, 30000); setTimeout(checarProvas, 3000);
  setInterval(checarLembretes, 30000); setTimeout(checarLembretes, 2500);
  setInterval(() => { if (S.diaVer !== hojeISO() && S.tela !== 'painel') S.diaVer = hojeISO(); render(); }, 60000);
  render();
  verificarPedidosPai();
  inscreverPush(false);
  checarBanco(); cumprimentoDoDia(); concluirLoginNotion(); checarNotif(); setInterval(checarNotif, 60000);
}

async function carregarTudo() {
  const res = await Promise.all(TABELAS.map(t => DB.listar(t).catch(e => { console.warn(t, e); return null; })));
  TABELAS.forEach((t, i) => { if (res[i]) S.dados[t] = SEM_ESTUDO[t] ? res[i].filter(SEM_ESTUDO[t]) : res[i]; });
  S.config = S.dados.config.find(c => c.id == 1) || {};
}

async function checarBanco() {
  if (S.modo !== 'online' || S.papel !== 'pai') return;
  try { const { error } = await DB.sb.from('mok_config').select('foto_pai,whatsapp_pai').limit(1); const r = await DB.sb.from('mok_provas').select('site').limit(1);
    S.bancoVelho = !!(error || r.error); } catch { S.bancoVelho = false; }
  if (S.bancoVelho) render();
}
function avisoBanco() {
  if (!S.bancoVelho) return '';
  return `<div class="aviso bad"><b>⚠️ Banco de dados desatualizado.</b> Provas, foto, mascote, WhatsApp e avisos novos só funcionam depois de atualizar (2 min):<br>
    1) Abra <a href="sql.html" target="_blank" rel="noopener">bravusmidia.com.br/tafeito/sql.html</a> e toque em <b>Copiar tudo</b><br>2) No Supabase do TáFeito: <b>SQL Editor → New query</b> → colar → <b>Run</b><br>3) Volte aqui e aperte Ctrl+F5.</div>`;
}
async function recarregarUso() {
  try { const [p, u] = await Promise.all([DB.listar('perfis'), DB.listar('uso')]); S.dados.perfis = p; S.dados.uso = u; if (S.tela === 'painel' || S.tela === 'estudo') render(); } catch { }
}
let timerRecarga = null;
function aoMudarBanco() {
  clearTimeout(timerRecarga);
  timerRecarga = setTimeout(async () => { await carregarTudo(); detectarNovidades(); render(); verificarPedidosPai(); }, 300);
}

/* notificações a partir das mudanças (chat, pedidos, tarefas novas, aprovações) */
function detectarNovidades() {
  const V = S.vistos, D = S.dados, primeira = !V.ok;
  V.msgs = V.msgs || new Set(); V.tars = V.tars || new Set(); V.sig = V.sig || {}; V.prv = V.prv || {}; V.mis = V.mis || new Set(); V.ped = V.ped || {}; V.reg = V.reg || {};
  const avisar = (t, c, tag) => { if (!primeira && S.modo !== 'online') notificar(t, c, tag); };
  // modo online: os avisos vêm do servidor (central de notificações) — iguais aos do celular
  V.av = V.av || new Set();
  for (const a of D.avisos || []) {
    if (V.av.has(a.id)) continue; V.av.add(a.id);
    if (!primeira && !a.lido) notificar(a.titulo, a.corpo, 'central');
  }
  for (const m of D.mensagens) {
    if (V.msgs.has(m.id)) continue; V.msgs.add(m.id);
    const deOutro = m.autor !== (S.papel === 'pai' ? 'pai' : S.eu);
    if (deOutro && !(S.chatAberto && m.filho_id === fid())) avisar(`💬 ${m.autor === 'pai' ? 'Pai' : nomeFilho(m.autor)}`, m.texto, 'msg');
  }
  for (const p of D.pedidos) {
    const ant = V.ped[p.id]; V.ped[p.id] = p.status;
    if (S.papel === 'pai' && !ant && p.status === 'pendente') avisar(`🔐 Pedido de ${nomeFilho(p.filho_id)}`, `Quer ajustar: ${AREAS[p.area] || p.area}`, 'ped');
    if (S.papel === 'filho' && ant === 'pendente' && p.status !== 'pendente') avisar(p.status === 'aprovado' ? '✅ Pedido aprovado!' : '❌ Pedido negado', AREAS[p.area] || p.area, 'ped');
  }
  for (const r of D.registros) {
    const ant = V.reg[r.id]; V.reg[r.id] = r.status;
    if (ant === r.status) continue;
    const t = tarefaPorId(r.tarefa_id); const tt = t ? t.titulo : 'tarefa';
    if (S.papel === 'pai' && r.status === 'feita') avisar(`✅ ${nomeFilho(r.filho_id)} concluiu`, tt, 'reg');
    if (S.papel === 'filho' && ant && r.status === 'aprovada') avisar('⭐ Tarefa aprovada pelo pai', tt, 'reg');
    if (S.papel === 'filho' && ant && r.status === 'reprovada') avisar('🔁 O pai pediu para refazer', tt + (r.obs ? ': ' + r.obs : ''), 'reg');
  }
  for (const t of D.tarefas) {
    if (V.tars.has(t.id)) continue; V.tars.add(t.id);
    if (S.papel === 'filho' && t.filho_id === S.eu) avisar(`📋 Nova tarefa: ${t.titulo}`, t.horario ? `Horário: ${t.horario}` : (t.valor > 0 ? `Vale ${brl(t.valor)}` : 'Veja no app'), 'tar');
  }
  const idsTar = new Set(D.tarefas.map(t => t.id));
  for (const t of D.tarefas) {
    const sig = JSON.stringify([t.titulo, t.horario, t.dias, t.descricao, t.ativa, t.itens, t.valor, t.recorrencia, t.data_unica, t.obrigatoria]);
    if (V.sig[t.id] && V.sig[t.id] !== sig && S.papel === 'filho' && t.filho_id === S.eu) avisar(`✏️ Tarefa alterada: ${t.titulo}`, t.horario ? `Horário: ${t.horario}` : 'Veja no app', 'tar');
    V.sig[t.id] = sig;
  }
  for (const id of Object.keys(V.sig)) if (!idsTar.has(id)) { delete V.sig[id]; if (S.papel === 'filho') avisar('🗑️ Uma tarefa foi removida', 'Abra a aba Tarefas', 'tar'); }
  for (const m of D.missoes) { if (V.mis.has(m.id)) continue; V.mis.add(m.id); if (S.papel === 'filho' && m.filho_id === S.eu) avisar(`🎯 Nova missão: ${m.titulo}`, m.premio || 'Veja no app', 'mis'); }
  for (const p of D.provas) {
    const sig = p.materia + p.data + p.horario; const ant = V.prv[p.id]; V.prv[p.id] = sig;
    if (!ant && p.criado_por && p.criado_por !== (S.papel === 'pai' ? 'pai' : S.eu)) avisar(S.papel === 'pai' ? `📚 ${nomeFilho(p.filho_id)} marcou prova` : `📚 Nova prova: ${p.materia}`, `${p.materia} · ${quandoProva(p)}`, 'prova');
    else if (ant && ant !== sig) avisar(`✏️ Prova alterada: ${p.materia}`, quandoProva(p), 'prova');
  }
  V.ok = true;
}

/* ===================================================================
   RENDERIZAÇÃO
   =================================================================== */
function render() {
  if (!S.papel) return;
  const ativo = document.activeElement;
  const foco = ativo && ativo.id && $('#app').contains(ativo) ? { id: ativo.id, v: ativo.value, s: ativo.selectionStart } : null;
  const msgsEl = $('#msgs'); const rolagem = msgsEl ? msgsEl.scrollHeight - msgsEl.scrollTop - msgsEl.clientHeight : 0;

  const telas = S.papel === 'pai'
    ? { painel: telaPainel, tarefas: telaTarefasPai, work: telaWorkPai, estudo: telaEstudo, missoes: telaMissoes, mais: telaMaisPai }
    : { hoje: telaHoje, work: telaWorkFilho, estudo: telaEstudo, missoes: telaMissoes, premios: telaPremios, mais: telaMaisFilho };
  const fn = telas[S.tela] || Object.values(telas)[0];
  $('#app').innerHTML = topo() + (S.papel === 'pai' ? barraFilhos() : '') + `<main>${fn()}</main>` + flutuantes() + nav() + telaBloqueioNotif();
  emoji3d($('#app'));

  if (foco) { const el = document.getElementById(foco.id); if (el) { el.value = foco.v; el.focus(); try { el.setSelectionRange(foco.s, foco.s); } catch { } } }
  const m2 = $('#msgs'); if (m2) m2.scrollTop = rolagem > 80 ? m2.scrollHeight - m2.clientHeight - rolagem : m2.scrollHeight;
  if (S.chatAberto) marcarLidas();
}

function topo() {
  let pres = '';
  if (S.modo === 'local') pres = `<span class="presenca"><span class="tag warn" style="margin:0">demo</span></span>`;
  else if (S.papel === 'filho') {
    const pai = S.dados.perfis.find(p => p.papel === 'pai');
    const on = S.online.has('pai');
    pres = `<span class="presenca"><span class="dot ${on ? 'on' : ''}"></span>Pai ${on ? 'online' : (pai && pai.visto_em ? 'visto ' + hora(pai.visto_em) : 'offline')}</span>`;
  }
  const sub = S.papel === 'pai' ? '👑 Pai · Administrador' : `🔑 ${esc(filhoAtual().nome)} · logado`;
  return `<header class="topo"><div class="marca">${logoImg()}<div>TáFeito<small>${sub}</small></div></div><div class="esp"></div>
    ${promptInstalar ? `<button class="icone-btn" data-act="instalar" title="Instalar">⬇️</button>` : ''}${pres}
    ${S.modo === 'online' ? `<button class="icone-btn sino" data-act="avisos" title="Notificações">🔔${avisosNaoLidos() ? `<span class="badge">${avisosNaoLidos() > 99 ? '99+' : avisosNaoLidos()}</span>` : ''}</button>` : ''}
    <button class="avatar-btn" data-act="meuPerfil" title="Meu perfil">${avatar(S.papel === 'pai' ? 'pai' : S.eu, 36)}</button>
    ${S.papel === 'pai' ? `<button class="icone-btn engrenagem" data-act="ir" data-tela="mais" title="Configurações (só admin)">⚙️${pedidosPendentes().length ? '<span class="badge">' + pedidosPendentes().length + '</span>' : ''}</button>` : ''}</header>`;
}

function barraFilhos() {
  return `<div class="filhos-bar">${S.dados.filhos.map(f => {
    const on = S.online.has(f.id); const nl = naoLidas(f.id); const pp = S.dados.pedidos.filter(p => p.filho_id === f.id && p.status === 'pendente').length;
    return `<button class="chip com-foto ${f.id === S.filhoSel ? 'on' : ''}" data-act="selFilho" data-id="${esc(f.id)}" title="${f.id === S.filhoSel ? 'Toque de novo para editar o perfil' : ''}">
      <span class="av-wrap">${avatar(f.id, 30)}${S.modo === 'online' ? `<span class="dot ${on ? 'on' : ''}"></span>` : ''}</span>${esc(f.nome)}${f.id === S.filhoSel ? '<span class="lapis">✏️</span>' : ''}${nl + pp ? `<span class="badge">${nl + pp}</span>` : ''}</button>`;
  }).join('')}</div>`;
}

function nav() {
  const itens = S.papel === 'pai'
    ? [['painel', '📊', 'Painel'], ['tarefas', '✅', 'Tarefas'], ['work', '💼', 'Work'], ['estudo', '📚', 'Estudo'], ['missoes', '🎯', 'Missões'], ['mais', '⚙️', 'Config']]
    : [['hoje', '✅', 'Tarefas'], ['work', '💼', 'Work'], ['estudo', '📚', 'Estudo'], ['missoes', '🎯', 'Missões'], ['premios', '🏆', 'Prêmios'], ['mais', '👤', 'Perfil']];
  const badge = id => {
    let n = 0;
    if (id === 'chat') n = S.papel === 'pai' ? naoLidas() : naoLidas(S.eu);
    if (id === 'mais' && S.papel === 'pai') n = pedidosPendentes().length;
    if (id === 'estudo') n = provasFuturas().filter(p => corProva(p) === 'vermelho').length;
    if (id === 'missoes') n = deFilho('missoes').filter(m => m.ativa !== false && !resgatada(m) && progressoMissao(m) >= m.meta).length;
    return n ? `<span class="badge">${n}</span>` : '';
  };
  return `<nav class="nav"><div class="nav-in">${itens.map(([id, i, n]) => `<button class="${S.tela === id ? 'on' : ''}" data-act="ir" data-tela="${id}"><span class="i">${i}</span>${n}${badge(id)}</button>`).join('')}</div></nav>`;
}

/* ---------- componentes ---------- */
function cardNivel(filhoId = fid()) {
  const nv = nivel(filhoId); const seq = sequencia(filhoId);
  return `<div class="card destaque"><div class="nivel"><div class="insignia">🎖️</div><div style="flex:1">
    <b>${esc(nv.patente)}</b> <span class="mut peq">· nível ${nv.n}</span>
    <div class="barra ouro" style="margin:6px 0 4px"><i style="width:${nv.pct}%"></i></div>
    <span class="mut peq">${nv.xp} XP · faltam ${100 - nv.pct} XP para ${esc(nv.prox)}</span></div></div>
    <div class="grid3" style="margin-top:12px">
      <div class="stat"><b>🔥 ${seq}</b><span>dias seguidos</span></div>
      <div class="stat"><b>${concluidos(filhoId).length}</b><span>tarefas feitas</span></div>
      <div class="stat"><b>${brl(carteira(filhoId).saldo)}</b><span>a receber</span></div>
    </div></div>`;
}

function cardPremio(dia = hojeISO(), filhoId = fid()) {
  const f = S.dados.filhos.find(x => x.id === filhoId) || {}; const st = statusDia(dia, false, filhoId);
  const pct = st.total ? Math.round(st.feitas / st.total * 100) : 0;
  if (!st.total) return `<div class="premio"><div class="cad">🎮</div><h2>Sem tarefas obrigatórias hoje</h2><p class="mut">Aproveite! Computador e celular conforme o combinado.</p></div>`;
  return `<div class="premio ${st.liberado ? 'liberado' : ''}">
    <div class="cad">${st.liberado ? '🔓' : '🔒'}</div>
    <h2>${st.liberado ? '🎮 LIBERADO PARA JOGAR!' : '🎮 Jogo, computador e celular BLOQUEADOS'}</h2>
    <p style="margin:0;opacity:.85">${st.liberado ? 'Todas as tarefas feitas. Pode usar:' : `Só pode jogar depois de concluir TODAS. Faltam ${st.total - st.feitas} de ${st.total}`}</p>
    ${st.liberado ? '' : `<div class="barra" style="margin:10px 0 0"><i style="width:${pct}%"></i></div>`}
    <div class="horas"><div>💻<b>${horasTxt(f.horas_pc)}</b><span class="peq">computador</span></div><div>📱<b>${horasTxt(f.horas_cel)}</b><span class="peq">celular</span></div></div>
    ${f.premio_extra ? `<p style="margin:12px 0 0">🎁 ${esc(f.premio_extra)}</p>` : ''}
  </div>`;
}

function slotFoto(t, r, tipo, travado, souPai) {
  const url = r && r['foto_' + tipo]; const em = r && r['foto_' + tipo + '_em'];
  const rot = tipo === 'antes' ? 'ANTES' : 'DEPOIS';
  if (url && url !== 'apagada') return `<button class="slot tem" data-act="verFotos" data-reg="${esc(r.id)}"><img src="${esc(url)}" alt="${rot}" loading="lazy"><span class="rot">${rot}</span><span class="hr">${hora(em)}</span></button>`;
  if (url === 'apagada') return `<div class="slot"><span><span class="e">🗑️</span>${rot}: foto antiga apagada</span></div>`;
  if (souPai) return `<div class="slot"><span><span class="e">📷</span>${rot}<br>sem foto</span></div>`;
  const bloqueado = travado || (tipo === 'depois' && !(r && r.foto_antes));
  return `<button class="slot" data-act="foto" data-id="${esc(t.id)}" data-tipo="${tipo}" ${bloqueado ? 'disabled' : ''}><span><span class="e">📷</span>Foto ${rot}${tipo === 'depois' && !(r && r.foto_antes) ? '<br><small>tire a ANTES primeiro</small>' : ''}</span></button>`;
}

function infoTarefa(t) {
  const partes = [];
  if (t.horario) partes.push(`⏰ ${t.horario}${num(t.aviso_antes ?? 30) > 0 ? ` (🔔 ${num(t.aviso_antes ?? 30)} min antes)` : ''}`);
  if (t.recorrencia === 'unica') partes.push(t.data_unica ? `📅 ${dataBR(t.data_unica)}` : 'Única');
  else if ((t.dias || []).length && t.dias.length < 7) partes.push(t.dias.map(d => DSEM[d]).join(', '));
  else partes.push('Todo dia');
  return partes.join(' · ');
}

function cardTarefaFilho(t, dia) {
  const r = regDe(t, dia); const st = r ? r.status : 'pendente';
  const f = filhoAtual(); const feita = ehFeita(r);
  const cls = st === 'reprovada' ? 'bad' : feita ? ((f.exigir_aprovacao && st !== 'aprovada') ? 'espera' : 'ok') : '';
  const fotos = t.foto ? `<div class="fotos">${slotFoto(t, r, 'antes', feita)}${slotFoto(t, r, 'depois', feita)}</div>` : '';
  const its = itensDe(t), marcados = itensMarcados(r);
  const lista = its.length ? `<div class="itens">${its.map((nome, i) => { const ok = marcados.includes(i); return `<button class="item ${ok ? 'ok' : ''}" ${feita ? 'disabled' : `data-act="marcarItem" data-id="${esc(t.id)}" data-i="${i}"`}><span class="cx">${ok ? '✓' : ''}</span>${esc(nome)}</button>`; }).join('')}<div class="mut peq">${marcados.length}/${its.length} marcadas</div></div>` : '';
  let botao;
  if (st === 'reprovada') botao = `<div class="aviso bad">❌ O pai pediu para refazer${r.obs ? ': <b>' + esc(r.obs) + '</b>' : ''}</div><button class="btn" data-act="refazer" data-id="${esc(t.id)}">🔁 Refazer tarefa</button>`;
  else if (feita) botao = `<button class="btn ok" disabled>✅ ${st === 'aprovada' ? 'Aprovada pelo pai' : (f.exigir_aprovacao ? 'Feita · aguardando o pai' : 'Concluída')} <span class="peq">${hora(r.feito_em)}</span></button>`;
  else {
    const fotosOk = !t.foto || (r && r.foto_antes && r.foto_depois);
    const itensOk = marcados.length >= its.length;
    const pronto = fotosOk && itensOk;
    const falta = !fotosOk ? '📷 Tire a foto ANTES e DEPOIS para concluir' : `☑️ Marque as ${its.length - marcados.length} que faltam`;
    botao = `<button class="btn ${pronto ? 'pri' : ''}" data-act="concluir" data-id="${esc(t.id)}" ${pronto ? '' : 'disabled'}>${pronto ? '✔ Marcar como feita' : falta}</button>`;
  }
  return `<div class="tarefa ${cls}"><div class="cab"><div class="em">${esc(t.icone || CATS[t.categoria].icone)}</div>
    <div class="tt"><b>${esc(t.titulo)}</b><small>${infoTarefa(t)}</small>
      <div style="margin-top:4px">${t.valor > 0 ? `<span class="tag din">💰 ${brl(t.valor)}</span>` : ''}<span class="tag">+${t.xp} XP</span>${!t.obrigatoria ? '<span class="tag">opcional</span>' : ''}</div></div>
    ${pode('tarefas') && S.papel === 'filho' ? `<button class="icone-btn" data-act="editarTarefa" data-id="${esc(t.id)}">✏️</button>` : ''}
    <button class="icone-btn" data-act="agendaTarefa" data-id="${esc(t.id)}" title="Pôr na agenda">📅</button></div>
    ${t.descricao ? `<p class="mut peq" style="margin:8px 0 0">${esc(t.descricao)}</p>` : ''}${lista}${fotos}${botao}</div>`;
}

function cardTarefaPai(t, dia) {
  const r = regDe(t, dia); const st = r ? r.status : 'pendente';
  const tag = { pendente: (r && r.foto_antes) ? '<span class="tag warn">em andamento</span>' : '<span class="tag">pendente</span>', feita: '<span class="tag ok">feita</span>', aprovada: '<span class="tag ok">aprovada ⭐</span>', reprovada: '<span class="tag bad">refazer</span>' }[st];
  const cls = st === 'aprovada' || st === 'feita' ? 'ok' : st === 'reprovada' ? 'bad' : '';
  const fotos = t.foto && r && (r.foto_antes || r.foto_depois) ? `<div class="fotos">${slotFoto(t, r, 'antes', true, true)}${slotFoto(t, r, 'depois', true, true)}</div>` : '';
  const its = itensDe(t), mk = itensMarcados(r);
  const lista = its.length ? `<div class="itens">${its.map((nome, i) => `<div class="item ${mk.includes(i) ? 'ok' : ''}"><span class="cx">${mk.includes(i) ? '✓' : ''}</span>${esc(nome)}</div>`).join('')}<div class="mut peq">${mk.length}/${its.length} marcadas</div></div>` : '';
  let acoes = '';
  if (st === 'feita') acoes = `<div class="acoes"><button class="btn ok sm" data-act="aprovar" data-reg="${esc(r.id)}">⭐ Aprovar</button><button class="btn bad sm" data-act="reprovar" data-reg="${esc(r.id)}">🔁 Refazer</button></div>`;
  else if (st === 'aprovada') acoes = `<div class="acoes"><button class="btn ghost sm" data-act="reprovar" data-reg="${esc(r.id)}">Desfazer e pedir para refazer</button></div>`;
  return `<div class="tarefa ${cls}"><div class="cab"><div class="em">${esc(t.icone || CATS[t.categoria].icone)}</div>
    <div class="tt"><b>${esc(t.titulo)}</b><small>${infoTarefa(t)}${r && r.feito_em ? ' · feita às ' + hora(r.feito_em) : ''}</small><div style="margin-top:4px">${tag}${t.valor > 0 ? `<span class="tag din">${brl(t.valor)}</span>` : ''}</div></div></div>
    ${r && r.obs && st === 'reprovada' ? `<div class="aviso bad">Motivo: ${esc(r.obs)}</div>` : ''}${lista}${fotos}${acoes}</div>`;
}

function avisoNotificacao() {
  if (!('Notification' in window) || Notification.permission !== 'default') return '';
  return `<div class="card linha"><span style="font-size:1.6rem">🔔</span><div class="esp"><b>Ativar notificações</b><br><span class="mut peq">Para avisar cada tarefa, mensagem e pedido.</span></div><button class="btn pri sm" data-act="ativarNotif">Ativar</button></div>`;
}

function bannerPermissoes() {
  if (S.papel !== 'filho') return '';
  const ativas = Object.keys(AREAS).map(a => permAtiva(a)).filter(Boolean);
  return ativas.map(p => `<div class="aviso ok">✏️ Edição liberada em <b>${esc(AREAS[p.area])}</b> até ${hora(p.expira_em)}</div>`).join('');
}

/* ---------- telas do FILHO ---------- */
function telaHoje() {
  const dia = hojeISO(); const tars = tarefasDoDia(dia, ['casa']);
  const st = statusDia(dia);
  const casa = tars.filter(t => t.categoria === 'casa');
  const pct = st.total ? Math.round(st.feitas / st.total * 100) : 0;
  return `${avisoNotificacao()}${bannerPermissoes()}${bannerProvas()}${dashTarefas()}
    <div class="card"><div class="linha"><div class="esp"><b>Missões de hoje</b><br><span class="mut peq">${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</span></div><b style="font-size:1.4rem">${st.feitas}/${st.total}</b></div>
    <div class="barra" style="margin-top:10px"><i style="width:${pct}%"></i></div></div>
    ${!tars.length ? `<div class="vazio"><span class="e">🎉</span>Nenhuma tarefa de casa hoje.</div>` : ''}
    ${casa.length ? `<div class="secao">🏠 Casa</div>${casa.map(t => cardTarefaFilho(t, dia)).join('')}` : ''}
    ${pode('tarefas') ? `<button class="btn ghost" data-act="novaTarefa" data-cat="casa">＋ Nova tarefa</button>` : `<button class="btn ghost sm" style="width:100%" data-act="pedir" data-area="tarefas">✋ Pedir permissão para ajustar tarefas</button>`}
    <div class="secao">🏆 Prêmio do dia</div>${cardPremio(dia)}
    <p class="rodape">Desenvolvido por Andrade</p>`;
}

function telaWorkFilho() {
  const dia = hojeISO(); const tars = tarefasDoDia(dia, ['trabalho']); const c = carteira();
  const hist = concluidos().filter(r => num(r.valor) > 0).sort((a, b) => (b.feito_em || '').localeCompare(a.feito_em || '')).slice(0, 15);
  return `${dashWork()}${secaoImagens()}<div class="card destaque"><div class="linha"><div class="esp"><span class="mut peq">Seu saldo a receber</span><h1 style="margin:2px 0">${brl(c.saldo)}</h1><span class="mut peq">Ganho total ${brl(c.ganho)} · já recebido ${brl(c.pago)}</span></div><span style="font-size:2.4rem">💰</span></div></div>
    <div class="secao">💼 Trabalhos</div>
    ${tars.length ? tars.map(t => cardTarefaFilho(t, dia)).join('') : `<div class="vazio"><span class="e">💼</span>Nenhum trabalho agora. O pai coloca novos trabalhos aqui.</div>`}
    ${hist.length ? `<div class="secao">Histórico</div><div class="card">${hist.map(r => `<div class="lista-item"><div class="tt">${esc((tarefaPorId(r.tarefa_id) || {}).titulo || 'Trabalho')}<small>${dataHoraBR(r.feito_em)}</small></div><b>${brl(r.valor)}</b></div>`).join('')}</div>` : ''}`;
}

function telaPremios() {
  const f = filhoAtual(); const res = deFilho('resgates').sort((a, b) => (b.criado_em || '').localeCompare(a.criado_em || ''));
  return `${bannerPermissoes()}${cardPremio()}<div style="height:12px"></div>${cardNivel()}
    ${pode('premios') && S.papel === 'filho' ? `<button class="btn ghost" data-act="editarPremios">✏️ Ajustar prêmios</button>` : `<button class="btn ghost sm" style="width:100%" data-act="pedir" data-area="premios">✋ Pedir para ajustar prêmios</button>`}
    <div class="secao">🎁 Prêmios conquistados</div>
    ${res.length ? `<div class="card">${res.map(r => `<div class="lista-item"><span style="font-size:1.4rem">🏅</span><div class="tt">${esc(r.titulo)}<small>${esc(r.premio || '')} · ${dataBR(diaLocal(r.criado_em))}</small></div>${num(r.valor) ? `<b>${brl(r.valor)}</b>` : ''}</div>`).join('')}</div>` : `<div class="vazio"><span class="e">🎯</span>Complete missões para ganhar prêmios.</div>`}
    <div class="aviso info">💡 ${esc(f.nome)}: o computador e o celular são liberados quando todas as tarefas obrigatórias do dia ficam verdes.</div>`;
}

function telaMaisFilho() {
  const meus = deFilho('pedidos').sort((a, b) => (b.criado_em || '').localeCompare(a.criado_em || '')).slice(0, 20);
  const f = filhoAtual(); const mc = mascoteDe(S.eu);
  return `${bannerPermissoes()}
    <div class="card perfil-topo"><button class="avatar-btn" data-act="meuPerfil">${avatar(S.eu, 84)}</button><div class="esp"><h2 style="margin:0">${esc(f.nome)}</h2><span class="mut peq">Toque na foto para trocar e ajustar</span>
      <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap"><button class="btn pri sm" style="width:auto" data-act="meuPerfil">✏️ Editar perfil</button><button class="btn ghost sm" style="width:auto" data-act="mascoteEditar">🎨 Mascote ${esc(mc.nome)}</button><button class="btn zap sm" style="width:auto" data-act="whats">📲 WhatsApp</button></div></div></div>
    ${cardConta()}
    <div class="grid2" style="margin-bottom:12px"><button class="btn ghost" data-act="conectores">🔌 Conectores</button><button class="btn ghost" data-act="teste">🧪 Teste de lembrete</button></div>
    <div class="card"><h3>✋ Pedir permissão ao pai</h3><p class="mut peq">Para mudar algo no app você precisa da autorização do pai.</p>
    <button class="btn pri" data-act="pedir">Fazer um pedido</button></div>
    ${meus.length ? `<div class="card"><h3>Meus pedidos</h3>${meus.map(p => `<div class="lista-item"><div class="tt">${esc(AREAS[p.area] || p.area)}<small>${esc(p.mensagem || '')} · ${dataHoraBR(p.criado_em)}</small></div>${tagPedido(p)}</div>`).join('')}</div>` : ''}
    ${S.modo === 'online' ? cardUso(S.eu) : ''}
    ${pode('perfil') ? `<div class="card"><h3>Meu perfil</h3><button class="btn ghost" data-act="editarPerfil">✏️ Mudar meu nome</button></div>` : ''}
    <div class="card"><h3>⚙️ Aparelho</h3>
      <button class="btn ghost" data-act="ativarNotif">🔔 Ativar / testar notificações</button><div style="height:8px"></div>
      <button class="btn ghost" data-act="agenda">📅 Pôr lembretes na agenda / despertador</button><div style="height:8px"></div>
      <button class="btn ghost" data-act="instalar">⬇️ Instalar o app</button></div>
    <p class="rodape">TáFeito v${VERSAO} · Desenvolvido por Andrade</p>`;
}

function cardConta() {
  const souPai = S.papel === 'pai';
  const email = S.modo === 'online' ? (S.email || '') : 'modo demonstração';
  return `<div class="card"><h3>${souPai ? '👑 Minha conta (Administrador)' : '🔑 Minha conta'}</h3>
    <div class="lista-item"><div class="chip" style="padding:6px 10px;background:${souPai ? 'linear-gradient(135deg,#4f7cff,#7b5cff)' : corFilho(S.eu)}">${souPai ? '👨' : esc((filhoAtual().nome || '?')[0])}</div>
    <div class="tt"><b>${souPai ? esc((S.dados.perfis.find(p => p.papel === 'pai') || {}).nome || 'Pai') : esc(filhoAtual().nome)}</b><small>${souPai ? esc(email) + ' · controla tudo' : 'Entra com PIN · só o pai altera as regras'}</small></div>
    <span class="tag ${souPai ? 'ok' : ''}">${souPai ? 'ADMIN' : 'filho'}</span></div>
    ${souPai && S.modo === 'online' ? `<button class="btn ghost" style="margin-top:8px" data-act="trocarSenha">🔒 Trocar minha senha</button>` : ''}
    ${souPai && S.modo === 'online' && S.dados.filhos.length ? `<h3 style="margin-top:16px">🔑 Senhas dos filhos</h3><p class="mut peq">Esqueceram a senha? Crie uma nova aqui quando quiser.</p>
      ${S.dados.filhos.map(f => { const tem = S.dados.perfis.some(p => p.filho_id === f.id); return `<div class="lista-item"><div class="chip" style="padding:6px 10px;background:${corFilho(f.id)}">${esc((f.nome || '?')[0])}</div>
        <div class="tt"><b>${esc(f.nome)}</b><small>${tem ? 'Acesso criado' : 'Acesso ainda não criado'}</small></div>
        <button class="btn pri" style="width:auto;padding:8px 12px" data-act="senhaFilho" data-id="${esc(f.id)}">${tem ? 'Trocar senha' : 'Criar senha'}</button></div>`; }).join('')}` : ''}
    <button class="btn bad" style="margin-top:8px" data-act="sair">🚪 Sair da conta</button></div>`;
}

function tagPedido(p) {
  if (p.status === 'pendente') return '<span class="tag warn">aguardando</span>';
  if (p.status === 'negado') return '<span class="tag bad">negado</span>';
  const ativo = p.expira_em && new Date(p.expira_em) > new Date();
  return `<span class="tag ${ativo ? 'ok' : ''}">${ativo ? 'liberado até ' + hora(p.expira_em) : 'aprovado (expirou)'}</span>`;
}

/* ---------- telas do PAI ---------- */
function telaPainel() {
  const f = filhoAtual(); if (!f || !S.filhoSel) return `<div class="vazio">Cadastre um filho em Mais → Filhos.</div>`;
  const dia = S.diaVer; const tars = tarefasDoDia(dia);
  const pend = S.dados.pedidos.filter(p => p.filho_id === f.id && p.status === 'pendente');
  const aguard = tars.filter(t => (regDe(t, dia) || {}).status === 'feita').length;
  const on = S.online.has(f.id); const perfil = S.dados.perfis.find(p => p.filho_id === f.id);
  return `${avisoBanco()}${avisoNotificacao()}
    ${pend.map(p => `<div class="aviso warn linha"><div class="esp">🔐 <b>${esc(f.nome)}</b> pediu para ajustar <b>${esc(AREAS[p.area] || p.area)}</b>${p.mensagem ? `: "${esc(p.mensagem)}"` : ''}</div><button class="btn sm pri" data-act="abrirPedido" data-id="${esc(p.id)}">Ver</button></div>`).join('')}
    <div class="card"><div class="linha">${S.modo === 'online' ? `<span class="dot ${on ? 'on' : ''}"></span>` : ''}<div class="esp"><b>${esc(f.nome)}</b> <span class="mut peq">${S.modo === 'online' ? (on ? 'online agora' : (perfil && perfil.visto_em ? 'visto ' + dataHoraBR(perfil.visto_em) : (perfil ? 'offline' : 'acesso ainda não criado'))) : ''}</span></div>
      <input type="date" class="inp" style="width:auto;padding:7px 9px" value="${dia}" data-change="diaVer"></div></div>
    ${S.modo === 'online' && perfil ? `<div class="aviso ${perfil.notif_estado === 'ativo' ? 'ok' : 'bad'}">${perfil.notif_estado === 'ativo' ? '🔔 Notificações de ' + esc(f.nome) + ' <b>ligadas</b>' : '🔕 Notificações de ' + esc(f.nome) + ' <b>' + (perfil.notif_estado ? 'DESLIGADAS' : 'ainda não ativadas') + '</b>' + (perfil.notif_em ? ' desde ' + dataHoraBR(perfil.notif_em) : '') + ' · o app dele fica bloqueado até religar'}</div>` : ''}
    ${S.modo === 'online' ? cardUso(f.id) : ''}${bannerProvas()}
    <div class="secao">📊 Resumo de ${esc(f.nome)}</div>${dashTarefas(f.id)}${dashWork(f.id)}${dashEstudo(f.id)}
    ${tars.length ? cardPremio(dia) : ''}
    ${aguard ? `<div class="aviso info" style="margin-top:12px">⭐ ${aguard} tarefa(s) esperando sua aprovação.</div>` : ''}
    <div class="secao">Tarefas de ${dia === hojeISO() ? 'hoje' : dataBR(dia)}</div>
    ${tars.length ? tars.map(t => cardTarefaPai(t, dia)).join('') : `<div class="vazio"><span class="e">📋</span>${esc(f.nome)} ainda não tem tarefas.<br><br><button class="btn pri sm" data-act="novaTarefa" data-cat="casa">＋ Criar primeira tarefa</button></div>`}
    <div class="secao">Resumo</div>${cardNivel(f.id)}
    <p class="rodape">Desenvolvido por Andrade</p>`;
}

function listaGerenciar(cats) {
  const tars = deFilho('tarefas').filter(t => cats.includes(t.categoria)).sort((a, b) => (a.horario || '99').localeCompare(b.horario || '99'));
  if (!tars.length) return `<div class="vazio"><span class="e">📋</span>Nenhuma tarefa ainda.</div>`;
  return cats.map(c => {
    const l = tars.filter(t => t.categoria === c); if (!l.length) return '';
    return `<div class="secao">${CATS[c].icone} ${CATS[c].nome}</div><div class="card">${l.map(t => `<div class="lista-item ${t.ativa === false ? 'trancado' : ''}">
      <span style="font-size:1.4rem">${esc(t.icone || CATS[t.categoria].icone)}</span>
      <div class="tt"><b>${esc(t.titulo)}</b><small>${infoTarefa(t)}${t.foto ? ' · 📷' : ''}${t.valor > 0 ? ' · ' + brl(t.valor) : ''}${t.ativa === false ? ' · pausada' : ''}</small></div>
      <button class="icone-btn" data-act="editarTarefa" data-id="${esc(t.id)}">✏️</button></div>`).join('')}</div>`;
  }).join('');
}

function telaTarefasPai() {
  return `${dashTarefas()}<div class="linha" style="margin-bottom:6px"><div class="esp"><h2 style="margin:0">Tarefas de ${esc(filhoAtual().nome)}</h2><span class="mut peq">Tarefas de casa</span></div>
    <button class="btn pri sm" data-act="novaTarefa" data-cat="casa">＋ Nova</button></div>
    ${listaGerenciar(['casa'])}`;
}

function telaWorkPai() {
  const c = carteira(); const pags = deFilho('pagamentos').sort((a, b) => (b.criado_em || '').localeCompare(a.criado_em || ''));
  return `${dashWork()}${secaoImagens()}<div class="card destaque"><span class="mut peq">${esc(filhoAtual().nome)} tem a receber</span><h1 style="margin:2px 0">${brl(c.saldo)}</h1>
    <span class="mut peq">Ganho ${brl(c.ganho)} · pago ${brl(c.pago)}</span>
    <div class="acoes"><button class="btn ok sm" data-act="pagar">💸 Registrar pagamento</button></div></div>
    <div class="linha" style="margin-top:6px"><div class="esp"><h2 style="margin:0">Trabalhos</h2><span class="mut peq">Tarefas que valem dinheiro</span></div>
    <button class="btn pri sm" data-act="novaTarefa" data-cat="trabalho">＋ Novo trabalho</button></div>
    ${listaGerenciar(['trabalho'])}
    ${pags.length ? `<div class="secao">Pagamentos feitos</div><div class="card">${pags.map(p => `<div class="lista-item"><div class="tt">${esc(p.obs || 'Pagamento')}<small>${dataHoraBR(p.criado_em)}</small></div><b>${brl(p.valor)}</b><button class="icone-btn" data-act="apagarPagamento" data-id="${esc(p.id)}">🗑️</button></div>`).join('')}</div>` : ''}`;
}

function telaMissoes() {
  const ms = deFilho('missoes').filter(m => S.papel === 'pai' || m.ativa !== false);
  const souPai = S.papel === 'pai';
  return `${souPai ? '' : bannerPermissoes()}${cardNivel()}
    <div class="linha"><div class="esp"><h2 style="margin:0">🎯 Missões</h2><span class="mut peq">Complete e ganhe prêmios</span></div>
    ${pode('missoes') ? `<button class="btn pri sm" data-act="novaMissao">＋ Nova</button>` : ''}</div><div style="height:10px"></div>
    ${ms.length ? ms.map(m => {
      const p = Math.min(progressoMissao(m), m.meta); const pct = Math.round(p / m.meta * 100); const ok = p >= m.meta; const res = resgatada(m);
      return `<div class="tarefa ${res ? 'ok' : ok ? 'espera' : ''} ${m.ativa === false ? 'trancado' : ''}"><div class="cab"><div class="em">${esc(m.icone || '🏆')}</div>
        <div class="tt"><b>${esc(m.titulo)}</b><small>${esc(m.descricao || TIPOS_MISSAO[m.tipo])}</small>
        <div style="margin-top:4px">${m.premio ? `<span class="tag ok">🎁 ${esc(m.premio)}</span>` : ''}${num(m.valor) ? `<span class="tag din">💰 ${brl(m.valor)}</span>` : ''}<span class="tag">+${m.xp} XP</span></div></div>
        ${pode('missoes') ? `<button class="icone-btn" data-act="editarMissao" data-id="${esc(m.id)}">✏️</button>` : ''}</div>
        <div class="linha" style="margin-top:10px"><div class="barra ${ok ? 'ouro' : ''}" style="flex:1"><i style="width:${pct}%"></i></div><b class="peq">${p}/${m.meta}</b></div>
        ${res ? `<button class="btn ok" style="margin-top:10px" disabled>🏅 Prêmio resgatado</button>` : ok && !souPai ? `<button class="btn pri" style="margin-top:10px" data-act="resgatar" data-id="${esc(m.id)}">🎁 Resgatar prêmio!</button>` : ok ? `<div class="aviso ok" style="margin-bottom:0">Missão completa! Aguardando ${esc(filhoAtual().nome)} resgatar.</div>` : ''}
      </div>`;
    }).join('') : `<div class="vazio"><span class="e">🎯</span>Nenhuma missão ainda.</div>`}
    ${!souPai && !pode('missoes') ? `<button class="btn ghost sm" style="width:100%" data-act="pedir" data-area="missoes">✋ Pedir para ajustar missões</button>` : ''}`;
}

function telaChat() {
  const id = fid(); const msgs = deFilho('mensagens', id);
  const eu = S.papel === 'pai' ? 'pai' : S.eu;
  const outro = S.papel === 'pai' ? nomeFilho(id) : 'Pai';
  const outroOn = S.online.has(S.papel === 'pai' ? id : 'pai');
  const rapidas = S.papel === 'pai' ? ['Muito bem! 👏', 'Faça suas tarefas agora.', 'Refaça com capricho.', 'Liberado! 🎮'] : ['Terminei! ✅', 'Posso jogar? 🎮', 'Preciso de ajuda 🙋', 'Tô fazendo 💪'];
  return `<div class="chat"><div class="linha" style="margin-bottom:8px">${S.modo === 'online' ? `<span class="dot ${outroOn ? 'on' : ''}"></span>` : ''}<b>${esc(outro)}</b><span class="mut peq">${S.modo === 'online' ? (outroOn ? 'online' : 'offline') : ''}</span></div>
    <div class="msgs" id="msgs">${msgs.length ? msgs.map(m => `<div class="msg ${m.autor === eu ? 'eu' : ''}">${esc(m.texto)}<small>${dataHoraBR(m.criado_em)}${m.autor === eu && m.lido ? ' ✓✓' : ''}</small></div>`).join('') : `<div class="vazio"><span class="e">💬</span>Mande a primeira mensagem.</div>`}</div>
    <div class="rapidas">${rapidas.map(r => `<button class="btn ghost sm" data-act="rapida" data-txt="${esc(r)}">${esc(r)}</button>`).join('')}</div>
    <form class="chat-in" data-form="chat"><input id="chatTxt" class="inp" placeholder="Escreva uma mensagem…" autocomplete="off" maxlength="1000"><button class="btn pri">➤</button></form></div>`;
}

function telaMaisPai() {
  const peds = S.dados.pedidos.slice().sort((a, b) => (b.criado_em || '').localeCompare(a.criado_em || '')).slice(0, 25);
  return `<div class="linha" style="margin-bottom:10px"><h2 style="margin:0">⚙️ Configurações</h2><span class="tag ok">só admin</span></div>${avisoBanco()}${cardConta()}
    <div class="grid2" style="margin-bottom:12px"><button class="btn ghost" data-act="conectores">🔌 Conectores</button><button class="btn ghost" data-act="teste">🧪 Teste de lembrete</button></div>
    <div class="card"><h3>🎨 Meu mascote</h3><div class="linha"><div class="masc-mini">${mascoteVisual(mascoteDe('pai'), 64)}</div><div class="esp"><b>${esc(mascoteDe('pai').nome)}</b><br><span class="mut peq">Fica flutuando no seu app, dá bom dia e conta como os meninos estão.</span></div></div>
      <div class="grid2" style="margin-top:10px"><button class="btn pri" data-act="mascoteEditar" data-id="pai">🎨 Personalizar</button><button class="btn ghost" data-act="mascote">🔊 Ouvir resumo</button></div></div>
    ${cardNotifPai()}
    <div class="card"><h3>📲 WhatsApp do Pai</h3><p class="mut peq">Número que aparece no botão de WhatsApp do app dos filhos.</p>
      <form data-form="whatsPai" class="linha"><input class="inp" name="w" inputmode="tel" value="${esc(S.config.whatsapp_pai || '')}" placeholder="85 99999-9999"><button class="btn pri sm" style="width:auto">Salvar</button></form></div>
    <div class="card"><h3>👨‍👦 Filhos e acessos</h3>${S.dados.filhos.map(f => {
      const tem = S.dados.perfis.some(p => p.filho_id === f.id);
      return `<div class="lista-item"><button class="avatar-btn" data-act="perfilFilho" data-id="${esc(f.id)}">${avatar(f.id, 40)}</button><div class="tt"><b>${esc(f.nome)}</b><small>💻 ${horasTxt(f.horas_pc)} · 📱 ${horasTxt(f.horas_cel)}${S.modo === 'online' ? (tem ? ' · acesso criado' : ' · sem acesso') : ''}</small></div>
      <button class="icone-btn" data-act="editarFilho" data-id="${esc(f.id)}">⚙️</button></div>`;
    }).join('')}
    <button class="btn ghost" style="margin-top:8px" data-act="novoFilho">＋ Adicionar filho</button></div>
    ${S.modo === 'online' ? `<div class="card"><h3>📲 Mandar o app pelo WhatsApp</h3><p class="mut peq">Gera o link de instalação já conectado. Seu filho abre, instala e entra com o PIN dele.</p><button class="btn zap" data-act="compartilhar">Enviar link pelo WhatsApp</button></div>` : `<div class="card"><h3>🧪 Modo demonstração</h3><p class="mut peq">Os dados ficam só neste aparelho. Para usar em celulares diferentes, conecte ao Supabase (veja o guia).</p><button class="btn pri" data-act="sairDemo">Conectar ao Supabase</button></div>`}
    <div class="card"><h3>🔐 Pedidos de permissão</h3>${peds.length ? peds.map(p => `<div class="lista-item"><div class="tt"><b>${esc(nomeFilho(p.filho_id))}</b> · ${esc(AREAS[p.area] || p.area)}<small>${esc(p.mensagem || '')} · ${dataHoraBR(p.criado_em)}</small></div>${p.status === 'pendente' ? `<button class="btn pri sm" data-act="abrirPedido" data-id="${esc(p.id)}">Responder</button>` : tagPedido(p)}</div>`).join('') : '<p class="mut peq">Nenhum pedido ainda.</p>'}</div>
    <div class="card"><h3>⚙️ Aparelho</h3>
      <button class="btn ghost" data-act="ativarNotif">🔔 Ativar / testar notificações</button><div style="height:8px"></div>
      <button class="btn ghost" data-act="agenda">📅 Lembretes na agenda (tarefas de ${esc(filhoAtual().nome)})</button><div style="height:8px"></div>
      <button class="btn ghost" data-act="instalar">⬇️ Instalar o app</button><div style="height:8px"></div>
      <button class="btn ghost" data-act="ajudaBloqueio">🔒 Como bloquear o PC/celular de verdade</button></div>
    <div class="card"><h3>💾 Backup</h3><p class="mut peq">Tudo fica salvo no banco de dados (Supabase). Para guardar uma cópia no Google Drive, baixe o backup e salve na pasta do TáFeito no Drive.</p>
      <button class="btn ghost" data-act="backup">💾 Baixar backup completo</button></div>
    <p class="rodape">TáFeito v${VERSAO} · Desenvolvido por Andrade</p>`;
}

/* ---------- NOTIFICAÇÕES DO PAI: ele escolhe o que quer receber ---------- */
const NOTIF_PAI = [['login', '🟢', 'Filho entrou no app'], ['reg', '✅', 'Tarefa concluída'], ['atraso', '⚠️', 'Tarefa atrasada'], ['filho', '✏️', 'Filho criou ou mudou algo (tarefa, missão, perfil, prêmio)'],
  ['imagens', '🖼️', 'Imagens enviadas'], ['prova', '📚', 'Provas marcadas, mudadas ou importadas'], ['ciente', '👍', '"Ciente" nas provas'], ['msg', '💬', 'Mensagens do chat'],
  ['ped', '🔐', 'Pedidos de permissão'], ['notif', '🚨', 'Filho desligou as notificações (recomendado deixar ligado)'], ['copia', '📤', 'Cópia no sininho do que o filho recebeu']];
const notifPaiOff = () => Array.isArray(S.config.notif_pai_off) ? S.config.notif_pai_off : [];
function cardNotifPai() {
  const off = notifPaiOff(); const lig = NOTIF_PAI.length - NOTIF_PAI.filter(([k]) => off.includes(k)).length;
  return `<div class="card"><div class="linha"><h3 class="esp" style="margin:0">🔔 Minhas notificações</h3><span class="tag ${lig === NOTIF_PAI.length ? 'ok' : ''}">${lig}/${NOTIF_PAI.length} ligadas</span></div>
    <p class="mut peq">Escolha o que você quer receber no celular e no sininho. Isso vale só para você — as notificações dos filhos continuam travadas.</p>
    <div class="lista-notif">${NOTIF_PAI.map(([k, e, t]) => `<label class="item-notif"><span class="sem3d-no">${e}</span><span class="esp">${esc(t)}</span><input type="checkbox" class="chave" data-change="notifPai" data-k="${k}" ${off.includes(k) ? '' : 'checked'}></label>`).join('')}</div>
    <div class="grid2" style="margin-top:8px"><button class="btn ghost sm" data-act="notifPaiTodas" data-v="1">Ligar todas</button><button class="btn ghost sm" data-act="notifPaiTodas" data-v="0">Desligar todas</button></div></div>`;
}
async function salvarNotifPai(off) {
  const antes = notifPaiOff(); S.config.notif_pai_off = off;
  try { await DB.rpc('mok_notif_pai', { p_off: off }); render(); toast('🔔 Preferências salvas', 'ok'); }
  catch (e) { S.config.notif_pai_off = antes; render(); toast(msgErro(e), 'bad'); }
}

/* ---------- ÁREA DE ESTUDO (provas) ---------- */
const dhProva = p => p.data ? new Date(`${p.data}T${p.horario || '08:00'}:00`) : null;
const quandoProva = p => p.data ? `${DSEM[dow(p.data)]} ${dataBR(p.data)} às ${p.horario || '08:00'}` : 'data a definir';
const SITES = [
  [/enem[\s-]*usp/i, ''], [/enem[\s-]*unicamp/i, 'https://www.comvest.unicamp.br/'],
  [/\benem\b/i, 'https://enem.inep.gov.br/'], [/\bsisu\b/i, 'https://acessounico.mec.gov.br/sisu'],
  [/\buece\b/i, 'https://www.cev.uece.br/'], [/fuvest/i, 'https://www.fuvest.br/'], [/unicamp|comvest/i, 'https://www.comvest.unicamp.br/'],
  [/\buerj\b/i, 'https://www.vestibular.uerj.br/'], [/\bufsc\b/i, 'https://vestibularunificado.ufsc.br/'], [/\buel\b/i, 'https://www.cops.uel.br/'],
  [/\buem\b/i, 'https://www.vestibular.uem.br/'], [/\bifce\b/i, 'https://ifce.edu.br/'], [/\bufabc\b/i, 'https://www.ufabc.edu.br/'],
  [/\bufpr\b/i, 'https://www.nc.ufpr.br/'], [/\bunb\b/i, 'https://www.cebraspe.org.br/'], [/\bufc\b/i, 'https://www.ufc.br/']
];
function siteDaProva(p) {
  if (p.site) return p.site;
  const t = `${p.materia} ${p.instituicao || ''}`;
  for (const [re, u] of SITES) if (re.test(t)) return u || '';
  return '';
}
const linkProva = p => siteDaProva(p) || `https://www.google.com/search?q=${encodeURIComponent(nomeProva(p) + ' site oficial inscrição')}`;
const nomeProva = p => p.materia + (p.instituicao ? ` · ${p.instituicao}` : '');
const provasDe = (id = fid()) => S.dados.provas.filter(p => p.filho_id === id).sort((a, b) => (dhProva(a) || 9e15) - (dhProva(b) || 9e15));
const provasFuturas = (id = fid()) => provasDe(id).filter(p => p.data && dhProva(p) > new Date());
const provasRealizadas = (id = fid()) => provasDe(id).filter(p => p.data && dhProva(p) <= new Date());
const provasSemData = (id = fid()) => provasDe(id).filter(p => !p.data);
const cientesDe = (id = fid()) => S.dados.cientes.filter(c => c.filho_id === id);
function corProva(p) {
  if (!p.data) return 'semdata';
  const ms = dhProva(p) - new Date();
  if (ms <= 0) return 'passou';
  if (ms <= 7 * 864e5) return 'vermelho';
  if (ms <= 30 * 864e5) return 'amarelo';
  return 'verde';
}
function faltaTxt(p) {
  if (!p.data) return 'sem data';
  const ms = dhProva(p) - new Date(); if (ms <= 0) return 'já passou';
  const h = Math.floor(ms / 36e5), d = Math.floor(h / 24);
  if (h < 1) return `em ${Math.max(1, Math.round(ms / 6e4))} min`;
  if (h < 24) return `em ${h}h`;
  if (d === 1) return 'amanhã';
  return `em ${d} dias`;
}
const ROT_COR = { vermelho: '🔴 ALERTA · esta semana', amarelo: '🟡 em menos de 1 mês', verde: '🟢 mais de 1 mês', passou: '✅ realizada', semdata: '📌 sem data definida' };
function etapaAtual(p) {
  if (!p.data) return null;
  const h = (dhProva(p) - new Date()) / 36e5; if (h <= 0) return null;
  if (h <= 2) return '2h'; if (h <= 24) return '1d'; if (h <= 48) return '2d'; return null;
}
const jaCiente = (p, etapa) => S.dados.cientes.some(c => c.prova_id === p.id && c.etapa === etapa && new Date(c.criado_em) >= new Date(dhProva(p) - ETAPAS[etapa].h * 36e5 - 6e4));

function bannerProvas() {
  const l = provasFuturas().filter(p => corProva(p) === 'vermelho');
  if (!l.length) return '';
  return l.map(p => `<button class="aviso bad linha prova-alerta" data-act="verProva" data-id="${esc(p.id)}"><span style="font-size:1.4rem">🚨</span><div class="esp" style="text-align:left"><b>Prova: ${esc(nomeProva(p))} ${faltaTxt(p)}</b><br><span class="peq">${quandoProva(p)}</span></div><span class="peq">ver ›</span></button>`).join('');
}

function cardUso(id) {
  const perfil = S.dados.perfis.find(p => p.filho_id === id); if (!perfil) return '';
  const hoje = S.dados.uso.filter(u => u.filho_id === id && u.dia === hojeISO()).reduce((s, u) => s + num(u.segundos), 0);
  const semana = S.dados.uso.filter(u => u.filho_id === id && u.dia > addDias(hojeISO(), -7)).reduce((s, u) => s + num(u.segundos), 0);
  const t = sg => { const m = Math.round(sg / 60); return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`; };
  const on = S.online.has(id);
  return `<div class="card"><h3 style="margin:0 0 8px">⏱️ Tempo no app ${S.papel === 'filho' ? '<span class="mut peq">(registrado pelo servidor)</span>' : ''}</h3>
    <div class="grid3"><div class="stat"><b>${t(hoje)}</b><span>hoje</span></div><div class="stat"><b>${t(semana)}</b><span>7 dias</span></div><div class="stat"><b>${t(num(perfil.tempo_total))}</b><span>total</span></div></div>
    <p class="mut peq" style="margin:8px 0 0">🚪 Última vez que entrou: <b>${perfil.entrou_em ? dataHoraBR(perfil.entrou_em) : '—'}</b> · ${on ? '<span style="color:var(--ok)">online agora</span>' : 'visto ' + (perfil.visto_em ? dataHoraBR(perfil.visto_em) : '—')}</p></div>`;
}

function calendario() {
  const [y, m] = S.calMes.split('-').map(Number);
  const ini = new Date(y, m - 1, 1), dias = new Date(y, m, 0).getDate(), pad = ini.getDay(), hoje = hojeISO();
  const porDia = {}; provasDe().forEach(p => { if (p.data && p.data.startsWith(S.calMes)) (porDia[p.data] = porDia[p.data] || []).push(p); });
  let cel = DSEM.map(d => `<div class="cal-sem">${d[0]}</div>`).join('') + '<div></div>'.repeat(pad);
  for (let d = 1; d <= dias; d++) {
    const iso = `${S.calMes}-${String(d).padStart(2, '0')}`; const l = porDia[iso] || [];
    const cor = l.length ? corProva(l[0]) : '';
    cel += `<button class="cal-dia ${iso === hoje ? 'hoje' : ''} ${cor ? 'tem ' + cor : ''} ${iso < hoje ? 'passado' : ''}" data-act="calDia" data-dia="${iso}">${d}${l.length ? `<i>${l.length > 1 ? l.length : '●'}</i>` : ''}</button>`;
  }
  return `<div class="card"><div class="linha"><button class="icone-btn" data-act="calMes" data-n="-1">‹</button><div class="esp centro"><b>${MESES[m - 1]} ${y}</b><br><button class="link peq" data-act="calHoje">hoje</button></div><button class="icone-btn" data-act="calMes" data-n="1">›</button></div>
    <div class="cal">${cel}</div><p class="mut peq centro" style="margin:8px 0 0">Toque num dia para marcar a prova</p></div>`;
}

function itemProva(p) {
  const cor = corProva(p); const n = S.dados.cientes.filter(c => c.prova_id === p.id).length;
  return `<div class="prova ${cor}" data-act="verProva" data-id="${esc(p.id)}" role="button" tabindex="0"><div class="pdata">${p.data ? `<b>${p.data.slice(8, 10)}</b><span>${MESES[Number(p.data.slice(5, 7)) - 1].slice(0, 3)} ${p.data.slice(2, 4)}</span>` : '<b>📌</b><span>sem data</span>'}</div>
    <div class="esp" style="text-align:left"><a class="link-prova" href="${esc(linkProva(p))}" target="_blank" rel="noopener" data-act="abrirSite" data-url="${esc(linkProva(p))}" title="Abrir o site da prova">${esc(p.materia)} 🔗</a>${p.instituicao ? ` <span class="tag">${esc(p.instituicao)}</span>` : ''}<br><span class="peq">${p.data ? `${DSEM[dow(p.data)]} às ${esc(p.horario)} · ${faltaTxt(p)}` : 'Toque para definir a data'}</span><br><span class="peq">${ROT_COR[cor]}${n ? ` · 👍 ${n}` : ''}</span></div><span>›</span></div>`;
}

function telaEstudo() {
  const fut = provasFuturas(); const pass = provasRealizadas().reverse().slice(0, 30); const sem = provasSemData();
  const nome = filhoAtual().nome;
  return `${S.papel === 'filho' ? bannerPermissoes() : ''}
    <div class="linha" style="margin-bottom:10px"><div class="esp"><h2 style="margin:0">📚 Área de estudo</h2><span class="mut peq">${S.papel === 'pai' ? 'Provas de ' + esc(nome) : 'Suas provas do ano todo'}</span></div>
    <button class="btn pri sm" style="width:auto" data-act="novaProva">＋ Prova</button></div>
    ${dashEstudo()}
    <button class="dropzone" data-act="importar"><span style="font-size:1.8rem">📥</span><div><b>Importar provas de um arquivo ou foto</b><br><span class="peq">Foto, print, PDF, Excel, Word ou texto: o app lê e põe tudo no calendário</span></div></button>
    ${calendario()}
    ${sem.length ? `<div class="secao">📌 Sem data definida (${sem.length})</div><div class="aviso warn">Toque em cada uma e coloque a data para receber os lembretes.</div>${sem.map(itemProva).join('')}` : ''}
    <div class="secao">Próximas provas (${fut.length})</div>
    ${fut.length ? fut.map(itemProva).join('') : `<div class="vazio"><span class="e">📅</span>Nenhuma prova com data marcada.<br>Toque num dia do calendário, em <b>＋ Prova</b> ou importe um arquivo.</div>`}
    <div class="legenda peq"><span>🔴 até 1 semana</span><span>🟡 até 1 mês</span><span>🟢 mais de 1 mês</span><span>📌 sem data</span></div>
    <div class="aviso info">🔔 Lembrete automático no celular: <b>2 dias antes</b>, <b>1 dia antes</b> e <b>2 horas antes</b> de cada prova. Em cada aviso, toque em <b>Ciente</b>.</div>
    <button class="btn ghost" data-act="teste">🧪 Testar se o celular avisa com o app fechado</button>
    ${pass.length ? `<div class="secao">✅ Provas realizadas (${provasRealizadas().length})</div>${pass.map(itemProva).join('')}` : ''}`;
}

/* ---------- DASHBOARDS simples (números grandes e cores) ---------- */
function dash(titulo, tiles, extra = '') {
  return `<div class="dash"><div class="dash-tit">${titulo}</div><div class="dash-grid">${tiles.map(t => `<div class="tile ${t.c}${String(t.n).length > 5 ? ' tile-largo' : ''}"><b>${t.n}</b><span>${t.r}</span></div>`).join('')}</div>${extra}</div>`;
}
function dashTarefas(id = fid()) {
  const dia = hojeISO(), hm = new Date().toTimeString().slice(0, 5);
  const tars = tarefasDoDia(dia, ['casa'], false, id);
  const feitas = tars.filter(t => ehFeita(regDe(t, dia))), pend = tars.filter(t => !ehFeita(regDe(t, dia)));
  const atras = pend.filter(t => t.horario && t.horario < hm);
  const semana = S.dados.registros.filter(r => r.filho_id === id && r.categoria === 'casa' && ehFeita(r) && r.data > addDias(dia, -7)).length;
  const st = statusDia(dia, false, id);
  return dash('✅ Minhas tarefas · hoje', [
    { n: feitas.length, r: 'feitas', c: 'verde' }, { n: pend.length, r: 'faltam', c: pend.length ? 'vermelho' : 'verde' },
    { n: atras.length, r: 'atrasadas', c: atras.length ? 'amarelo' : 'cinza' }, { n: semana, r: 'feitas em 7 dias', c: 'azul' }],
    `<div class="dash-st ${st.liberado ? 'ok' : 'bad'}">${st.total ? (st.liberado ? '🎮 Jogo LIBERADO' : `🔒 Jogo bloqueado · faltam ${st.total - st.feitas}`) : '🎮 Sem tarefas obrigatórias hoje'}</div>`);
}
function dashWork(id = fid()) {
  const dia = hojeISO(); const tars = tarefasDoDia(dia, ['trabalho'], false, id);
  const pend = tars.filter(t => !ehFeita(regDe(t, dia))).length;
  const feitos = concluidos(id).filter(r => r.categoria === 'trabalho').length; const c = carteira(id);
  return dash('💼 Meus trabalhos', [
    { n: feitos, r: 'feitos', c: 'verde' }, { n: pend, r: 'pendentes', c: pend ? 'vermelho' : 'cinza' },
    { n: brl(c.saldo), r: 'a receber', c: 'amarelo' }, { n: brl(c.pago), r: 'já recebido', c: 'azul' }]);
}
function dashEstudo(id = fid()) {
  const fut = provasFuturas(id), sem = provasSemData(id);
  const semana = fut.filter(p => corProva(p) === 'vermelho').length;
  const prox = fut[0];
  return dash('📚 Minhas provas', [
    { n: provasRealizadas(id).length, r: 'realizadas', c: 'verde' }, { n: fut.length, r: 'próximas', c: 'azul' },
    { n: semana, r: 'esta semana', c: semana ? 'vermelho' : 'cinza' }, { n: sem.length, r: 'sem data', c: sem.length ? 'amarelo' : 'cinza' },
    { n: cientesDe(id).length, r: 'vezes ciente 🔒', c: 'roxo' }],
    prox ? `<div class="dash-st ${corProva(prox) === 'vermelho' ? 'bad' : 'info'}">Próxima: <b>${esc(nomeProva(prox))}</b> · ${faltaTxt(prox)}</div>` : '');
}

function formProva(p, dia) {
  const novo = !p; p = p || { materia: '', conteudo: '', data: dia || hojeISO(), horario: '08:00' };
  modal(`<button class="icone-btn fechar" data-act="fechar">✕</button><h2>${novo ? '📅 Marcar prova' : '✏️ Editar prova'}</h2>
  <form data-form="prova" data-id="${esc(p.id || '')}">
    <label class="campo"><span>Matéria</span><input name="materia" value="${esc(p.materia)}" required maxlength="80" placeholder="Ex.: Matemática"></label>
    <label class="campo"><span>🔗 Site da prova (opcional)</span><input name="site" type="url" value="${esc(p.site || '')}" placeholder="https://… (se vazio, o app procura sozinho)"></label>
    <label class="campo"><span>Universidade / escola (opcional)</span><input name="instituicao" value="${esc(p.instituicao || '')}" maxlength="80" placeholder="Ex.: UECE"></label>
    <div class="grid2"><label class="campo"><span>Data (deixe vazio se ainda não sabe)</span><input type="date" name="data" value="${esc(p.data || '')}"></label>
    <label class="campo"><span>Horário</span><input type="time" name="horario" value="${esc(p.horario)}" required></label></div>
    <label class="campo"><span>O que vai cair (opcional)</span><textarea name="conteudo" rows="3" placeholder="Ex.: capítulos 3 e 4, frações">${esc(p.conteudo)}</textarea></label>
    <button class="btn pri">Salvar prova</button>
    ${!novo ? `<button type="button" class="btn bad" style="margin-top:8px" data-act="apagarProva" data-id="${esc(p.id)}">🗑️ Excluir prova</button>` : ''}
  </form>`);
}

function modalProva(p) {
  const cor = corProva(p); const cs = S.dados.cientes.filter(c => c.prova_id === p.id);
  const et = etapaAtual(p);
  modal(`<button class="icone-btn fechar" data-act="fechar">✕</button><div class="grande">📚</div><h2>${esc(p.materia)}</h2>${p.instituicao ? `<p class="mut" style="margin:-6px 0 8px">${esc(p.instituicao)}</p>` : ''}
    <p style="margin:0"><b>${quandoProva(p)}</b> · ${faltaTxt(p)}</p><p><span class="tag ${cor === 'vermelho' ? 'bad' : cor === 'amarelo' ? 'warn' : cor === 'verde' ? 'ok' : ''}">${ROT_COR[cor]}</span></p>
    ${p.conteudo ? `<div class="aviso info">📖 ${esc(p.conteudo)}</div>` : ''}
    <a class="btn ghost" href="${esc(linkProva(p))}" target="_blank" rel="noopener" data-act="abrirSite" data-url="${esc(linkProva(p))}">🔗 ${siteDaProva(p) ? 'Abrir site oficial' : 'Procurar site oficial'}</a>
    <p class="mut peq">Ciente nesta prova: <b>${cs.length}</b>${cs.length ? ' · último ' + dataHoraBR(cs[0].criado_em) : ''}</p>
    ${!p.data ? `<button class="btn pri" data-act="editarProva" data-id="${esc(p.id)}">📅 Definir a data</button><div style="height:8px"></div>` : ''}
    ${S.papel === 'filho' && cor !== 'passou' ? `<button class="btn ok" data-act="ciente" data-id="${esc(p.id)}" data-etapa="${et && !jaCiente(p, et) ? et : 'lista'}">👍 Ciente</button><div style="height:8px"></div>` : ''}
    <div class="grid2"><button class="btn ghost" data-act="editarProva" data-id="${esc(p.id)}">✏️ Editar</button><button class="btn bad" data-act="apagarProva" data-id="${esc(p.id)}">🗑️ Excluir</button></div>`);
}

function modalDiaProvas(dia, l) {
  modal(`<button class="icone-btn fechar" data-act="fechar">✕</button><h2>📅 ${DSEM[dow(dia)]} ${dataBR(dia)}</h2>
    ${l.map(itemProva).join('')}<button class="btn pri" style="margin-top:8px" data-act="novaProva" data-dia="${dia}">＋ Outra prova neste dia</button>`);
}

/* alerta na tela com botão Ciente: 2 dias, 1 dia e 2 horas antes (fica até ele tocar em Ciente) */
let alertaAberto = null;
function checarProvas() {
  if (S.papel !== 'filho') return;
  if (alertaAberto && alertaAberto.isConnected) return;
  for (const p of provasFuturas(S.eu)) {
    const et = etapaAtual(p); if (!et || jaCiente(p, et)) continue;
    const k = 'mok_prova_av_' + p.id + et + p.data + p.horario;
    if (!lsGet(k)) { lsSet(k, 1); notificar(`${ETAPAS[et].tit}: ${p.materia}`, quandoProva(p), 'prova'); }
    beep(); if (navigator.vibrate) navigator.vibrate([400, 150, 400, 150, 400]);
    alertaAberto = modal(`<div class="grande">${et === '2h' ? '🚨' : et === '1d' ? '⚠️' : '📚'}</div><h2 style="color:#ff9a9a">${ETAPAS[et].tit}</h2>
      <p style="font-size:1.2rem;margin:4px 0"><b>${esc(p.materia)}</b></p><p>${quandoProva(p)}</p>
      ${p.conteudo ? `<div class="aviso info">📖 ${esc(p.conteudo)}</div>` : ''}
      <button class="btn ok" data-act="ciente" data-alerta="1" data-id="${esc(p.id)}" data-etapa="${et}">👍 Ciente</button>
      <p class="mut peq" style="margin:8px 0 0">Seu "Ciente" fica registrado e o pai é avisado.</p>`, 'alerta prova-modal');
    return;
  }
}

/* ---------- ÍCONES 3D (Fluent 3D, licença MIT) ---------- */
const RE_EMOJI = /\p{Extended_Pictographic}(?:️|[\u{1F3FB}-\u{1F3FF}])?(?:‍\p{Extended_Pictographic}(?:️|[\u{1F3FB}-\u{1F3FF}])?)*|[0-9#*]️⃣/gu;
const chaveEmoji = e => [...e].map(c => c.codePointAt(0).toString(16)).filter(c => c !== 'fe0f').join('-');
function emoji3d(raiz) {
  if (!raiz || !window.ICO3D) return;
  const w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, { acceptNode: n => /^(SCRIPT|STYLE|TEXTAREA|INPUT|OPTION|SELECT|TITLE)$/.test(n.parentNode.nodeName) || n.parentNode.closest('.sem3d') ? NodeFilter.FILTER_REJECT : (RE_EMOJI.test(n.nodeValue) ? (RE_EMOJI.lastIndex = 0, NodeFilter.FILTER_ACCEPT) : NodeFilter.FILTER_REJECT) });
  const nos = []; while (w.nextNode()) nos.push(w.currentNode);
  for (const n of nos) {
    const t = n.nodeValue; let ult = 0, mudou = false; const frag = document.createDocumentFragment(); RE_EMOJI.lastIndex = 0; let m;
    while ((m = RE_EMOJI.exec(t))) {
      const k = chaveEmoji(m[0]); if (!ICO3D.has(k)) continue;
      if (m.index > ult) frag.append(t.slice(ult, m.index));
      const img = document.createElement('img'); img.className = 'e3d'; img.src = `icons/3d/${k}.webp`; img.alt = m[0]; img.draggable = false; frag.append(img); ult = m.index + m[0].length; mudou = true;
    }
    if (!mudou) continue; if (ult < t.length) frag.append(t.slice(ult)); n.replaceWith(frag);
  }
}

/* ---------- PERFIL: foto (com ajuste) e WhatsApp ---------- */
const fotoDe = id => id === 'pai' ? (S.config.foto_pai || '') : ((S.dados.filhos.find(f => f.id === id) || {}).foto || '');
function avatar(id, tam = 36) {
  const foto = fotoDe(id); const nome = id === 'pai' ? 'Pai' : nomeFilho(id);
  const bg = id === 'pai' ? 'linear-gradient(135deg,#4f7cff,#7b5cff)' : corFilho(id);
  return foto ? `<img class="avatar" src="${esc(foto)}" alt="${esc(nome)}" style="width:${tam}px;height:${tam}px">`
    : `<span class="avatar ini" style="width:${tam}px;height:${tam}px;background:${bg};font-size:${Math.round(tam * .45)}px">${id === 'pai' ? '👨' : esc((nome || '?')[0])}</span>`;
}
const podeEditarPerfil = id => S.papel === 'pai' || id === S.eu;
function modalPerfil(id) {
  if (!podeEditarPerfil(id)) return toast('Você só pode editar o seu próprio perfil.', 'bad');
  const souPai = S.papel === 'pai'; const ehPai = id === 'pai'; const f = ehPai ? null : S.dados.filhos.find(x => x.id === id);
  const nome = ehPai ? ((S.dados.perfis.find(p => p.papel === 'pai') || {}).nome || 'Pai') : f.nome;
  const zap = ehPai ? (S.config.whatsapp_pai || '') : (f.whatsapp || '');
  modal(`<button class="icone-btn fechar" data-act="fechar">✕</button><h2>👤 Perfil de ${esc(nome)}</h2>
    <div class="centro"><button class="avatar-btn" data-act="trocarFoto" data-id="${esc(id)}">${avatar(id, 120)}</button>
    <div style="display:flex;gap:6px;justify-content:center;margin:10px 0"><button class="btn pri sm" style="width:auto" data-act="trocarFoto" data-id="${esc(id)}">📷 Trocar e ajustar foto</button>${fotoDe(id) ? `<button class="btn ghost sm" style="width:auto" data-act="removerFoto" data-id="${esc(id)}">Remover</button>` : ''}</div></div>
    <form data-form="perfil2" data-id="${esc(id)}">
      <label class="campo"><span>Nome ${souPai ? '' : '(só o pai altera)'}</span><input name="nome" value="${esc(nome)}" ${souPai ? '' : 'readonly'} required></label>
      <label class="campo"><span>📲 WhatsApp</span><input name="whatsapp" inputmode="tel" value="${esc(zap)}" placeholder="85 99999-9999"></label>
      <button class="btn pri">Salvar perfil</button></form>
    ${!ehPai ? `<button class="btn ghost" style="margin-top:8px" data-act="mascoteEditar" data-id="${esc(id)}">🎨 Personalizar mascote</button>` : ''}`);
}
async function salvarPerfil(id, { foto = null, mascote = null, whatsapp = null }) {
  const zap = whatsapp == null ? null : String(whatsapp).replace(/\D/g, '');
  if (S.papel === 'pai' && id !== 'pai') {
    const x = S.dados.filhos.find(y => y.id === id); const n = { ...x };
    if (foto != null) n.foto = foto; if (mascote) n.mascote = mascote; if (zap != null) n.whatsapp = zap;
    await DB.salvar('filhos', n); Object.assign(x, n);
  } else {
    if (!podeEditarPerfil(id)) throw new Error('Você só pode editar o seu próprio perfil.');
    await DB.rpc('mok_meu_perfil', { p_foto: foto, p_mascote: mascote, p_whatsapp: zap });
    if (id === 'pai') { if (foto != null) S.config.foto_pai = foto; if (zap != null) S.config.whatsapp_pai = zap; if (mascote) S.config.mascote_pai = mascote; }
    else { const x = S.dados.filhos.find(y => y.id === id); if (foto != null) x.foto = foto; if (mascote) x.mascote = mascote; if (zap != null) x.whatsapp = zap; }
  }
  render();
}
async function salvarFotoPerfil(id, url) { try { await salvarPerfil(id, { foto: url }); fecharModais(); toast(url ? 'Foto atualizada ✅' : 'Foto removida', 'ok'); } catch (e) { toast(msgErro(e), 'bad'); } }
function escolherFotoPerfil(id) {
  const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*';
  i.onchange = () => { const a = i.files[0]; if (a) ajustarFoto(id, a); }; i.click();
}
function ajustarFoto(id, arq) {
  const url = URL.createObjectURL(arq); const img = new Image();
  img.onload = () => {
    const T = 260; let z = 1, ox = 0, oy = 0; const base = T / Math.min(img.width, img.height);
    const el = modal(`<h2>✂️ Ajustar foto</h2><p class="mut peq">Arraste para posicionar e use a barra para dar zoom.</p>
      <div class="crop" style="width:${T}px;height:${T}px"><canvas width="${T}" height="${T}"></canvas></div>
      <label class="campo" style="margin-top:12px"><span>🔍 Zoom</span><input type="range" min="1" max="4" step="0.01" value="1" class="zoom"></label>
      <div class="grid2"><button class="btn ghost" data-crop="sair">Cancelar</button><button class="btn ok" data-crop="ok">✅ Usar foto</button></div>`, 'alerta');
    const cv = el.querySelector('canvas'), g = cv.getContext('2d');
    const lim = () => { const w = img.width * base * z, h = img.height * base * z; ox = Math.min(0, Math.max(T - w, ox)); oy = Math.min(0, Math.max(T - h, oy)); };
    const desenha = () => { lim(); g.clearRect(0, 0, T, T); g.drawImage(img, ox, oy, img.width * base * z, img.height * base * z); };
    ox = (T - img.width * base) / 2; oy = (T - img.height * base) / 2; desenha();
    el.querySelector('.zoom').oninput = e => { const nz = Number(e.target.value); const cx = T / 2; ox = cx - (cx - ox) * nz / z; oy = cx - (cx - oy) * nz / z; z = nz; desenha(); };
    let arr = null; cv.onpointerdown = e => { arr = [e.clientX, e.clientY]; cv.setPointerCapture(e.pointerId); };
    cv.onpointermove = e => { if (!arr) return; ox += e.clientX - arr[0]; oy += e.clientY - arr[1]; arr = [e.clientX, e.clientY]; desenha(); };
    cv.onpointerup = () => { arr = null; };
    el.querySelector('[data-crop=sair]').onclick = () => { URL.revokeObjectURL(url); el.remove(); };
    el.querySelector('[data-crop=ok]').onclick = async () => {
      const out = document.createElement('canvas'); out.width = out.height = 400; const k = 400 / T;
      out.getContext('2d').drawImage(img, ox * k, oy * k, img.width * base * z * k, img.height * base * z * k);
      el.remove(); URL.revokeObjectURL(url); carregando(true, 'Salvando foto…');
      try { const blob = await new Promise(r => out.toBlob(r, 'image/jpeg', .88)); const u = await DB.enviarFoto(blob); carregando(false); await salvarFotoPerfil(id, u); }
      catch (e) { carregando(false); toast(msgErro(e), 'bad'); }
    };
  };
  img.src = url;
}

/* ---------- MASCOTE personalizado (personagem original do TáFeito) ---------- */
const MASC_OPC = {
  pele: ['#ffe0c7', '#f6c7a0', '#e3a77a', '#c4875a', '#9a6440', '#6b4128'],
  cabelo: ['espetado', 'topete', 'cacheado', 'liso', 'moicano', 'tranças', 'raspado'],
  corCabelo: ['#1e140e', '#4a2e1d', '#8a5a2b', '#d9a441', '#f3dc8a', '#d7462f', '#2f6df0', '#8b5cf6', '#ffffff'],
  olhos: ['#4a2e1d', '#1f6feb', '#16a34a', '#6b7280', '#111111'],
  sobrancelha: ['confiante', 'alegre', 'brava', 'surpresa'],
  roupa: ['jaqueta', 'moletom', 'camiseta', 'regata', 'colete', 'uniforme'],
  corRoupa: ['#2f6df0', '#7b5cff', '#16a34a', '#e11d48', '#f59e0b', '#111827', '#0ea5e9', '#f97316'],
  corDetalhe: ['#ffffff', '#fbbf24', '#111827', '#ef4444', '#22c55e', '#38bdf8'],
  estampa: ['nenhuma', 'raio', 'estrela', 'numero', 'listras'],
  calca: ['#1e293b', '#334155', '#1d4ed8', '#6b7280', '#3f2d20', '#111827'],
  tenis: ['#ffffff', '#ef4444', '#111827', '#22c55e', '#f59e0b', '#7b5cff'],
  chapeu: ['nenhum', 'bone', 'bonetras', 'fone', 'gorro', 'bandana', 'coroa'],
  oculos: ['nenhum', 'redondo', 'escuro', 'gamer'],
  extra: ['nenhum', 'mochila', 'capa', 'medalha', 'relogio', 'skate'],
  boca: ['sorriso', 'sorrisao', 'debochado', 'lingua'],
  movimento: ['flutuar', 'acenar', 'pular', 'dancar', 'joinha']
};
const MASC_ROT = { pele: 'Pele', cabelo: 'Cabelo', corCabelo: 'Cor do cabelo', olhos: 'Cor dos olhos', sobrancelha: 'Expressão', roupa: 'Roupa', corRoupa: 'Cor da roupa', corDetalhe: 'Cor dos detalhes', estampa: 'Estampa', calca: 'Calça', tenis: 'Tênis', chapeu: 'Cabeça', oculos: 'Óculos', extra: 'Acessório', boca: 'Boca', movimento: 'Movimento' };
const MASC_NOMES = { espetado: 'Espetado', topete: 'Topete', cacheado: 'Cacheado', liso: 'Liso', moicano: 'Moicano', 'tranças': 'Tranças', raspado: 'Raspado', confiante: '😏 Confiante', alegre: '😄 Alegre', brava: '😠 Brava', surpresa: '😮 Surpresa', jaqueta: 'Jaqueta', moletom: 'Moletom', camiseta: 'Camiseta', regata: 'Regata', colete: 'Colete', uniforme: 'Uniforme', nenhuma: 'Nenhuma', raio: '⚡ Raio', estrela: '⭐ Estrela', numero: 'Nº 10', listras: 'Listras', nenhum: 'Nenhum', bone: '🧢 Boné', bonetras: '🧢 Boné pra trás', fone: '🎧 Fone', gorro: 'Gorro', bandana: 'Bandana', coroa: '👑 Coroa', redondo: '👓 Redondo', escuro: '🕶️ Escuro', gamer: '🥽 Gamer', mochila: '🎒 Mochila', capa: '🦸 Capa', medalha: '🏅 Medalha', relogio: '⌚ Relógio', skate: '🛹 Skate', sorriso: '🙂 Sorriso', sorrisao: '😁 Sorrisão', debochado: '😏 Debochado', lingua: '😛 Língua', flutuar: '🎈 Flutuar', acenar: '👋 Acenar', pular: '🦘 Pular', dancar: '🕺 Dançar', joinha: '👍 Joinha' };
const MASC_CORES = ['pele', 'corCabelo', 'olhos', 'corRoupa', 'corDetalhe', 'calca', 'tenis'];
const MASC_PADRAO = { tipo: 'animal', animal: 'gato', movAnimal: 'auto', chapeuA: 'nenhum', oculosA: 'nenhum', aura: 'nenhuma', fundo: '', nome: 'Bolt', voz: true, pele: '#e3a77a', cabelo: 'espetado', corCabelo: '#1e140e', olhos: '#4a2e1d', sobrancelha: 'confiante', roupa: 'jaqueta', corRoupa: '#2f6df0', corDetalhe: '#fbbf24', estampa: 'raio', calca: '#1e293b', tenis: '#ffffff', chapeu: 'nenhum', oculos: 'nenhum', extra: 'nenhum', boca: 'sorriso', movimento: 'acenar' };
const MASC_PAI = { animal: 'aguia', nome: 'Falcão', chapeuA: 'nenhum', oculosA: 'escuro', fundo: '#2f3f86' };
const mascoteDe = id => { const m = id === 'pai' ? { ...MASC_PADRAO, ...MASC_PAI, ...(S.config.mascote_pai || {}) } : { ...MASC_PADRAO, ...(((S.dados.filhos.find(f => f.id === id) || {}).mascote) || {}) }; if (m.rosto && !m.boca) m.boca = 'sorriso'; return m; };
const nomePai = () => ((S.meuNome || (S.dados.perfis || []).find(p => p.papel === 'pai')?.nome || 'Pai').trim().split(/\s+/)[0]) || 'Pai';
const nomeDono = () => S.papel === 'pai' ? nomePai() : filhoAtual().nome;
/* resumo do dia para o pai (o mascote dele fala isso) */
function resumoPai() {
  const dia = hojeISO();
  const filhos = S.dados.filhos.map(f => { const t = tarefasDoDia(dia, ['casa'], false, f.id); const feitas = t.filter(x => ehFeita(regDe(x, dia, f.id))).length; return { f, total: t.length, feitas }; });
  const aprovar = S.dados.registros.filter(r => r.status === 'feita').length;
  const imgs = S.dados.imagens.filter(i => !i.status || i.status === 'pendente').length;
  const peds = pedidosPendentes().length;
  const provas = S.dados.filhos.flatMap(f => provasFuturas(f.id).filter(p => corProva(p) === 'vermelho').map(p => ({ p, f })));
  return { filhos, aprovar, imgs, peds, provas };
}
function tom(h, f) { const n = parseInt(String(h).replace('#', '').padEnd(6, '0').slice(0, 6), 16); const c = x => Math.max(0, Math.min(255, Math.round(f >= 1 ? x + (255 - x) * (f - 1) : x * f))).toString(16).padStart(2, '0'); return '#' + c(n >> 16 & 255) + c(n >> 8 & 255) + c(n & 255); }
const escurece = (h, f = .75) => tom(h, f);
function mascoteSVG(m, tam = 80, animar = true) {
  m = { ...MASC_PADRAO, ...m }; const u = 'm' + Math.random().toString(36).slice(2, 7);
  const P = m.pele, R = m.corRoupa, D = m.corDetalhe, C = m.corCabelo;
  const G = (id, c, a = 1.35, b = .62, cx = '38%', cy = '30%') => `<radialGradient id="${u}${id}" cx="${cx}" cy="${cy}" r="75%"><stop offset="0" stop-color="${tom(c, a)}"/><stop offset=".55" stop-color="${c}"/><stop offset="1" stop-color="${tom(c, b)}"/></radialGradient>`;
  const L = (id, c) => `<linearGradient id="${u}${id}" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="${tom(c, 1.3)}"/><stop offset=".5" stop-color="${c}"/><stop offset="1" stop-color="${tom(c, .55)}"/></linearGradient>`;
  const brilho = (d, op = .35) => `<path d="${d}" fill="#fff" opacity="${op}"/>`;
  // cabelo
  const cab = {
    espetado: `<path d="M52 92 L46 56 L64 66 L62 34 L82 52 L92 22 L104 48 L122 26 L124 56 L144 42 L140 74 L156 70 L148 96 Q130 70 100 68 Q70 70 52 92Z" fill="url(#${u}c)"/>${brilho('M78 50 L92 30 L96 50Z', .25)}`,
    topete: `<path d="M50 96 Q42 50 82 40 Q96 6 140 20 Q156 30 150 52 Q160 70 152 96 Q134 68 100 66 Q68 68 50 96Z" fill="url(#${u}c)"/>${brilho('M96 22 Q122 14 140 26 Q118 24 100 34Z', .3)}`,
    cacheado: `<g fill="url(#${u}c)">${[[56, 70], [66, 50], [84, 38], [104, 34], [124, 40], [140, 54], [148, 74], [50, 90], [152, 94], [96, 48], [116, 56], [76, 60]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="17"/>`).join('')}</g>`,
    liso: `<path d="M48 110 Q40 46 100 38 Q160 46 152 110 L146 112 Q140 74 112 66 Q90 84 58 82 Q54 96 54 112Z" fill="url(#${u}c)"/>${brilho('M70 50 Q100 40 130 50 Q100 48 72 58Z', .3)}`,
    moicano: `<path d="M50 96 Q52 70 70 66 Q100 62 130 66 Q148 70 150 96 Q130 76 100 74 Q70 76 50 96Z" fill="${tom(C, .7)}" opacity=".8"/><path d="M84 70 L80 30 L94 40 L100 14 L108 40 L122 30 L116 70Z" fill="url(#${u}c)"/>`,
    'tranças': `<path d="M50 96 Q44 48 100 40 Q156 48 150 96 Q130 70 100 68 Q70 70 50 96Z" fill="url(#${u}c)"/><g stroke="${tom(C, .55)}" stroke-width="2" opacity=".7">${[68, 84, 100, 116, 132].map(x => `<path d="M${x} 46 Q${x - 4} 58 ${x} 70"/>`).join('')}</g>`,
    raspado: `<path d="M54 92 Q56 52 100 48 Q144 52 146 92 Q128 72 100 70 Q72 72 54 92Z" fill="${C}" opacity=".45"/>`
  }[m.cabelo] || '';
  const sob = { confiante: ['M66 96 L90 100', 'M110 100 L134 92'], alegre: ['M66 96 Q78 88 90 96', 'M110 96 Q122 88 134 96'], brava: ['M66 92 L92 102', 'M108 102 L134 92'], surpresa: ['M66 88 Q78 80 90 88', 'M110 88 Q122 80 134 88'] }[m.sobrancelha];
  const olho = (cx, pis) => `<ellipse cx="${cx}" cy="114" rx="13" ry="${m.sobrancelha === 'surpresa' ? 16 : 14}" fill="#fff"/><ellipse cx="${cx}" cy="114" rx="13" ry="14" fill="url(#${u}sh)" opacity=".25"/>
    <circle cx="${cx + pis}" cy="116" r="8" fill="url(#${u}o)"/><circle cx="${cx + pis}" cy="116" r="4" fill="#0b0b0b"/><circle cx="${cx + pis + 3}" cy="112" r="2.6" fill="#fff"/><circle cx="${cx + pis - 2}" cy="120" r="1.2" fill="#fff" opacity=".8"/>`;
  const bocas = {
    sorriso: `<path d="M86 142 Q100 154 116 140" stroke="#5b1c1c" stroke-width="4.5" fill="none" stroke-linecap="round"/>`,
    sorrisao: `<path d="M82 138 Q100 162 120 138 Q100 146 82 138Z" fill="#5b1c1c"/><path d="M86 140 Q100 146 116 140 L114 144 Q100 148 88 144Z" fill="#fff"/>`,
    debochado: `<path d="M88 144 Q104 148 118 136" stroke="#5b1c1c" stroke-width="4.5" fill="none" stroke-linecap="round"/>`,
    lingua: `<path d="M84 140 Q100 156 118 140Z" fill="#5b1c1c"/><path d="M96 146 Q104 160 112 146Z" fill="#f472b6"/>`
  }[m.boca] || '';
  const oc = { nenhum: '', redondo: `<g fill="rgba(190,225,255,.18)" stroke="#1f2937" stroke-width="3.5"><circle cx="78" cy="114" r="17"/><circle cx="122" cy="114" r="17"/><path d="M95 112 h10"/></g>`,
    escuro: `<g><path d="M58 104 H96 L92 124 Q78 130 62 124Z" fill="#0b0f1a"/><path d="M104 104 H142 L138 124 Q124 130 108 124Z" fill="#0b0f1a"/><path d="M96 106 h8" stroke="#0b0f1a" stroke-width="4"/><path d="M64 108 l12 0" stroke="#fff" stroke-width="2.5" opacity=".45"/><path d="M110 108 l12 0" stroke="#fff" stroke-width="2.5" opacity=".45"/></g>`,
    gamer: `<g><rect x="56" y="102" width="88" height="26" rx="12" fill="${D}"/><rect x="60" y="105" width="80" height="20" rx="9" fill="#0b0f1a" opacity=".85"/><path d="M66 110 h30" stroke="#38bdf8" stroke-width="3" opacity=".8"/></g>` }[m.oculos] || '';
  const chap = { nenhum: '',
    bone: `<path d="M50 88 Q50 40 100 38 Q150 40 150 88 Q100 76 50 88Z" fill="url(#${u}r)"/><path d="M50 88 Q100 78 150 88 L176 96 Q130 86 50 94Z" fill="${tom(R, .6)}"/><circle cx="100" cy="40" r="5" fill="${D}"/><path d="M76 70 Q100 62 124 70" stroke="${D}" stroke-width="5" fill="none"/>`,
    bonetras: `<path d="M50 88 Q50 40 100 38 Q150 40 150 88 Q100 76 50 88Z" fill="url(#${u}r)"/><path d="M40 84 Q24 82 22 92 Q40 92 52 90Z" fill="${tom(R, .6)}"/><circle cx="100" cy="40" r="5" fill="${D}"/>`,
    fone: `<path d="M44 112 Q44 30 100 30 Q156 30 156 112" stroke="#111827" stroke-width="9" fill="none"/><rect x="30" y="100" width="22" height="34" rx="10" fill="url(#${u}d)"/><rect x="148" y="100" width="22" height="34" rx="10" fill="url(#${u}d)"/>`,
    gorro: `<path d="M48 92 Q48 30 100 28 Q152 30 152 92Z" fill="url(#${u}r)"/><rect x="44" y="80" width="112" height="18" rx="9" fill="${tom(R, .65)}"/><circle cx="100" cy="26" r="11" fill="${D}"/>`,
    bandana: `<path d="M50 84 Q100 66 150 84 L150 96 Q100 80 50 96Z" fill="url(#${u}d)"/><path d="M150 88 L168 80 L164 100Z" fill="${tom(D, .8)}"/>`,
    coroa: `<path d="M66 60 L72 26 L88 46 L100 20 L112 46 L128 26 L134 60Z" fill="#fbbf24" stroke="#b45309" stroke-width="2.5"/><circle cx="100" cy="42" r="5" fill="#ef4444"/>` }[m.chapeu] || '';
  const estampa = { nenhuma: '', raio: `<path d="M106 182 L92 206 L104 206 L96 228 L116 198 L104 198 L112 182Z" fill="${D}" stroke="${tom(D, .6)}" stroke-width="1.5"/>`,
    estrela: `<path d="M100 184 l6 12 13 2 -9.5 9 2.3 13 -11.8 -6.2 -11.8 6.2 2.3 -13 -9.5 -9 13 -2Z" fill="${D}"/>`,
    numero: `<text x="100" y="220" font-family="Arial Black,Arial" font-weight="900" font-size="30" fill="${D}" text-anchor="middle" stroke="${tom(D, .5)}" stroke-width="1">10</text>`,
    listras: `<g fill="${D}" opacity=".85"><rect x="70" y="190" width="60" height="6"/><rect x="68" y="204" width="64" height="6"/><rect x="68" y="218" width="64" height="6"/></g>` }[m.estampa] || '';
  const roupaX = { jaqueta: `<path d="M100 166 L100 240" stroke="${tom(R, .55)}" stroke-width="4"/><path d="M78 164 L100 184 L122 164" fill="${D}" opacity=".9"/><path d="M64 172 L74 236 M136 172 L126 236" stroke="${tom(R, 1.3)}" stroke-width="3" opacity=".5"/>`,
    moletom: `<path d="M74 166 Q100 186 126 166" fill="none" stroke="${tom(R, .6)}" stroke-width="7"/><path d="M90 176 v20 M110 176 v20" stroke="${D}" stroke-width="3" stroke-linecap="round"/><path d="M76 222 h48 v14 h-48Z" fill="${tom(R, .75)}"/>`,
    camiseta: `<path d="M84 162 Q100 174 116 162" fill="none" stroke="${tom(R, .6)}" stroke-width="5"/>`,
    regata: `<path d="M80 162 Q100 186 120 162" fill="url(#${u}p)"/>`,
    colete: `<path d="M64 170 L80 166 L100 200 L120 166 L136 170 L134 240 L66 240Z" fill="${tom(R, .55)}" opacity=".95"/><circle cx="92" cy="214" r="3" fill="${D}"/><circle cx="108" cy="214" r="3" fill="${D}"/>`,
    uniforme: `<path d="M82 164 L100 180 L118 164" fill="#fff"/><rect x="64" y="226" width="72" height="8" fill="${D}"/>` }[m.roupa] || '';
  const braco = m.roupa === 'regata' ? `url(#${u}p)` : `url(#${u}r)`;
  const ex = { capa: `<path d="M66 168 Q30 230 46 262 L154 262 Q170 230 134 168Z" fill="url(#${u}d)"/>`, mochila: `<rect x="44" y="178" width="22" height="50" rx="9" fill="url(#${u}d)"/><rect x="134" y="178" width="22" height="50" rx="9" fill="url(#${u}d)"/>` }[m.extra] || '';
  const exFrente = { medalha: `<path d="M88 164 L100 192 L112 164" stroke="#ef4444" stroke-width="5" fill="none"/><circle cx="100" cy="200" r="11" fill="#fbbf24" stroke="#b45309" stroke-width="2.5"/><path d="M100 194 l2 4 4 .5 -3 3 1 4 -4 -2 -4 2 1 -4 -3 -3 4 -.5Z" fill="#fff" opacity=".8"/>`, relogio: '', skate: `<g transform="translate(100 270)"><rect x="-46" y="-8" width="92" height="9" rx="4.5" fill="${D}"/><circle cx="-30" cy="5" r="5" fill="#111"/><circle cx="30" cy="5" r="5" fill="#111"/></g>` }[m.extra] || '';
  const relogio = m.extra === 'relogio' ? `<rect x="-8" y="10" width="16" height="9" rx="3" fill="#111827"/><rect x="-5" y="11.5" width="10" height="6" rx="2" fill="#38bdf8"/>` : '';
  const mao = `<circle cx="0" cy="30" r="11" fill="url(#${u}p)"/>`;
  const joinha = `<g transform="translate(0 30)"><rect x="-11" y="-8" width="22" height="20" rx="8" fill="url(#${u}p)"/><rect x="-5" y="-24" width="10" height="20" rx="5" fill="url(#${u}p)"/></g>`;
  return `<svg class="sem3d masc anim-${animar ? m.movimento : 'nada'}" viewBox="0 0 200 ${m.extra === 'skate' ? 290 : 270}" width="${tam}" height="${tam * (m.extra === 'skate' ? 1.45 : 1.35)}" xmlns="http://www.w3.org/2000/svg">
    <defs>${G('p', P)}${G('c', C, 1.6, .5, '35%', '20%')}${L('r', R)}${L('d', D)}${L('k', m.calca)}${L('t', m.tenis)}
      <radialGradient id="${u}o" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="${tom(m.olhos, 1.6)}"/><stop offset="1" stop-color="${m.olhos}"/></radialGradient>
      <radialGradient id="${u}sh" cx="50%" cy="0%" r="90%"><stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs>
    <ellipse class="sombra" cx="100" cy="${m.extra === 'skate' ? 282 : 262}" rx="50" ry="7" fill="#000" opacity=".28"/>
    <g class="corpo">
    ${ex}
    <g class="pernas"><rect x="74" y="230" width="22" height="26" rx="8" fill="url(#${u}k)"/><rect x="104" y="230" width="22" height="26" rx="8" fill="url(#${u}k)"/>
      <path d="M68 252 h32 q4 0 4 6 v4 h-38 v-4 q0 -6 2 -6Z" fill="url(#${u}t)"/><path d="M100 252 h32 q4 0 4 6 v4 h-38 v-4 q0 -6 2 -6Z" fill="url(#${u}t)"/><rect x="66" y="259" width="70" height="4" rx="2" fill="#e5e7eb" opacity=".85"/></g>
    <path d="M62 180 Q62 160 100 158 Q138 160 138 180 L136 240 Q100 248 64 240Z" fill="url(#${u}r)"/>
    ${roupaX}${estampa}
    <path d="M64 178 Q66 168 76 164" stroke="#fff" stroke-width="3" opacity=".25" fill="none"/>
    <g class="braco-e" style="transform-origin:68px 172px"><g transform="translate(58 172) rotate(18)"><rect x="-10" y="-4" width="20" height="36" rx="10" fill="${braco}"/>${mao}${relogio}</g></g>
    <g class="braco-d" style="transform-origin:132px 172px"><g transform="translate(142 172) rotate(${m.movimento === 'joinha' || m.movimento === 'acenar' ? -150 : -18})"><rect x="-10" y="-4" width="20" height="36" rx="10" fill="${braco}"/>${m.movimento === 'joinha' ? `<g transform="rotate(180 0 30)">${joinha}</g>` : mao}</g></g>
    ${exFrente}
    <rect x="88" y="146" width="24" height="18" rx="8" fill="${tom(P, .8)}"/>
    <g class="cabeca">
      <ellipse cx="50" cy="118" rx="11" ry="14" fill="url(#${u}p)"/><ellipse cx="150" cy="118" rx="11" ry="14" fill="url(#${u}p)"/>
      <path d="M52 100 Q50 62 100 58 Q150 62 148 100 L146 130 Q140 160 100 162 Q60 160 54 130Z" fill="url(#${u}p)"/>
      <path d="M60 136 Q66 156 100 160 Q134 156 140 136 Q130 152 100 154 Q70 152 60 136Z" fill="${tom(P, .82)}" opacity=".6"/>
      ${brilho('M70 76 Q100 64 128 74 Q100 70 74 84Z', .22)}
      <ellipse cx="70" cy="136" rx="9" ry="5" fill="#ff6b6b" opacity=".28"/><ellipse cx="130" cy="136" rx="9" ry="5" fill="#ff6b6b" opacity=".28"/>
      ${olho(78, m.sobrancelha === 'confiante' ? 2 : 0)}${olho(122, m.sobrancelha === 'confiante' ? 2 : 0)}
      <path d="${sob[0]}" stroke="${tom(C, .8)}" stroke-width="7" stroke-linecap="round" fill="none"/><path d="${sob[1]}" stroke="${tom(C, .8)}" stroke-width="7" stroke-linecap="round" fill="none"/>
      <path d="M98 122 Q94 132 100 134 Q104 134 104 130" stroke="${tom(P, .7)}" stroke-width="3" fill="none" stroke-linecap="round"/>
      ${bocas}${cab}${oc}${chap}
    </g></g>
  </svg>`;
}
/* mascotes animais 3D (Fluent 3D, MIT) */
const ANIMAIS = [["gato", "1f408", "Gato"], ["gatinho", "1f431", "Gatinho"], ["cachorro", "1f415", "Cachorro"], ["cao", "1f436", "Cãozinho"], ["aguia", "1f985", "Águia"], ["falcao", "1f426-200d-2b1b", "Falcão"], ["coruja", "1f989", "Coruja"], ["papagaio", "1f99c", "Papagaio"], ["pinguim", "1f427", "Pinguim"], ["pato", "1f986", "Pato"], ["flamingo", "1f9a9", "Flamingo"], ["pavao", "1f99a", "Pavão"], ["cisne", "1f9a2", "Cisne"], ["galo", "1f413", "Galo"], ["passaro", "1f426", "Pássaro"], ["peixe", "1f41f", "Peixe"], ["peixe_tropical", "1f420", "Peixe tropical"], ["baiacu", "1f421", "Baiacu"], ["tubarao", "1f988", "Tubarão"], ["golfinho", "1f42c", "Golfinho"], ["baleia", "1f433", "Baleia"], ["polvo", "1f419", "Polvo"], ["lula", "1f991", "Lula"], ["caranguejo", "1f980", "Caranguejo"], ["lagosta", "1f99e", "Lagosta"], ["foca", "1f9ad", "Foca"], ["lontra", "1f9a6", "Lontra"], ["tartaruga", "1f422", "Tartaruga"], ["crocodilo", "1f40a", "Crocodilo"], ["lagarto", "1f98e", "Lagarto"], ["cobra", "1f40d", "Cobra"], ["sapo", "1f438", "Sapo"], ["dragao", "1f409", "Dragão"], ["dino", "1f996", "T-Rex"], ["dino2", "1f995", "Dinossauro"], ["leao", "1f981", "Leão"], ["tigre", "1f405", "Tigre"], ["leopardo", "1f406", "Leopardo"], ["lobo", "1f43a", "Lobo"], ["raposa", "1f98a", "Raposa"], ["urso", "1f43b", "Urso"], ["urso_polar", "1f43b-200d-2744", "Urso polar"], ["panda", "1f43c", "Panda"], ["coala", "1f428", "Coala"], ["macaco", "1f412", "Macaco"], ["gorila", "1f98d", "Gorila"], ["elefante", "1f418", "Elefante"], ["girafa", "1f992", "Girafa"], ["zebra", "1f993", "Zebra"], ["rinoceronte", "1f98f", "Rinoceronte"], ["hipopotamo", "1f99b", "Hipopótamo"], ["cavalo", "1f40e", "Cavalo"], ["unicornio", "1f984", "Unicórnio"], ["canguru", "1f998", "Canguru"], ["preguica", "1f9a5", "Preguiça"], ["coelho", "1f407", "Coelho"], ["hamster", "1f439", "Hamster"], ["esquilo", "1f43f", "Esquilo"], ["ourico", "1f994", "Ouriço"], ["morcego", "1f987", "Morcego"], ["veado", "1f98c", "Veado"], ["camelo", "1f42a", "Camelo"], ["vaca", "1f404", "Vaca"], ["porco", "1f416", "Porco"], ["ovelha", "1f411", "Ovelha"], ["bode", "1f410", "Bode"], ["borboleta", "1f98b", "Borboleta"], ["abelha", "1f41d", "Abelha"], ["joaninha", "1f41e", "Joaninha"], ["caracol", "1f40c", "Caracol"], ["aranha", "1f577", "Aranha"], ["escorpiao", "1f982", "Escorpião"]];
const MISTICOS = [['bruxo', '', 'Bruxo'], ['bruxa', '', 'Bruxa'], ['mago', '', 'Mago'], ['fada', '', 'Fada'], ['fado', '', 'Fado'], ['genio', '', 'Gênio'], ['vampiro', '', 'Vampiro'], ['vampira', '', 'Vampira'],
  ['zumbi', '', 'Zumbi'], ['elfo', '', 'Elfo'], ['elfa', '', 'Elfa'], ['sereia', '', 'Sereia'], ['tritao', '', 'Tritão'], ['ninja', '', 'Ninja'], ['heroi', '', 'Super-herói'], ['vilao', '', 'Vilão'],
  ['fantasma', '', 'Fantasma'], ['alien', '', 'Alienígena'], ['monstro', '', 'Monstrinho'], ['robo', '', 'Robô'], ['goblin', '', 'Goblin'], ['ogro', '', 'Ogro'], ['caveira', '', 'Caveira'],
  ['abobora', '', 'Abóbora'], ['bola_cristal', '', 'Bola de cristal'], ['dragao_bebe', '', 'Dragão bebê'], ['mamute', '', 'Mamute'], ['dodo', '', 'Dodô']];
MISTICOS.forEach(m => { m[3] = 'mistico'; ANIMAIS.push(m); });
const miniMasc = a => `icons/anim/mini/${a[0]}.webp?v=1`;
const ANIMAL_MOV = { fada: 'voar', fado: 'voar', genio: 'flutuar', fantasma: 'flutuar', heroi: 'voar', sereia: 'nadar', tritao: 'nadar', dragao_bebe: 'voar', aguia: 'voar', falcao: 'voar', coruja: 'voar', papagaio: 'voar', passaro: 'voar', borboleta: 'voar', abelha: 'voar', morcego: 'voar', dragao: 'voar', flamingo: 'flutuar', cisne: 'nadar', pato: 'nadar',
  peixe: 'nadar', peixe_tropical: 'nadar', baiacu: 'nadar', tubarao: 'nadar', golfinho: 'nadar', baleia: 'nadar', polvo: 'nadar', lula: 'nadar', foca: 'nadar', lontra: 'nadar', tartaruga: 'nadar', canguru: 'pular', coelho: 'pular', sapo: 'pular' };
const ACESS_CHAPEU = [['nenhum', ''], ['bone', '🧢'], ['coroa', '👑'], ['cartola', '🎩'], ['formatura', '🎓'], ['capacete', '⛑️'], ['laco', '🎀'], ['fone', '🎧']];
const ACESS_OCULOS = [['nenhum', ''], ['escuro', '🕶️'], ['gamer', '🥽'], ['redondo', '👓']];
const ACESS_AURA = [['nenhuma', ''], ['estrela', '⭐'], ['fogo', '🔥'], ['raio', '⚡'], ['brilho', '✨'], ['arco', '🌈'], ['diamante', '💎'], ['varinha', '🪄'], ['cristal', '🔮']];
const MOVS_ANIMAL = [['auto', '🤖 Do animal'], ['flutuar', '🎈 Flutuar'], ['pular', '🦘 Pular'], ['dancar', '🕺 Dançar'], ['voar', '🪽 Voar'], ['nadar', '🌊 Nadar'], ['girar', '🌀 Girar']];
const CORES_FUNDO = ['#2f3f86', '#7b5cff', '#16a34a', '#e11d48', '#f59e0b', '#0ea5e9', '#111827', '#ec4899'];
const ehAnimal = m => (m.tipo || 'animal') === 'animal';
const img3d = (e, cls = '') => e ? `<img class="${cls}" src="icons/3d/${chaveEmoji(e)}.webp" alt="" draggable="false">` : '';
const semAcento = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
function filtrarMascotes(q) {
  const box = document.querySelector('.modal .masc-grupo'); if (!box) return; const t = semAcento(q).trim(); let n = 0;
  box.querySelectorAll('.grade-animais button').forEach(b => { const ok = !t || b.dataset.nome.includes(t) || b.dataset.v.includes(t); b.hidden = !ok; if (ok) n++; });
  box.querySelectorAll('.sub-grade').forEach(g => { g.hidden = ![...g.querySelectorAll('button')].some(b => !b.hidden); });
  const sem = $('#semMasc'); if (!sem) return;
  sem.hidden = !t || n > 0;
  if (t && !n) sem.innerHTML = `Ainda não tenho <b>"${esc(q.trim())}"</b>. ${S.papel === 'filho' ? `<button type="button" class="btn pri sm" style="width:auto;margin-top:6px" data-act="sugerirMascote" data-v="${esc(q.trim().slice(0, 40))}">💡 Sugerir para o pai</button>` : '<br><span class="mut peq">Peça para adicionar esse personagem na próxima versão.</span>'}`;
}
function animalVisual(m, tam) {
  const a = ANIMAIS.find(x => x[0] === m.animal) || ANIMAIS[0];
  const mov = (m.movAnimal && m.movAnimal !== 'auto') ? m.movAnimal : (ANIMAL_MOV[a[0]] || 'flutuar');
  const ch = (ACESS_CHAPEU.find(x => x[0] === m.chapeuA) || [])[1], oc = (ACESS_OCULOS.find(x => x[0] === m.oculosA) || [])[1], au = (ACESS_AURA.find(x => x[0] === m.aura) || [])[1];
  return `<div class="masc-animal sem3d mov-${mov}${m._dormindo ? ' dormindo' : ''}" style="width:${tam}px;height:${tam}px;--fundo:${esc(m.fundo || '#2f3f86')}">
    ${m.fundo ? '<span class="aura-fundo"></span>' : ''}${au ? `<span class="aura-orbita">${img3d(au)}</span>` : ''}
    <div class="corpo-animal"><img class="bicho" src="icons/anim/${a[0]}.webp?v=1" onerror="this.onerror=null;this.src='${miniMasc(a)}'" alt="${esc(a[2])}" draggable="false">${img3d(ch, 'acc-chapeu')}${img3d(oc, 'acc-oculos')}</div><span class="sombra-animal"></span></div>`;
}
/* ---------- BICHINHO VIRTUAL: comer, beber, carinho e dormir ---------- */
const H = 36e5, clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const petDe = id => { const p = id === 'pai' ? S.config.pet_pai : (S.dados.filhos.find(f => f.id === id) || {}).pet; return p && typeof p === 'object' ? { ...p } : {}; };
function statusPet(p, agora = Date.now()) {
  const desde = k => p[k] ? (agora - p[k]) / H : 6;
  const fome = clamp(100 - desde('comeu') * 12), sede = clamp(100 - desde('bebeu') * 16), carinho = clamp(100 - desde('carinho') * 10);
  let energia;
  if (p.dormindo) energia = clamp((p.energia ?? 60) + ((agora - (p.dormiu || agora)) / H) * 30);
  else energia = clamp((p.energia ?? 80) - ((agora - (p.acordou || agora)) / H) * 6);
  const humor = Math.round((fome + sede + carinho + energia) / 4);
  const nivel = Math.floor((p.xp || 0) / 50) + 1;
  return { fome: Math.round(fome), sede: Math.round(sede), carinho: Math.round(carinho), energia: Math.round(energia), humor, nivel, xp: p.xp || 0, dormindo: !!p.dormindo };
}
function pedidoPet(st, nome) {
  if (st.dormindo) return `${nome} está dormindo 💤`;
  if (st.fome < 30) return `${nome} está com fome! 🍖`;
  if (st.sede < 30) return `${nome} está com sede! 💧`;
  if (st.energia < 25) return `${nome} está com sono 😴`;
  if (st.carinho < 30) return `${nome} quer carinho 🤚`;
  return '';
}
const COMIDA = { gato: '🐟', gatinho: '🐟', cachorro: '🦴', cao: '🦴', coelho: '🥕', hamster: '🥜', esquilo: '🥜', macaco: '🍌', gorila: '🍌', panda: '🎋', coala: '🌿', cavalo: '🥕', unicornio: '🍓', vaca: '🌾', ovelha: '🌾', bode: '🌾',
  urso: '🍯', urso_polar: '🐟', pinguim: '🐟', foca: '🐟', lontra: '🐟', tubarao: '🐟', golfinho: '🐟', baleia: '🦐', abelha: '🌻', borboleta: '🌸', vampiro: '🍅', vampira: '🍅', zumbi: '🧠', robo: '🔋', alien: '🍕', monstro: '🍕', fantasma: '🍬', bruxo: '🍬', bruxa: '🍬', mago: '🍬' };
const ACOES_PET = { comer: ['🍖', 'Comida', 'comeu', 'Hmm, que delícia! Obrigado!'], beber: ['💧', 'Água', 'bebeu', 'Ahh, refrescante!'], carinho: ['🤚', 'Carinho', 'carinho', 'Eu adoro carinho! ❤️'], dormir: ['😴', 'Dormir', '', 'Boa noite… zzz'] };
async function cuidarPet(acao) {
  const dono = S.papel === 'pai' ? 'pai' : S.eu; const m = mascoteDe(dono); const p = petDe(dono); const agora = Date.now(); const st = statusPet(p, agora);
  let fala = '';
  if (acao === 'dormir') {
    if (p.dormindo) { p.energia = st.energia; p.dormindo = false; p.acordou = agora; fala = 'Bom dia! Acordei cheio de energia! ☀️'; }
    else { p.energia = st.energia; p.dormindo = true; p.dormiu = agora; fala = ACOES_PET.dormir[3]; }
  } else {
    if (p.dormindo) return toast(`${m.nome} está dormindo. Acorde primeiro 😴`);
    const [, , campo, f] = ACOES_PET[acao];
    const antes = st[acao === 'comer' ? 'fome' : acao === 'beber' ? 'sede' : 'carinho'];
    if (antes > 92) { fala = acao === 'comer' ? 'Estou cheio! Mais tarde 😅' : acao === 'beber' ? 'Já bebi bastante! 😄' : 'Hehe, já ganhei muito carinho hoje! 🥰'; }
    else { p[campo] = agora; p.xp = (p.xp || 0) + 5; fala = f; }
    if (!p.acordou) { p.acordou = agora; p.energia = st.energia; }
  }
  const nivelAntes = st.nivel;
  if (dono === 'pai') S.config.pet_pai = p; else { const f = S.dados.filhos.find(x => x.id === dono); if (f) f.pet = p; }
  festaPet(acao === 'comer' ? (COMIDA[m.animal] || '🍖') : ACOES_PET[acao][0]);
  if (m.voz !== false) falar(fala);
  const novo = statusPet(p); if (novo.nivel > nivelAntes) setTimeout(() => toast(`🎉 ${m.nome} subiu para o nível ${novo.nivel}!`, 'ok'), 600);
  atualizarPetUI(); render();
  try { await DB.rpc('mok_pet', { p_pet: p }); } catch (e) { console.warn(e); }
  const fl = document.querySelector('.fala-pet'); if (fl) fl.textContent = fala;
}
function festaPet(e) {
  document.querySelectorAll('.masc-palco, .flut-masc').forEach(alvo => {
    for (let i = 0; i < 6; i++) { const s = document.createElement('span'); s.className = 'particula-pet'; s.textContent = e; s.style.left = (30 + Math.random() * 40) + '%'; s.style.animationDelay = (i * 0.08) + 's'; alvo.appendChild(s); setTimeout(() => s.remove(), 1600); }
  });
}
function barrasPet(st) {
  const b = (e, t, v) => `<div class="barra-pet"><span>${e} ${t}</span><div class="barra"><i style="width:${v}%;background:${v < 30 ? '#ef4444' : v < 60 ? '#f59e0b' : '#22c55e'}"></i></div><b>${v}%</b></div>`;
  return `<div class="pet-status">${b('🍖', 'Fome', st.fome)}${b('💧', 'Sede', st.sede)}${b('❤️', 'Carinho', st.carinho)}${b('⚡', 'Energia', st.energia)}
    <div class="linha peq" style="margin-top:4px"><span class="esp">⭐ Nível <b>${st.nivel}</b> · ${st.xp % 50}/50 XP</span><span>${st.humor >= 70 ? '😄 Feliz' : st.humor >= 40 ? '🙂 Ok' : '😢 Precisa de você'}</span></div></div>`;
}
function cardPet(dono) {
  const m = mascoteDe(dono); const st = statusPet(petDe(dono));
  return `<div class="card-pet"><div class="linha"><b class="esp">🐾 Cuidar do ${esc(m.nome)}</b>${st.dormindo ? '<span class="tag">💤 dormindo</span>' : ''}</div>${barrasPet(st)}
    <div class="acoes-pet">${Object.entries(ACOES_PET).map(([k, [e, t]]) => `<button class="btn ghost sm" data-act="petAcao" data-v="${k}" ${st.dormindo && k !== 'dormir' ? 'disabled' : ''}>${k === 'comer' ? (COMIDA[m.animal] || e) : k === 'dormir' && st.dormindo ? '☀️' : e}<br><small>${k === 'dormir' && st.dormindo ? 'Acordar' : t}</small></button>`).join('')}</div>
    <div class="fala-pet mut peq">${esc(pedidoPet(st, m.nome) || 'Cuide dele todo dia para ele subir de nível!')}</div></div>`;
}
function atualizarPetUI() { const c = document.querySelector('.modal .card-pet'); if (c) c.outerHTML = cardPet(S.papel === 'pai' ? 'pai' : S.eu); }
setInterval(() => { if (S.papel && !document.querySelector('.modal')) { const fm = document.querySelector('.flut-masc .balao'); if (fm) fm.textContent = dicaMascote(); } }, 60000);

/* boneco 3D (Three.js). Sem 3D no aparelho, usa o desenho. */
function mascoteVisual(m, tam = 80) {
  if (ehAnimal(m)) return animalVisual(m, tam);
  if (window.Masc3D && window.Masc3D.ok === false) return mascoteSVG(m, tam);
  return `<canvas class="masc3d sem3d" data-m="${esc(JSON.stringify({ ...MASC_PADRAO, ...m }))}" style="width:${tam}px;height:${Math.round(tam * 1.3)}px"></canvas>`;
}
import(new URL('lib/three/mascote3d.js?v=1', location.href).href).then(() => { if (!window.Masc3D.ok) render(); }).catch(() => { window.Masc3D = { ok: false }; render(); });
/* fala do mascote (voz do próprio celular) */
function falar(txt) {
  try {
    if (!('speechSynthesis' in window)) return false; speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(txt.replace(/[\u{1F000}-\u{1FAFF}☀-➿]/gu, '')); u.lang = 'pt-BR'; u.rate = 1.05; u.pitch = 1.15;
    const v = speechSynthesis.getVoices().find(x => /pt[-_]BR/i.test(x.lang)); if (v) u.voice = v;
    speechSynthesis.speak(u); return true;
  } catch { return false; }
}
function saudacao() { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; }
function textoMascote(curto = false) {
  if (S.papel === 'pai') {
    const r = resumoPai(); let t = `${saudacao()}, ${nomePai()}! `;
    r.filhos.forEach(({ f, total, feitas }) => { if (total) t += feitas >= total ? `${f.nome} já fez todas as tarefas de hoje. ` : `${f.nome} fez ${feitas} de ${total} tarefas. `; });
    if (r.imgs) t += `Tem ${r.imgs} ${r.imgs === 1 ? 'imagem' : 'imagens'} esperando a sua aprovação. `;
    if (r.aprovar) t += `${r.aprovar} ${r.aprovar === 1 ? 'tarefa concluída espera' : 'tarefas concluídas esperam'} você conferir. `;
    if (r.peds) t += `${r.peds} ${r.peds === 1 ? 'pedido de permissão' : 'pedidos de permissão'} para responder. `;
    r.provas.slice(0, curto ? 1 : 3).forEach(({ p, f }) => { t += `Atenção: prova de ${p.materia} do ${f.nome} ${faltaTxt(p)}. `; });
    if (!r.imgs && !r.aprovar && !r.peds) t += 'Nada pendente para você agora. ';
    return t.trim();
  }
  const f = filhoAtual(); const dia = hojeISO(); const st = statusDia();
  const pend = tarefasDoDia(dia, ['casa', 'trabalho']).filter(t => !ehFeita(regDe(t, dia)));
  let t = `${saudacao()}, ${f.nome}! `;
  if (!pend.length) t += st.total ? 'Você já fez tudo hoje. Jogo liberado! Mandou muito bem. ' : 'Hoje não tem tarefa obrigatória. Aproveite! ';
  else {
    t += `Hoje faltam ${pend.length} ${pend.length === 1 ? 'tarefa' : 'tarefas'}: `;
    t += pend.slice(0, curto ? 2 : 6).map(x => x.titulo + (x.horario ? ` às ${x.horario.replace(':00', ' horas').replace(':', ' e ')}` : '')).join(', ') + (pend.length > (curto ? 2 : 6) ? ' e mais algumas' : '') + '. ';
    t += 'Termina tudo para liberar o jogo! ';
  }
  const p = provasFuturas()[0]; if (p && corProva(p) === 'vermelho') t += `E atenção: prova de ${p.materia} ${faltaTxt(p)}. `;
  return t.trim();
}
function cumprimentoDoDia() {
  const m = mascoteDe(S.eu); if (m.voz === false || (S.papel === 'pai' && !m.voz)) return;
  const k = 'mok_ola_' + hojeISO(); if (lsGet(k)) return;
  const vai = () => { if (lsGet(k)) return; lsSet(k, 1); falar(textoMascote(true)); document.removeEventListener('pointerdown', vai); };
  document.addEventListener('pointerdown', vai); // navegadores só liberam a voz depois do primeiro toque
}
let MASC_EDIT = {}, MASC_ID = '';
function modalMascote(id, rascunho) {
  MASC_ID = id;
  if (!podeEditarPerfil(id)) return toast('Você só pode personalizar o seu mascote.', 'bad');
  MASC_EDIT = rascunho ? { ...rascunho } : mascoteDe(id);
  const cores = k => MASC_OPC[k].map(v => `<button type="button" class="cor-opc ${MASC_EDIT[k] === v ? 'on' : ''}" style="background:${v}" data-act="mascoteOpc" data-k="${k}" data-v="${v}"></button>`).join('') + `<label class="cor-livre" title="Escolher qualquer cor"><input type="color" value="${esc(MASC_EDIT[k])}" data-change="mascoteCor" data-k="${k}">🎨</label>`;
  const opcs = k => MASC_OPC[k].map(v => `<button type="button" class="opc ${MASC_EDIT[k] === v ? 'on' : ''}" data-act="mascoteOpc" data-k="${k}" data-v="${v}">${MASC_NOMES[v] || v}</button>`).join('');
  modal(`<button class="icone-btn fechar" data-act="fechar">✕</button><h2>🎨 ${id === 'pai' || id === S.eu ? 'Meu mascote' : 'Mascote de ' + esc(nomeFilho(id))}</h2>
    <div class="masc-preview">${mascoteVisual(MASC_EDIT, 190)}</div>
    <label class="campo"><span>Nome do mascote</span><input id="mascNome" value="${esc(MASC_EDIT.nome)}" maxlength="20" placeholder="Dê um nome"></label>
    <label class="check"><input type="checkbox" id="mascVoz" ${MASC_EDIT.voz !== false ? 'checked' : ''}> 🔊 Falar comigo (bom dia e tarefas)</label>
    <button type="button" class="btn ghost sm" style="margin:6px 0 12px" data-act="mascoteTestarVoz">▶️ Ouvir o mascote</button>
    <div class="abas-img" style="margin-bottom:12px"><button type="button" class="${ehAnimal(MASC_EDIT) ? 'on' : ''}" data-act="mascoteTipo" data-v="animal">🐾 Animais e místicos</button><button type="button" class="${ehAnimal(MASC_EDIT) ? '' : 'on'}" data-act="mascoteTipo" data-v="humano">🧑 Boneco</button></div>
    ${ehAnimal(MASC_EDIT) ? `
      <div class="masc-grupo"><span>Escolha o seu mascote (${ANIMAIS.length})</span>
        <div class="busca-masc"><input id="buscaMasc" class="inp" placeholder="🔎 Procurar: gato, dragão, bruxo, fada…" autocomplete="off"></div>
        <div id="semMasc" class="sugerir-masc" hidden></div>
        ${[['animal', '🐾 Animais'], ['mistico', '✨ Místicos e fantasia']].map(([g, t]) => `<div class="sub-grade" data-g="${g}"><b class="mut peq">${t}</b><div class="grade-animais">${ANIMAIS.filter(a => (a[3] || 'animal') === g).map(a => `<button type="button" class="${MASC_EDIT.animal === a[0] ? 'on' : ''}" data-act="mascoteOpc" data-k="animal" data-v="${a[0]}" data-nome="${esc(semAcento(a[2]))}" title="${esc(a[2])}"><img src="${miniMasc(a)}" alt="" loading="lazy"><small>${esc(a[2])}</small></button>`).join('')}</div></div>`).join('')}</div>
      <div class="masc-grupo"><span>Movimento</span><div class="masc-opcs">${MOVS_ANIMAL.map(([v, n]) => `<button type="button" class="opc ${(MASC_EDIT.movAnimal || 'auto') === v ? 'on' : ''}" data-act="mascoteOpc" data-k="movAnimal" data-v="${v}">${n}</button>`).join('')}</div></div>
      <div class="masc-grupo"><span>Na cabeça</span><div class="masc-opcs">${ACESS_CHAPEU.map(([v, e]) => `<button type="button" class="opc ${(MASC_EDIT.chapeuA || 'nenhum') === v ? 'on' : ''}" data-act="mascoteOpc" data-k="chapeuA" data-v="${v}">${e || 'Nenhum'}</button>`).join('')}</div></div>
      <div class="masc-grupo"><span>Óculos</span><div class="masc-opcs">${ACESS_OCULOS.map(([v, e]) => `<button type="button" class="opc ${(MASC_EDIT.oculosA || 'nenhum') === v ? 'on' : ''}" data-act="mascoteOpc" data-k="oculosA" data-v="${v}">${e || 'Nenhum'}</button>`).join('')}</div></div>
      <div class="masc-grupo"><span>Efeito</span><div class="masc-opcs">${ACESS_AURA.map(([v, e]) => `<button type="button" class="opc ${(MASC_EDIT.aura || 'nenhuma') === v ? 'on' : ''}" data-act="mascoteOpc" data-k="aura" data-v="${v}">${e || 'Nenhum'}</button>`).join('')}</div></div>
      <div class="masc-grupo"><span>Brilho de fundo</span><div class="masc-opcs"><button type="button" class="opc ${!MASC_EDIT.fundo ? 'on' : ''}" data-act="mascoteOpc" data-k="fundo" data-v="">Nenhum</button>${CORES_FUNDO.map(c => `<button type="button" class="cor-opc ${MASC_EDIT.fundo === c ? 'on' : ''}" style="background:${c}" data-act="mascoteOpc" data-k="fundo" data-v="${c}"></button>`).join('')}</div></div>`
    : Object.keys(MASC_OPC).map(k => `<div class="masc-grupo"><span>${MASC_ROT[k]}</span><div class="masc-opcs">${MASC_CORES.includes(k) ? cores(k) : opcs(k)}</div></div>`).join('')}
    <button class="btn ok" style="margin-top:10px" data-act="mascoteSalvar" data-id="${esc(id)}">💾 Salvar mascote</button>`);
}
function dicaMascote() {
  { const dono = S.papel === 'pai' ? 'pai' : S.eu; if (dono) { const ped = pedidoPet(statusPet(petDe(dono)), mascoteDe(dono).nome); if (ped && lsGet('mok_ola_' + hojeISO())) return ped; } }
  if (S.papel === 'pai') {
    const r = resumoPai();
    if (!lsGet('mok_ola_' + hojeISO())) return `${saudacao()}, ${nomePai()}! Toque em mim 👋`;
    if (r.imgs) return `${r.imgs} ${r.imgs === 1 ? 'imagem' : 'imagens'} para aprovar 🖼️`;
    if (r.aprovar) return `${r.aprovar} ${r.aprovar === 1 ? 'tarefa' : 'tarefas'} para conferir ✅`;
    if (r.peds) return `${r.peds} ${r.peds === 1 ? 'pedido' : 'pedidos'} esperando você 🔐`;
    if (r.provas[0]) return `Prova do ${r.provas[0].f.nome} ${faltaTxt(r.provas[0].p)} 📚`;
    return `Tudo em dia, ${nomePai()}! 👍`;
  }
  const st = statusDia(); const p = provasFuturas()[0];
  if (p && corProva(p) === 'vermelho') return `Prova de ${p.materia} ${faltaTxt(p)}! 📚`;
  if (!lsGet('mok_ola_' + hojeISO())) return `${saudacao()}, ${filhoAtual().nome}! Toque em mim 👋`;
  if (st.total && !st.liberado) return `Faltam ${st.total - st.feitas} tarefas para liberar o jogo 🎮`;
  if (st.liberado) return 'Tudo feito! Jogo liberado 🎮';
  return `${saudacao()}, ${filhoAtual().nome}! 👋`;
}
function modalAssistentePai() {
  const m = mascoteDe('pai'); const r = resumoPai();
  modal(`<button class="icone-btn fechar" data-act="fechar">✕</button><div class="centro masc-palco">${mascoteVisual({ ...m, _dormindo: statusPet(petDe(S.papel === 'pai' ? 'pai' : S.eu)).dormindo }, 150)}</div>
    <h2 class="centro" style="margin-top:4px">${saudacao()}, ${esc(nomePai())}! Eu sou o ${esc(m.nome)} 👋</h2>
    <div class="fala">${esc(textoMascote())}</div><button class="btn ghost sm" style="margin-top:6px" data-act="mascoteFalar">🔊 Ouvir de novo</button>
    ${cardPet('pai')}
    <div class="assist">
      ${r.filhos.map(({ f, total, feitas }) => `<div class="${!total || feitas >= total ? 'ok' : ''}">${esc(f.nome)}: <b>${feitas}/${total}</b> tarefas hoje${total && feitas >= total ? ' · 🎮 jogo liberado' : ''}</div>`).join('')}
      <div class="${r.imgs ? 'bad' : ''}">🖼️ Imagens para aprovar: <b>${r.imgs}</b></div>
      <div class="${r.aprovar ? 'bad' : ''}">✅ Tarefas para conferir: <b>${r.aprovar}</b></div>
      <div class="${r.peds ? 'bad' : ''}">🔐 Pedidos de permissão: <b>${r.peds}</b></div>
      ${r.provas.length ? r.provas.slice(0, 3).map(({ p, f }) => `<div class="bad">📚 ${esc(f.nome)}: <b>${esc(nomeProva(p))}</b> · ${faltaTxt(p)}</div>`).join('') : '<div>📚 Nenhuma prova nesta semana.</div>'}
    </div>
    <div class="grid2" style="margin-top:12px"><button class="btn pri" data-act="ir" data-tela="work">🖼️ Ver imagens</button><button class="btn ghost" data-act="ir" data-tela="tarefas">✅ Tarefas</button>
    <button class="btn ghost" data-act="chatAbrir">💬 Chat</button><button class="btn ghost" data-act="mascoteEditar" data-id="pai">🎨 Personalizar</button></div>`);
}
function modalAssistente() {
  if (S.papel === 'pai') return modalAssistentePai();
  const m = mascoteDe(S.eu); const st = statusDia(); const fut = provasFuturas(); const c = carteira();
  const pend = tarefasDoDia(hojeISO(), ['casa']).filter(t => !ehFeita(regDe(t, hojeISO())));
  modal(`<button class="icone-btn fechar" data-act="fechar">✕</button><div class="centro masc-palco">${mascoteVisual({ ...m, _dormindo: statusPet(petDe(S.papel === 'pai' ? 'pai' : S.eu)).dormindo }, 150)}</div>
    <h2 class="centro" style="margin-top:4px">${saudacao()}, ${esc(filhoAtual().nome)}! Eu sou o ${esc(m.nome)} 👋</h2>
    <div class="fala">${esc(textoMascote())}</div><button class="btn ghost sm" style="margin-top:6px" data-act="mascoteFalar">🔊 Ouvir de novo</button>
    ${cardPet(S.eu)}
    <div class="assist">
      <div class="${st.liberado || !st.total ? 'ok' : 'bad'}">${st.total ? (st.liberado ? '🎮 Jogo liberado! Mandou bem.' : `🔒 Faltam <b>${st.total - st.feitas}</b> tarefas para liberar o jogo.`) : '🎮 Sem tarefas obrigatórias hoje.'}</div>
      ${pend.length ? `<div>✅ Próxima tarefa: <b>${esc(pend[0].titulo)}</b>${pend[0].horario ? ' às ' + pend[0].horario : ''}</div>` : ''}
      ${fut[0] ? `<div class="${corProva(fut[0]) === 'vermelho' ? 'bad' : ''}">📚 Próxima prova: <b>${esc(nomeProva(fut[0]))}</b> · ${faltaTxt(fut[0])}</div>` : '<div>📚 Nenhuma prova marcada.</div>'}
      <div>💰 A receber: <b>${brl(c.saldo)}</b></div>
    </div>
    <div class="grid2" style="margin-top:12px"><button class="btn pri" data-act="chatAbrir">💬 Falar com o pai</button><button class="btn zap" data-act="whats">📲 WhatsApp</button>
    <button class="btn ghost" data-act="ir" data-tela="estudo">📚 Minhas provas</button><button class="btn ghost" data-act="mascoteEditar">🎨 Personalizar</button></div>`);
}
function flutuantes() {
  const nl = S.papel === 'pai' ? naoLidas() : naoLidas(S.eu);
  const pos = k => { const p = lsGet('mok_pos_' + k); return p ? `style="left:${Math.min(p.x, innerWidth - 60)}px;top:${Math.min(p.y, innerHeight - 70)}px;right:auto;bottom:auto"` : ''; };
  let h = `<button class="flut-chat" data-arrastar="chat" ${pos('chat')} data-act="chatAbrir" title="Chat (arraste para mover)">💬${nl ? `<span class="badge">${nl}</span>` : ''}</button>`;
  if (S.papel === 'filho' || S.papel === 'pai') { const m = { ...mascoteDe(S.eu), _dormindo: statusPet(petDe(S.eu)).dormindo }; const d = dicaMascote(); h += `<button class="flut-masc" data-arrastar="masc" ${pos('masc')} data-act="mascote" title="${esc(m.nome)} (arraste para mover)"><span class="balao">${esc(d)}</span>${mascoteVisual(m, 72)}</button>`; }
  if (S.chatAberto) h += `<div class="chat-flut-bg" data-act="chatFechar"></div><div class="chat-flut"><div class="linha" style="margin-bottom:6px"><b class="esp">💬 Chat</b><button class="btn zap sm" style="width:auto" data-act="whats">📲 WhatsApp</button><button class="icone-btn" data-act="chatFechar">✕</button></div>${telaChat()}</div>`;
  return h;
}

/* ---------- WHATSAPP: notas e prints direto para o WhatsApp ---------- */
const numZap = n => { n = String(n || '').replace(/\D/g, ''); if (!n) return ''; return n.length <= 11 ? '55' + n : n; };
function modalWhats() {
  const f = filhoAtual(); const meu = S.papel === 'pai' ? numZap(S.config.whatsapp_pai) : numZap(f.whatsapp);
  const pai = numZap(S.config.whatsapp_pai);
  modal(`<button class="icone-btn fechar" data-act="fechar">✕</button><h2>📲 Enviar pelo WhatsApp</h2>
    <p class="mut peq">Escreva uma nota e/ou anexe um print ou foto.</p>
    <label class="campo"><span>Nota</span><textarea id="zapTxt" rows="4" placeholder="Ex.: matéria da prova de quinta: capítulos 3 e 4"></textarea></label>
    <label class="campo"><span>Print ou foto (opcional)</span><input type="file" id="zapArq" accept="image/*,application/pdf"></label>
    <div class="grid2">${S.papel === 'filho' ? `<button class="btn zap" data-act="whatsEnviar" data-para="eu" ${meu ? '' : 'disabled'}>Para o MEU WhatsApp</button>` : ''}
    ${S.papel === 'filho' ? `<button class="btn zap" data-act="whatsEnviar" data-para="pai" ${pai ? '' : 'disabled'}>Para o Pai</button>` : `<button class="btn zap" data-act="whatsEnviar" data-para="filho" ${numZap(f.whatsapp) ? '' : 'disabled'}>Para ${esc(f.nome)}</button>`}</div>
    ${S.papel === 'filho' && !meu ? '<p class="mut peq">Para usar "Meu WhatsApp", coloque seu número em Perfil → Editar perfil.</p>' : ''}
    <p class="mut peq">Com print/foto, o celular abre a lista de apps: escolha <b>WhatsApp</b> e o contato.</p>`);
}
async function enviarWhats(para) {
  const txt = ($('#zapTxt').value || '').trim(); const arq = $('#zapArq').files[0];
  const num = para === 'pai' ? numZap(S.config.whatsapp_pai) : para === 'filho' ? numZap(filhoAtual().whatsapp) : numZap(S.papel === 'pai' ? S.config.whatsapp_pai : filhoAtual().whatsapp);
  const corpo = (txt || (arq ? '📎 Segue o arquivo' : '')) + `\n\n— enviado pelo TáFeito`;
  if (arq && navigator.canShare && navigator.canShare({ files: [arq] })) {
    try { await navigator.share({ files: [arq], text: corpo }); fecharModais(); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  if (!num) return toast('Número de WhatsApp não cadastrado.', 'bad');
  if (arq) toast('Neste aparelho não dá para anexar direto: o WhatsApp vai abrir com a nota; anexe o print pelo clipe 📎.', '');
  window.open(`https://wa.me/${num}?text=${encodeURIComponent(corpo)}`, '_blank'); fecharModais();
}

/* ---------- IMAGENS DO WORK (feed e story) ---------- */
const URLS_IMG = {};
function resumoImagens(id = fid()) {
  const l = deFilho('imagens', id); const f = S.dados.filhos.find(x => x.id === id) || {}; const g = Math.max(1, num(f.tamanho_grupo ?? 10));
  const ok = l.filter(i => i.status !== 'reprovada');
  return { total: l.length, feed: l.filter(i => i.formato === 'feed').length, story: l.filter(i => i.formato === 'story').length, grupos: Math.floor(ok.length / g), faltam: g - (ok.length % g), g, valor: ok.reduce((s, i) => s + num(i.valor), 0), vi: num(f.valor_imagem ?? 1),
    aprovadas: l.filter(i => i.status === 'aprovada').length, reprovadas: l.filter(i => i.status === 'reprovada').length, pendentes: l.filter(i => !i.status || i.status === 'pendente').length, drive: l.filter(i => i.drive_id).length };
}
function secaoImagens() {
  const r = resumoImagens(); const aba = S.abaImg || 'feed'; const filtro = S.filtroImg || 'todas';
  const st = i => i.status || 'pendente';
  const daAba = deFilho('imagens').filter(i => i.formato === aba);
  const l = daAba.filter(i => filtro === 'todas' || st(i) === filtro).sort((a, b) => b.numero - a.numero);
  const cnt = k => daAba.filter(i => st(i) === k).length;
  setTimeout(carregarMiniaturas, 50);
  return `${dash('🖼️ Minhas imagens', [{ n: r.total, r: 'imagens criadas', c: 'azul' }, { n: r.feed, r: 'feed', c: 'verde' }, { n: r.story, r: 'story', c: 'roxo' },
      { n: r.aprovadas, r: '✅ aprovadas', c: 'verde' }, { n: r.reprovadas, r: '❌ não aprovadas', c: 'vermelho' }, { n: r.pendentes, r: '⏳ aguardando', c: 'amarelo' },
      { n: r.grupos, r: `grupos de ${r.g}`, c: 'amarelo' }, { n: brl(r.valor), r: 'ganho com imagens', c: 'verde' }],
      `<div class="dash-st info">Cada imagem vale <b>${brl(r.vi)}</b> · cada grupo de ${r.g} = <b>${brl(r.vi * r.g)}</b> · faltam ${r.faltam} para o próximo grupo · imagem não aprovada não conta${r.drive ? ` · ☁️ ${r.drive} no Drive` : ''}</div>`)}
    ${S.papel === 'filho' ? `<button class="dropzone" data-act="enviarImagens"><span style="font-size:1.8rem">📤</span><div><b>Enviar imagens</b><br><span class="peq">Uma por vez ou todas de uma vez · Feed e Story vão para pastas separadas</span></div></button>` : ''}
    <div class="card"><div class="abas-img"><button class="${aba === 'feed' ? 'on' : ''}" data-act="abaImg" data-aba="feed">📁 Feed (${r.feed})</button><button class="${aba === 'story' ? 'on' : ''}" data-act="abaImg" data-aba="story">📁 Story (${r.story})</button></div>
      ${S.papel === 'pai' && l.length ? `<button class="btn pri sm" style="margin:10px 0" data-act="baixarPasta" data-aba="${aba}">⬇️ Baixar pasta ${aba === 'feed' ? 'Feed' : 'Story'} (${l.length}) em .zip</button>` : ''}
      <div class="filtro-img">${[['todas', 'Todas', daAba.length], ['pendente', '⏳ Aguardando', cnt('pendente')], ['aprovada', '✅ Aprovadas', cnt('aprovada')], ['reprovada', '❌ Não aprovadas', cnt('reprovada')]]
        .map(([k, t, n]) => `<button class="${filtro === k ? 'on' : ''}" data-act="filtroImg" data-v="${k}">${t} <b>${n}</b></button>`).join('')}</div>
      ${l.length ? `<div class="galeria ${aba}">${l.map(i => `<div class="img-card st-${st(i)}" data-id="${esc(i.id)}"><div class="img-item"><img data-caminho="${esc(i.caminho)}" alt="#${i.numero}" loading="lazy" data-act="verImg" data-id="${esc(i.id)}"><span class="num">#${i.numero}</span><span class="nf">${aba === 'feed' ? 'F' : 'S'}${i.numero_formato}</span>
        ${st(i) !== 'pendente' ? `<span class="selo-img sem3d">${st(i) === 'aprovada' ? '✔' : '✖'}</span>` : ''}
        <div class="img-acoes"><button class="icone-btn" data-act="baixarImg" data-id="${esc(i.id)}" title="Baixar">⬇️</button>${S.papel === 'pai' ? `<button class="icone-btn" data-act="apagarImg" data-id="${esc(i.id)}" title="Apagar">🗑️</button>` : ''}</div></div>
        ${S.papel === 'pai' ? `<div class="check-img sem3d"><button class="ck-v ${st(i) === 'aprovada' ? 'on' : ''}" data-act="aprovarImg" data-id="${esc(i.id)}" title="Aprovar">✔</button><button class="ck-x ${st(i) === 'reprovada' ? 'on' : ''}" data-act="reprovarImg" data-id="${esc(i.id)}" title="Não aprovar">✖</button></div>`
          : `<div class="st-txt">${st(i) === 'aprovada' ? '✅ Aprovada' : st(i) === 'reprovada' ? '❌ Não aprovada' : '⏳ Aguardando'}</div>`}
        ${st(i) === 'reprovada' && i.motivo ? `<div class="motivo-img"><b>Por quê:</b> ${esc(i.motivo)}</div>` : ''}</div>`).join('')}</div>`
      : `<div class="vazio"><span class="e">🖼️</span>${filtro === 'todas' ? `Nenhuma imagem de ${aba} ainda.` : 'Nenhuma imagem neste filtro.'}</div>`}</div>`;
}
/* abrir a imagem grande para analisar (toque/clique) — setas, arrastar para os lados, zoom com toque duplo */
let VISOR = null;
function abrirVisor(id) {
  const aba = S.abaImg || 'feed', filtro = S.filtroImg || 'todas';
  const lista = deFilho('imagens').filter(i => i.formato === aba && (filtro === 'todas' || (i.status || 'pendente') === filtro)).sort((a, b) => b.numero - a.numero);
  VISOR = { lista: lista.map(i => i.id), pos: Math.max(0, lista.findIndex(i => i.id === id)), zoom: false };
  desenharVisor();
}
function desenharVisor() {
  let v = document.getElementById('visorImg'); if (!VISOR) { v && v.remove(); return; }
  const i = S.dados.imagens.find(x => x.id === VISOR.lista[VISOR.pos]); if (!i) { VISOR = null; v && v.remove(); return; }
  const st = i.status || 'pendente'; const u = URLS_IMG[i.caminho];
  if (!v) { v = document.createElement('div'); v.id = 'visorImg'; v.className = 'visor-img'; document.body.appendChild(v); }
  v.innerHTML = `<div class="visor-topo"><b>${i.formato === 'feed' ? 'F' : 'S'}${i.numero_formato} · #${i.numero}</b><span class="esp mut peq">${VISOR.pos + 1} de ${VISOR.lista.length}${i.largura ? ` · ${i.largura}×${i.altura}` : ''}</span>
      <button class="icone-btn" data-act="baixarImg" data-id="${esc(i.id)}" title="Baixar">⬇️</button><button class="icone-btn" data-act="visorFechar" title="Fechar">✕</button></div>
    <div class="visor-palco ${VISOR.zoom ? 'zoom' : ''}" data-act="visorZoom"><img src="${u ? esc(u.url) : ''}" data-caminho="${esc(i.caminho)}" alt="" draggable="false"></div>
    ${VISOR.pos > 0 ? '<button class="visor-seta esq" data-act="visorIr" data-v="-1">‹</button>' : ''}${VISOR.pos < VISOR.lista.length - 1 ? '<button class="visor-seta dir" data-act="visorIr" data-v="1">›</button>' : ''}
    <div class="visor-base sem3d">
      ${st === 'reprovada' && i.motivo ? `<div class="motivo-img" style="margin-bottom:8px"><b>Por quê:</b> ${esc(i.motivo)}</div>` : ''}
      ${S.papel === 'pai' ? `<div class="check-img grande"><button class="ck-v ${st === 'aprovada' ? 'on' : ''}" data-act="aprovarImg" data-id="${esc(i.id)}">✔ Aprovar</button><button class="ck-x ${st === 'reprovada' ? 'on' : ''}" data-act="reprovarImg" data-id="${esc(i.id)}">✖ Não aprovar</button></div>`
        : `<div class="st-txt" style="font-size:.95rem">${st === 'aprovada' ? '✅ Aprovada' : st === 'reprovada' ? '❌ Não aprovada' : '⏳ Aguardando o pai'}</div>`}
      <div class="mut peq centro" style="margin-top:6px">Toque na imagem para ampliar · arraste para os lados para passar</div></div>`;
  if (!u) urlsAssinadas([i.caminho]).then(() => { const im = v.querySelector('.visor-palco img'); const x = URLS_IMG[i.caminho]; if (im && x) im.src = x.url; }).catch(() => { });
}
document.addEventListener('keydown', e => { if (!VISOR) return; if (e.key === 'Escape') { VISOR = null; desenharVisor(); } else if (e.key === 'ArrowRight') irVisor(1); else if (e.key === 'ArrowLeft') irVisor(-1); });
function irVisor(d) { if (!VISOR) return; const n = VISOR.pos + d; if (n < 0 || n >= VISOR.lista.length) return; VISOR.pos = n; VISOR.zoom = false; desenharVisor(); }
{ let x0 = null; document.addEventListener('touchstart', e => { if (VISOR && e.target.closest('.visor-palco') && !VISOR.zoom) x0 = e.touches[0].clientX; }, { passive: true });
  document.addEventListener('touchend', e => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 50) { ignorarZoomVisor = true; irVisor(dx < 0 ? 1 : -1); } }, { passive: true }); }
let ignorarZoomVisor = false;
async function avaliarImagem(id, status, motivo = '') {
  const i = S.dados.imagens.find(x => x.id === id); if (!i) return false;
  try {
    let r = { status, motivo: status === 'reprovada' ? motivo.trim() : '', avaliado_em: status === 'pendente' ? null : new Date().toISOString() };
    if (S.modo === 'online') r = await DB.rpc('mok_avaliar_imagem', { p_id: id, p_status: status, p_motivo: motivo });
    Object.assign(i, { status: r.status, motivo: r.motivo, avaliado_em: r.avaliado_em });
    render(); if (VISOR) desenharVisor(); toast(status === 'aprovada' ? '✅ Aprovada — ' + (filhoAtual().nome || 'filho') + ' foi avisado' : status === 'reprovada' ? '❌ Não aprovada — motivo enviado' : 'Voltou para "aguardando"');
    return true;
  } catch (e) { toast(msgErro(e), 'bad'); return false; }
}
const MOTIVOS_IMG = ['Texto com erro de português', 'Texto pequeno / difícil de ler', 'Logo errada ou cortada', 'Cores fora da identidade', 'Imagem pixelada / baixa qualidade', 'Formato errado (feed × story)', 'Informação errada', 'Faltou chamada para ação'];
function modalReprovar(id) {
  const i = S.dados.imagens.find(x => x.id === id); if (!i) return;
  const u = URLS_IMG[i.caminho];
  modal(`<button class="icone-btn fechar" data-act="fechar">✕</button><h2>❌ Não aprovar ${i.formato === 'feed' ? 'F' : 'S'}${i.numero_formato}</h2>
    ${u ? `<img src="${esc(u.url)}" alt="" style="width:100%;max-height:260px;object-fit:contain;border-radius:12px;background:var(--bg2)">` : ''}
    <label class="campo"><span>Por que não foi aprovada? (o ${esc(filhoAtual().nome || 'filho')} vai ler isso)</span><textarea id="motivoImg" rows="3" maxlength="500" placeholder="Ex.: a logo está cortada e o texto ficou pequeno">${esc(i.status === 'reprovada' ? i.motivo || '' : '')}</textarea></label>
    <div class="chips-motivo">${MOTIVOS_IMG.map(m => `<button class="chip" data-act="motivoRapido" data-v="${esc(m)}">${esc(m)}</button>`).join('')}</div>
    <button class="btn pri" style="margin-top:12px;background:linear-gradient(135deg,#ef4444,#b91c1c)" data-act="salvarReprova" data-id="${esc(id)}">❌ Marcar como não aprovada</button>
    ${i.status === 'reprovada' ? `<button class="btn ghost" style="margin-top:8px" data-act="desfazerReprova" data-id="${esc(id)}">↩️ Voltar para "aguardando"</button>` : ''}`);
  setTimeout(() => { const t = $('#motivoImg'); t && t.focus(); }, 80);
}
async function urlsAssinadas(caminhos) {
  const falta = caminhos.filter(c => !URLS_IMG[c] || URLS_IMG[c].exp < Date.now());
  for (let i = 0; i < falta.length; i += 100) {
    const { data } = await DB.sb.storage.from('mok-imagens').createSignedUrls(falta.slice(i, i + 100), 3600);
    (data || []).forEach(d => { if (d.signedUrl) URLS_IMG[d.path] = { url: d.signedUrl, exp: Date.now() + 3500e3 }; });
  }
}
async function carregarMiniaturas() {
  if (S.modo !== 'online') return; const imgs = [...document.querySelectorAll('.galeria img[data-caminho]')]; if (!imgs.length) return;
  try { await urlsAssinadas(imgs.map(i => i.dataset.caminho)); imgs.forEach(i => { const u = URLS_IMG[i.dataset.caminho]; if (u && i.src !== u.url) i.src = u.url; }); } catch (e) { console.warn(e); }
}
function modalEnviarImagens() {
  if (S.modo !== 'online') return toast('Envio de imagens funciona no modo online.', 'bad');
  modal(`<button class="icone-btn fechar" data-act="fechar">✕</button><h2>📤 Enviar imagens</h2>
    <label class="campo"><span>Formato</span><select id="imgFormato"><option value="auto">🔎 Automático (pelo tamanho da imagem)</option><option value="feed">📁 Feed (quadrada / 4:5)</option><option value="story">📁 Story (vertical 9:16)</option></select></label>
    <label class="dropzone grande-zona" id="zonaImg"><input type="file" id="arqImg" accept="image/*" multiple hidden><span style="font-size:2.2rem">🖼️</span><div><b>Toque para escolher as imagens</b><br><span class="peq">Pode escolher várias de uma vez · ou arraste aqui</span></div></label>
    <div id="filaImg"></div>`);
  const inp = $('#arqImg'); inp.onchange = () => inp.files.length && enviarImagens([...inp.files]);
}
function dimensoes(arq) { return new Promise(res => { const u = URL.createObjectURL(arq); const i = new Image(); i.onload = () => { res({ w: i.naturalWidth, h: i.naturalHeight }); URL.revokeObjectURL(u); }; i.onerror = () => { res({ w: 0, h: 0 }); URL.revokeObjectURL(u); }; i.src = u; }); }
async function enviarImagens(arqs) {
  const modo = ($('#imgFormato') || {}).value || 'auto'; const fila = $('#filaImg'); const lote = uid(); let ok = 0, erro = 0;
  arqs = arqs.filter(a => /^image\//.test(a.type) || /\.(png|jpe?g|webp|gif|heic|avif)$/i.test(a.name));
  if (!arqs.length) return toast('Escolha arquivos de imagem.', 'bad');
  fila.innerHTML = `<div class="barra" style="margin:10px 0"><i id="imgProg" style="width:0%"></i></div><p class="mut peq" id="imgTxt">Enviando 0 de ${arqs.length}…</p>`;
  for (const [n, a] of arqs.entries()) {
    try {
      const d = await dimensoes(a); const fmt = modo !== 'auto' ? modo : (d.h && d.h / d.w >= 1.45 ? 'story' : 'feed');
      const nome = a.name.normalize('NFD').replace(/[^\w.\-]+/g, '_').slice(-60);
      const caminho = `${fid()}/${fmt}/${Date.now()}_${n}_${nome}`;
      const { error } = await DB.sb.storage.from('mok-imagens').upload(caminho, a, { contentType: a.type || 'image/jpeg', upsert: false });
      if (error) throw error;
      const row = await DB.inserir('imagens', { id: uid(), filho_id: fid(), formato: fmt, caminho, nome: a.name.slice(0, 120), tamanho: a.size, largura: d.w, altura: d.h, lote });
      S.dados.imagens.unshift(row); ok++;
    } catch (e) { console.warn(e); erro++; }
    const p = Math.round((n + 1) / arqs.length * 100); const pr = $('#imgProg'); if (pr) pr.style.width = p + '%';
    const tx = $('#imgTxt'); if (tx) tx.textContent = `Enviando ${n + 1} de ${arqs.length}…`;
  }
  try { await DB.rpc('mok_imagens_enviadas', { p_lote: lote }); } catch { }
  fecharModais(); render(); if (ok) confete();
  toast(`📤 ${ok} imagens enviadas${erro ? ` · ${erro} com erro` : ''} · +${brl(ok * resumoImagens().vi)}`, erro ? 'bad' : 'ok');
}
async function baixarArquivo(url, nome) { const b = await fetch(url).then(r => r.blob()); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = nome; document.body.appendChild(a); a.click(); a.remove(); }
const nomeBaixa = i => `${i.formato}_${String(i.numero).padStart(4, '0')}_${i.nome || 'imagem.jpg'}`;
async function baixarImg(id) {
  const i = S.dados.imagens.find(x => x.id === id); if (!i) return;
  try { await urlsAssinadas([i.caminho]); await baixarArquivo(URLS_IMG[i.caminho].url, nomeBaixa(i)); } catch (e) { toast(msgErro(e), 'bad'); }
}
async function baixarPasta(aba) {
  const l = deFilho('imagens').filter(i => i.formato === aba).sort((a, b) => a.numero - b.numero); if (!l.length) return;
  carregando(true, `Preparando ${l.length} imagens…`);
  try {
    await carregarScript('jszip.min.js'); await urlsAssinadas(l.map(i => i.caminho));
    const zip = new JSZip(); const pasta = zip.folder(`${filhoAtual().nome}_${aba}`);
    for (const i of l) pasta.file(nomeBaixa(i), await fetch(URLS_IMG[i.caminho].url).then(r => r.blob()));
    const b = await zip.generateAsync({ type: 'blob' }); carregando(false);
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `${filhoAtual().nome}_${aba}_${hojeISO()}.zip`; document.body.appendChild(a); a.click(); a.remove();
  } catch (e) { carregando(false); toast(msgErro(e), 'bad'); }
}

/* ---------- VIGIA DAS NOTIFICAÇÕES: o filho não usa o app com elas desligadas ---------- */
async function estadoNotif() {
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return 'sem_suporte';
  if (Notification.permission === 'denied') return 'bloqueado';
  if (Notification.permission !== 'granted') return 'desligado';
  try { const reg = await navigator.serviceWorker.ready; const sub = await reg.pushManager.getSubscription(); return sub ? 'ativo' : 'desligado'; } catch { return 'desligado'; }
}
let checandoNotif = false;
async function checarNotif() {
  if (S.modo !== 'online' || checandoNotif) return; checandoNotif = true;
  try {
    let e = await estadoNotif();
    if (Notification && Notification.permission === 'granted' && e !== 'ativo') { await inscreverPush(false); e = await estadoNotif(); }
    if (e === 'ativo') await inscreverPush(false); // garante o cadastro no servidor
    try { await DB.rpc('mok_notif', { p_estado: e }); } catch { }
    const antes = S.notifEstado; S.notifEstado = e;
    if (antes !== e) render();
  } finally { checandoNotif = false; }
}
function telaBloqueioNotif() {
  if (S.papel !== 'filho' || S.modo !== 'online' || !S.notifEstado || S.notifEstado === 'ativo') return '';
  const e = S.notifEstado; const ios = /iPhone|iPad/i.test(navigator.userAgent);
  return `<div class="bloqueio-notif"><div class="bn-caixa">
    <div class="grande">🔕</div><h2>Notificações desligadas</h2>
    <p>O TáFeito só funciona com as notificações <b>ligadas</b>. Enquanto estiverem desligadas, o app e o jogo ficam <b>bloqueados</b> e o pai é avisado.</p>
    ${e === 'bloqueado' ? `<div class="aviso warn" style="text-align:left"><b>Como religar:</b><br>
      • <b>Android (Chrome):</b> toque no 🔒 ao lado do endereço → <b>Permissões</b> → <b>Notificações</b> → Permitir. Ou: Configurações do celular → Apps → Chrome (ou TáFeito) → Notificações → Ligar.<br>
      • <b>PC:</b> clique no 🔒 ao lado do endereço → Notificações → Permitir.<br>
      • <b>iPhone:</b> Ajustes → Notificações → TáFeito → Permitir.<br>Depois volte aqui e toque em <b>Já liguei</b>.</div>
      <button class="btn pri" data-act="notifRechecar">✅ Já liguei</button>`
    : e === 'sem_suporte' ? `<div class="aviso warn" style="text-align:left">${ios ? 'No iPhone, instale o app: botão <b>Compartilhar</b> → <b>Adicionar à Tela de Início</b>, abra pelo ícone e ative as notificações.' : 'Abra o TáFeito pelo <b>Google Chrome</b> para ativar as notificações.'}</div><button class="btn pri" data-act="notifRechecar">Tentar de novo</button>`
    : `<button class="btn ok" data-act="notifAtivar">🔔 Ativar notificações</button>`}
    <button class="btn ghost sm" style="margin-top:10px" data-act="sair">Sair</button></div></div>`;
}

/* ---------- CENTRAL DE NOTIFICAÇÕES ---------- */
const avisosNaoLidos = () => (S.dados.avisos || []).filter(a => !a.lido).length;
async function modalAvisos() {
  const l = S.dados.avisos || [];
  modal(`<button class="icone-btn fechar" data-act="fechar">✕</button><h2>🔔 Notificações</h2>
    <p class="mut peq">Tudo que aconteceu no TáFeito. Os mesmos avisos chegam no celular, mesmo com o app fechado.</p>
    <div class="avisos-lista">${l.length ? l.map(a => `<div class="aviso-item ${a.lido ? '' : 'novo'}"><div class="tt"><b>${esc(a.titulo)}</b>${a.corpo ? `<small>${esc(a.corpo)}</small>` : ''}</div><span class="mut peq">${dataHoraBR(a.criado_em)}</span></div>`).join('') : '<div class="vazio"><span class="e">🔕</span>Nenhuma notificação ainda.</div>'}</div>
    <button class="btn ghost" style="margin-top:10px" data-act="teste">🧪 Testar aviso com o app fechado</button>`);
  if (avisosNaoLidos()) { try { await DB.rpc('mok_avisos_lidos'); (S.dados.avisos || []).forEach(a => a.lido = true); render(); } catch { } }
}

/* ---------- TESTE DE LEMBRETE (prova que o celular recebe com o app fechado) ---------- */
function paraLocalInput(d) { return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }
async function modalTeste() {
  const el = modal(`<button class="icone-btn fechar" data-act="fechar">✕</button><h2>🧪 Teste de lembrete</h2>
    <p class="mut peq">Escolha a data e a hora, toque em <b>Testar</b> e <b>feche o app</b>. Se o aviso chegar sozinho no celular, todas as provas e tarefas também vão chegar.</p>
    <div id="testeStatus" class="mut peq">Verificando este aparelho…</div>
    <label class="campo" style="margin-top:10px"><span>Quando avisar</span><input type="datetime-local" id="testeQuando" value="${paraLocalInput(new Date(Date.now() + 2 * 60000))}"></label>
    <div class="grid2"><button class="btn ghost" data-act="testeRapido">⏱️ Daqui a 1 min</button><button class="btn pri" data-act="testeAgendar">🧪 Testar</button></div>
    <div id="testeLista" style="margin-top:10px"></div>`);
  atualizarStatusTeste();
  return el;
}
async function atualizarStatusTeste() {
  const st = $('#testeStatus'); if (!st) return;
  if (S.modo !== 'online') { st.innerHTML = '⚠️ O teste com o app fechado só funciona no modo online.'; return; }
  const perm = 'Notification' in window ? Notification.permission : 'indisponivel';
  let info = null; try { info = await DB.rpc('mok_status_avisos'); } catch (e) { st.innerHTML = '❌ ' + esc(msgErro(e)); return; }
  const ok = perm === 'granted' && lsGet('mok_push_ok');
  st.innerHTML = `<div class="check-lista">
    <div class="${perm === 'granted' ? 'ok' : 'bad'}">${perm === 'granted' ? '✅' : '❌'} Notificações permitidas neste aparelho</div>
    <div class="${lsGet('mok_push_ok') ? 'ok' : 'bad'}">${lsGet('mok_push_ok') ? '✅' : '❌'} Este aparelho cadastrado para avisos com o app fechado</div>
    <div class="${info.servidor ? 'ok' : 'bad'}">${info.servidor ? '✅' : '❌'} Servidor de avisos ligado</div>
    <div class="${info.aparelhos ? 'ok' : 'bad'}">📱 Aparelhos seus que recebem avisos: <b>${info.aparelhos}</b></div></div>
    ${ok ? '' : `<button class="btn ok" style="margin-top:8px" data-act="testeAtivar">🔔 Ativar avisos neste celular</button>`}`;
  const l = $('#testeLista');
  if (l) l.innerHTML = (info.testes || []).length ? `<div class="secao" style="margin-top:6px">Seus testes</div>` + info.testes.map(t => `<div class="lista-item"><span>${t.enviado_em ? '✅' : '⏳'}</span><div class="tt">${dataHoraBR(t.quando)}<small>${t.enviado_em ? 'enviado às ' + hora(t.enviado_em) + ' — chegou no celular?' : 'aguardando a hora'}</small></div></div>`).join('') : '';
  emoji3d(st.closest('.modal'));
}
async function ativarAvisosTeste() {
  if (!('Notification' in window)) return toast('Este navegador não tem notificações. Instale o app pelo Chrome.', 'bad');
  const p = await Notification.requestPermission(); if (p !== 'granted') return toast('Você precisa permitir as notificações.', 'bad');
  const ok = await inscreverPush(true); toast(ok ? '🔔 Avisos ativados neste celular!' : 'Não consegui cadastrar este aparelho.', ok ? 'ok' : 'bad');
  atualizarStatusTeste();
}
async function agendarTeste(quando) {
  if (S.modo !== 'online') return toast('Só funciona no modo online.', 'bad');
  if (!('Notification' in window) || Notification.permission !== 'granted' || !lsGet('mok_push_ok')) { await ativarAvisosTeste(); if (!lsGet('mok_push_ok')) return; }
  try {
    const r = await DB.rpc('mok_agendar_teste', { p_quando: quando.toISOString() });
    modal(`<div class="grande">🧪</div><h2>Teste agendado!</h2><p>Às <b>${quando.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</b> do dia ${quando.toLocaleDateString('pt-BR')} vai chegar:<br><b>"✅ Teste de lembrete funcionou!"</b></p>
      <div class="aviso warn">Agora <b>feche o app</b> (pode bloquear a tela). Se o aviso chegar sozinho, está tudo certo: provas, tarefas e mensagens também chegam.</div>
      <p class="mut peq">Aparelhos seus cadastrados: ${r.aparelhos}. Pode atrasar até 1 minuto.</p><button class="btn pri" data-act="fechar">Entendi</button>`, 'alerta');
    atualizarStatusTeste();
  } catch (e) { toast(msgErro(e), 'bad'); }
}

/* ---------- CONECTORES (Notion com login da própria conta · Google Agenda/Outlook por iCal) ---------- */
const REDIRECT_NOTION = location.origin + location.pathname.replace(/index\.html$/, '');
async function modalConectores() {
  modal(`<button class="icone-btn fechar" data-act="fechar">✕</button><h2>🔌 Conectores</h2>
    <p class="mut peq">Conecte as suas contas. O que vier delas entra no formato do app (calendário de provas e datas), e você confere antes de salvar.</p>
    <div class="card"><h3>📓 Notion</h3><div id="conNotion" class="mut peq">Verificando…</div></div>
    <div class="card"><h3>📅 Google Agenda / Outlook / iPhone</h3>
      <p class="mut peq">No Google Agenda: ⚙️ Configurações → clique na sua agenda → <b>Endereço secreto no formato iCal</b> → copie e cole aqui.</p>
      <input id="icalUrl" class="inp" placeholder="https://calendar.google.com/calendar/ical/....ics" autocomplete="off" value="${esc(lsGet('mok_ical_url', ''))}">
      <button class="btn pri" style="margin-top:8px" data-act="icalImportar">Importar eventos</button></div>
    <div class="card"><h3>📥 Arquivo ou foto</h3><p class="mut peq">PDF, Excel, Word, print ou foto de uma lista.</p><button class="btn ghost" data-act="importar">Importar arquivo</button></div>`);
  if (S.modo !== 'online') { $('#conNotion').innerHTML = 'Disponível no modo online.'; return; }
  try {
    const st = await chamarNotion({ acao: 'status' }); const el = $('#conNotion'); if (!el) return;
    if (st.notion) {
      el.innerHTML = `✅ Conectado: <b>${esc(st.notion.workspace || 'Notion')}</b>${st.notion.conta ? ' · ' + esc(st.notion.conta) : ''}<div id="notionBases" style="margin-top:8px">Buscando bases…</div>
        <button class="btn ghost sm" style="margin-top:8px" data-act="notionDesconectar">Desconectar</button>`;
      notionBases();
    } else if (st.notion_cliente) {
      el.innerHTML = `<p>Entre com a <b>sua própria conta</b> do Notion (seu e-mail). Na tela do Notion, escolha as páginas/bases que o TáFeito pode ler.</p>
        <button class="btn notion" data-act="notionEntrar">Entrar com Notion</button>`;
    } else el.innerHTML = '⚙️ O login do Notion ainda não foi liberado pelo administrador (falta cadastrar o TáFeito no Notion).';
    emoji3d(el.closest('.modal'));
  } catch (e) { const el = $('#conNotion'); if (el) el.innerHTML = '❌ ' + esc(msgErro(e)); }
}
async function chamarNotion(corpo) {
  if (S.modo !== 'online') throw new Error('Os conectores só funcionam no modo online.');
  const { data, error } = await DB.sb.functions.invoke('tafeito-notion', { body: corpo });
  if (error) { let m = error.message; try { const j = await error.context.json(); m = j.erro || m; } catch { } if (/404|not found|Failed to send/i.test(m)) m = 'Conector ainda não ligado no servidor.'; throw new Error(m); }
  if (data && data.erro) throw new Error(data.erro); return data;
}
async function notionEntrar() {
  try {
    const st = await chamarNotion({ acao: 'status' }); if (!st.notion_cliente) return toast('Login do Notion ainda não configurado.', 'bad');
    const estado = uid(); lsSet('mok_notion_estado', estado);
    location.href = `https://api.notion.com/v1/oauth/authorize?client_id=${encodeURIComponent(st.notion_cliente)}&response_type=code&owner=user&state=${estado}&redirect_uri=${encodeURIComponent(REDIRECT_NOTION)}`;
  } catch (e) { toast(msgErro(e), 'bad'); }
}
async function concluirLoginNotion() {
  const q = new URLSearchParams(location.search); const code = q.get('code'), st = q.get('state');
  if (!code || !st || st !== lsGet('mok_notion_estado')) return;
  history.replaceState(null, '', location.pathname); localStorage.removeItem('mok_notion_estado');
  carregando(true, 'Conectando o Notion…');
  try { const r = await chamarNotion({ acao: 'oauth', code, redirect_uri: REDIRECT_NOTION }); carregando(false); toast(`📓 Notion conectado${r.workspace ? ': ' + r.workspace : ''}!`, 'ok'); modalConectores(); }
  catch (e) { carregando(false); toast(msgErro(e), 'bad'); }
}
async function notionBases() {
  const el = $('#notionBases'); if (!el) return;
  try {
    const { bases } = await chamarNotion({ acao: 'bases' });
    el.innerHTML = bases.length ? bases.map(b => `<button class="btn ghost sm" style="margin:4px 0" data-act="notionImportar" data-id="${esc(b.id)}" data-nome="${esc(b.nome)}">📄 ${esc(b.nome)}</button>`).join('')
      : 'Nenhuma base liberada. No Notion, abra a base → ⋯ → Conexões → TáFeito.';
    emoji3d(el);
  } catch (e) { el.innerHTML = '❌ ' + esc(msgErro(e)); }
}
function paraImport(itens) {
  return itens.filter(x => x.titulo).map(x => ({ id: uid(), materia: x.titulo.slice(0, 80), instituicao: (x.instituicao || '').slice(0, 80), data: x.data || '', horario: x.horario || '08:00', site: /^https?:/.test(x.site || '') ? x.site : '', ok: true }));
}
async function notionImportar(id, nome) {
  carregando(true, `Lendo "${nome}" no Notion…`);
  try { const { itens } = await chamarNotion({ acao: 'linhas', base: id }); carregando(false); IMPORT = paraImport(itens); if (!IMPORT.length) return toast('Essa base não tem linhas com título.', 'bad'); fecharModais(); modalRevisao(); }
  catch (e) { carregando(false); toast(msgErro(e), 'bad'); }
}
async function icalImportar() {
  const url = ($('#icalUrl').value || '').trim(); if (!url) return toast('Cole o endereço do calendário.', 'bad');
  lsSet('mok_ical_url', url); carregando(true, 'Lendo o calendário…');
  try { const { itens } = await chamarNotion({ acao: 'ical', url }); carregando(false); IMPORT = paraImport(itens); if (!IMPORT.length) return toast('Nenhum evento futuro nesse calendário.', 'bad'); fecharModais(); modalRevisao(); }
  catch (e) { carregando(false); toast(msgErro(e), 'bad'); }
}

/* ---------- IMPORTAR PROVAS: lê foto, PDF, Excel, Word ou texto ---------- */
const LIB = new URL('lib/leitor/', location.href).href;
const scriptsCarregados = {};
function carregarScript(arq) {
  return scriptsCarregados[arq] = scriptsCarregados[arq] || new Promise((ok, erro) => {
    const el = document.createElement('script'); el.src = LIB + arq; el.onload = ok; el.onerror = () => erro(new Error('Não consegui carregar o leitor. Verifique a internet.'));
    document.head.appendChild(el);
  });
}
function progressoImport(txt) { const el = $('#impStatus'); if (el) el.innerHTML = `<div class="spin" style="width:22px;height:22px;border-width:3px"></div><span>${esc(txt)}</span>`; }
async function ocr(img) {
  await carregarScript('tesseract.min.js');
  const w = await Tesseract.createWorker('por', 1, { workerPath: LIB + 'worker.min.js', corePath: LIB + 'core', langPath: LIB + 'lang',
    logger: m => { if (m.status === 'recognizing text') progressoImport(`Lendo a imagem… ${Math.round(m.progress * 100)}%`); } });
  try { const { data } = await w.recognize(img); return data.text || ''; } finally { await w.terminate(); }
}
async function lerArquivo(arq) {
  const nome = (arq.name || '').toLowerCase(); const tipo = arq.type || '';
  if (tipo.startsWith('image/') || /\.(png|jpe?g|webp|bmp|gif)$/.test(nome)) {
    if (/heic|heif/.test(tipo + nome)) throw new Error('Foto HEIC (iPhone) não abre no navegador. Tire um print da foto e envie o print.');
    progressoImport('Lendo a imagem (pode levar até 1 minuto na primeira vez)…'); return { text: await ocr(arq) };
  }
  if (tipo === 'application/pdf' || nome.endsWith('.pdf')) {
    progressoImport('Lendo o PDF…'); await carregarScript('pdf.min.js');
    pdfjsLib.GlobalWorkerOptions.workerSrc = LIB + 'pdf.worker.min.js';
    const pdf = await pdfjsLib.getDocument({ data: await arq.arrayBuffer() }).promise; let linhas = [];
    for (let i = 1; i <= Math.min(pdf.numPages, 30); i++) {
      const pg = await pdf.getPage(i); const tc = await pg.getTextContent(); const porY = {};
      tc.items.forEach(it => { const y = Math.round(it.transform[5]); (porY[y] = porY[y] || []).push(it); });
      Object.keys(porY).sort((a, b) => b - a).forEach(y => linhas.push(porY[y].sort((a, b) => a.transform[4] - b.transform[4]).map(it => it.str).join('\t')));
    }
    if (linhas.join('').replace(/\s/g, '').length < 15) { // PDF escaneado: lê como imagem
      linhas = [];
      for (let i = 1; i <= Math.min(pdf.numPages, 5); i++) {
        progressoImport(`PDF escaneado: lendo página ${i}…`);
        const pg = await pdf.getPage(i); const vp = pg.getViewport({ scale: 2 }); const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
        await pg.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise; linhas.push(await ocr(c));
      }
    }
    return { text: linhas.join('\n') };
  }
  if (/\.(xlsx|xlsm|xls|ods|csv)$/.test(nome) || /spreadsheet|excel|csv/.test(tipo)) {
    progressoImport('Lendo a planilha…'); await carregarScript('xlsx.full.min.js');
    const wb = XLSX.read(await arq.arrayBuffer(), { type: 'array', cellDates: true });
    const rows = []; wb.SheetNames.forEach(n => XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: false, dateNF: 'dd/mm/yyyy', defval: '' }).forEach(r => { const l = r.map(x => String(x).trim()); if (l.some(Boolean)) rows.push(l); }));
    return { rows };
  }
  if (nome.endsWith('.docx') || /wordprocessingml/.test(tipo)) {
    progressoImport('Lendo o documento Word…'); await carregarScript('mammoth.browser.min.js');
    const r = await mammoth.extractRawText({ arrayBuffer: await arq.arrayBuffer() }); return { text: r.value };
  }
  const txt = await arq.text();
  if ((txt.match(/[\u0000-\u0008\u000e-\u001f�]/g) || []).length > txt.length * 0.05) throw new Error('Não consegui ler esse formato. Envie como foto/print, PDF, Excel, Word ou texto.');
  return { text: txt.replace(/<[^>]+>/g, ' ') };
}

const MES_N = { jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12 };
const CAB = { num: /^(n[ºo°.]?|#|item|ordem)$/i, nome: /^(nome( d[ao] (prova|exame|vestibular))?|provas?|mat[eé]rias?|disciplinas?|exames?|avalia[cç](ão|oes|ões)|vestibulares?|concursos?|eventos?|t[ií]tulo)$/i, inst: /^(universidades?|institui[cç](ão|ões)|escolas?|bancas?|[oó]rg[aã]os?|organizador(a|es)?|faculdades?|col[eé]gios?|local)$/i, data: /^(data|dia|quando|data da prova)$/i, hora: /^(hor[aá]rio|hora|in[ií]cio)$/i };
const ehCab = c => Object.values(CAB).some(r => r.test(c.trim())) && c.trim().split(/\s+/).length <= 4;
function iso(d, m, y) {
  if (y < 100) y += 2000; const dt = new Date(y, m - 1, d);
  return dt.getMonth() === m - 1 && d >= 1 && y >= 2000 && y <= 2100 ? `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` : null;
}
function acharData(s) {
  let m;
  if ((m = s.match(/\b(\d{4})-(\d{2})-(\d{2})\b/))) return { v: iso(+m[3], +m[2], +m[1]), t: m[0] };
  if ((m = s.match(/\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})\b/))) return { v: iso(+m[1], +m[2], +m[3]), t: m[0] };
  if ((m = s.match(/\b(\d{1,2})\s*(?:de\s+)?(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-zç]*\.?(?:\s*(?:de\s+)?(\d{4}))?/i))) {
    const mes = MES_N[m[2].toLowerCase()]; let y = m[3] ? +m[3] : new Date().getFullYear(); let v = iso(+m[1], mes, y);
    if (!m[3] && v && v < hojeISO()) v = iso(+m[1], mes, y + 1); return { v, t: m[0] };
  }
  if ((m = s.match(/\b(\d{1,2})\/(\d{1,2})\b/))) { const y = new Date().getFullYear(); let v = iso(+m[1], +m[2], y); if (v && v < hojeISO()) v = iso(+m[1], +m[2], y + 1); return { v, t: m[0] }; }
  return { v: null, t: '' };
}
function acharHora(s) {
  const m = s.match(/\b([01]?\d|2[0-3])\s*(?::|h)\s*([0-5]\d)?\s*(?:min)?\b/i);
  return m ? { v: `${m[1].padStart(2, '0')}:${m[2] || '00'}`, t: m[0] } : { v: '', t: '' };
}
function linhasParaTabela(linhas) {
  const sep = linhas.filter(l => /\t|;|\s\|\s/.test(l)).length;
  if (sep >= 2 && sep >= linhas.length * 0.4) return linhas.map(l => l.split(/\t|;|\s\|\s/).map(x => x.trim()).filter(x => x !== ''));
  // tabela "em pé" (cada célula numa linha, como quando se copia de um site)
  const i0 = linhas.findIndex(ehCab);
  if (i0 >= 0) {
    let n = 0; while (i0 + n < linhas.length && ehCab(linhas[i0 + n])) n++;
    if (n >= 2) {
      const cab = linhas.slice(i0, i0 + n), resto = linhas.slice(i0 + n), rows = [cab];
      if (CAB.num.test(cab[0].trim())) {
        let atual = null, prox = 1;
        for (const l of resto) { if (/^\d{1,3}$/.test(l) && +l === prox) { if (atual) rows.push(atual); atual = [l]; prox++; } else if (atual) atual.push(l); }
        if (atual) rows.push(atual);
      } else for (let i = 0; i < resto.length; i += n) rows.push(resto.slice(i, i + n));
      return rows;
    }
  }
  return linhas.map(l => [l]);
}
function interpretarProvas({ text, rows }) {
  if (!rows) rows = linhasParaTabela(String(text || '').split(/\r?\n/).map(l => l.replace(/\s+/g, ' ').replace(/^[•\-–*·]+\s*/, '').trim()).filter(Boolean));
  let col = {};
  const hi = rows.findIndex(r => r.length >= 2 && r.filter(ehCab).length >= 2);
  if (hi >= 0) { rows[hi].forEach((c, i) => { for (const k of ['num', 'data', 'hora', 'inst', 'nome']) if (col[k] === undefined && CAB[k].test(c.trim())) { col[k] = i; break; } }); rows = rows.slice(hi + 1); }
  const itens = [], vistos = new Set();
  for (const r of rows) {
    const tudo = r.join(' '); const d = acharData(tudo); const h = acharHora(tudo.replace(d.t, ' '));
    let nome = col.nome !== undefined ? r[col.nome] : '', inst = col.inst !== undefined ? r[col.inst] : '';
    let data = col.data !== undefined ? (acharData(r[col.data] || '').v || d.v) : d.v;
    const hora = col.hora !== undefined ? (acharHora(r[col.hora] || '').v || h.v) : h.v;
    if (!nome) {
      const livres = r.map((c, i) => i).filter(i => i !== col.num && i !== col.data && i !== col.hora && i !== col.inst)
        .map(i => r[i].replace(d.t, ' ').replace(h.t, ' ').replace(/^\s*\d{1,3}\s*[.)\-–:]\s*/, '').replace(/^\d{1,3}\s+(?=\D)/, '').replace(/\s+/g, ' ').trim())
        .filter(c => c && !/^\d{1,3}$/.test(c) && !ehCab(c));
      nome = livres[0] || ''; if (!inst && livres[1]) inst = livres[1];
      const m = nome.match(/^(.*?)\s*[\(\[]([^)\]]{2,30})[\)\]]\s*$/) || nome.match(/^(.*?)\s+[–\-|]\s+(.{2,30})$/);
      if (m && !inst) { nome = m[1]; inst = m[2]; }
    }
    nome = (nome || '').replace(/\s+/g, ' ').replace(/[:\-–,]+$/, '').trim(); inst = (inst || '').trim();
    if (nome.length < 2 || nome.length > 80 || ehCab(nome) || /^[\W\d]+$/.test(nome)) continue;
    const k = (nome + '|' + inst + '|' + (data || '')).toLowerCase(); if (vistos.has(k)) continue; vistos.add(k);
    itens.push({ id: uid(), materia: nome, instituicao: inst, data: data || '', horario: hora || '08:00', ok: true });
  }
  return itens;
}

let IMPORT = [];
function modalImportar() {
  modal(`<button class="icone-btn fechar" data-act="fechar">✕</button><h2>📥 Importar provas</h2>
    <p class="mut peq">Envie uma <b>foto ou print</b> da lista, um <b>PDF</b>, uma planilha <b>Excel</b>, um <b>Word</b> ou um texto. O app lê e organiza tudo. Você confere antes de salvar.</p>
    <label class="dropzone grande-zona" id="zonaImp"><input type="file" id="arqImp" hidden><span style="font-size:2.2rem">📄</span><div><b>Toque para escolher o arquivo</b><br><span class="peq">ou arraste aqui · também dá para colar um print (Ctrl+V)</span></div></label>
    <div id="impStatus" class="linha mut peq" style="min-height:26px;margin:8px 0"></div>
    <label class="campo"><span>…ou cole o texto da lista aqui</span><textarea id="txtImp" rows="5" placeholder="Ex.:&#10;ENEM 2027 - INEP - 07/11/2027 13:00&#10;FUVEST 2028 (USP)"></textarea></label>
    <button class="btn pri" data-act="lerTextoImp">Ler texto</button>`);
  const inp = $('#arqImp'); inp.onchange = () => inp.files[0] && processarImport(inp.files[0]);
}
async function processarImport(arq) {
  try {
    const r = await lerArquivo(arq); const itens = interpretarProvas(r);
    if (!itens.length) { $('#impStatus').innerHTML = '⚠️ Não encontrei provas nesse arquivo. Tente uma foto mais nítida ou cole o texto.'; return; }
    IMPORT = itens; fecharModais(); modalRevisao();
  } catch (e) { console.warn(e); const el = $('#impStatus'); if (el) el.innerHTML = '❌ ' + esc(msgErro(e)); else toast(msgErro(e), 'bad'); }
}
function modalRevisao() {
  const comData = IMPORT.filter(i => i.data).length;
  modal(`<button class="icone-btn fechar" data-act="fechar">✕</button><h2>🔎 Confira as provas</h2>
    <p class="mut peq">Encontrei <b>${IMPORT.length}</b> provas: <b>${comData}</b> com data e <b>${IMPORT.length - comData}</b> sem data. Ajuste o que precisar. As sem data ficam na lista "Sem data definida" até você colocar a data.</p>
    <form data-form="salvarImport"><div class="rev-lista">${IMPORT.map((it, i) => `<div class="rev ${it.data ? '' : 'sem'}">
      <label class="rev-ok"><input type="checkbox" name="ok${i}" ${it.ok ? 'checked' : ''}></label>
      <div class="rev-campos"><input class="inp" name="m${i}" value="${esc(it.materia)}" maxlength="80" placeholder="Prova">
      <div class="rev-linha"><input class="inp" name="i${i}" value="${esc(it.instituicao)}" maxlength="80" placeholder="Universidade">
      <input class="inp" type="date" name="d${i}" value="${esc(it.data)}"><input class="inp" type="time" name="h${i}" value="${esc(it.horario)}"></div></div></div>`).join('')}</div>
    <button class="btn ok" style="margin-top:10px">💾 Salvar no calendário</button></form>`);
}
async function salvarImport(f) {
  const itens = IMPORT.map((it, i) => ({ id: it.id, materia: f['m' + i].value.trim(), instituicao: f['i' + i].value.trim(), data: f['d' + i].value || '', horario: f['h' + i].value || '08:00', ok: f['ok' + i].checked }))
    .filter(it => it.ok && it.materia).map(it => ({ ...it, site: IMPORT.find(x => x.id === it.id)?.site || siteDaProva(it) }));
  if (!itens.length) return toast('Nenhuma prova marcada.', 'bad');
  carregando(true, 'Salvando provas…');
  try {
    let n;
    if (S.modo === 'online') n = await DB.rpc('mok_importar_provas', { p_filho: fid(), p_itens: itens.map(({ ok, ...x }) => x) });
    else { for (const it of itens) await DB.salvar('provas', { id: it.id, filho_id: fid(), materia: it.materia, instituicao: it.instituicao, site: it.site || '', conteudo: '', data: it.data || null, horario: it.horario, criado_por: S.papel === 'pai' ? 'pai' : S.eu, criado_em: agoraISO() }); n = itens.length; }
    S.dados.provas = await DB.listar('provas'); S.dados.provas.forEach(p => S.vistos.prv && (S.vistos.prv[p.id] = p.materia + p.data + p.horario));
    const prim = itens.filter(i => i.data).map(i => i.data).sort()[0]; if (prim) S.calMes = prim.slice(0, 7);
    IMPORT = []; carregando(false); fecharModais(); S.tela = 'estudo'; render(); confete(); toast(`📥 ${n} provas salvas no calendário!`, 'ok');
  } catch (e) { carregando(false); toast(msgErro(e), 'bad'); }
}
document.addEventListener('dragover', e => { if (e.target.closest && e.target.closest('#zonaImp')) { e.preventDefault(); e.target.closest('#zonaImp').classList.add('arrastando'); } });
document.addEventListener('dragleave', e => { const z = e.target.closest && e.target.closest('#zonaImp'); if (z) z.classList.remove('arrastando'); });
document.addEventListener('drop', e => { const z = e.target.closest && e.target.closest('#zonaImp'); if (!z) return; e.preventDefault(); z.classList.remove('arrastando'); const a = e.dataTransfer.files[0]; if (a) processarImport(a); });
document.addEventListener('dragover', e => { const z = e.target.closest && e.target.closest('#zonaImg'); if (z) { e.preventDefault(); z.classList.add('arrastando'); } });
document.addEventListener('drop', e => { const z = e.target.closest && e.target.closest('#zonaImg'); if (!z) return; e.preventDefault(); z.classList.remove('arrastando'); if (e.dataTransfer.files.length) enviarImagens([...e.dataTransfer.files]); });
document.addEventListener('paste', e => { if (!$('#zonaImp')) return; const a = [...(e.clipboardData?.files || [])][0]; if (a) { e.preventDefault(); processarImport(a); } });

/* ===================================================================
   MODAIS
   =================================================================== */
function modal(html, cls = '') {
  const el = document.createElement('div'); el.className = 'modal-bg';
  el.innerHTML = `<div class="modal ${cls}">${html}</div>`; emoji3d(el);
  el.addEventListener('click', e => { if (e.target === el && !cls.includes('alerta')) el.remove(); });
  $('#modais').appendChild(el); return el;
}
const fecharModais = () => { $('#modais').innerHTML = ''; };
const fecharTopo = () => { const l = $('#modais').lastElementChild; if (l) l.remove(); };
function toast(txt, tipo = '') {
  const el = document.createElement('div'); el.className = 'toast ' + tipo; el.textContent = txt;
  $('#toasts').appendChild(el); emoji3d(el); setTimeout(() => el.remove(), 3200);
}
function confete() {
  const em = ['🎉', '⭐', '✨', '🏆', '💪', '✅'];
  for (let i = 0; i < 24; i++) {
    const s = document.createElement('div'); s.className = 'confete'; s.textContent = em[i % em.length];
    s.style.left = '50%'; s.style.top = '45%';
    s.style.setProperty('--x', (Math.random() * 360 - 180) + 'px'); s.style.setProperty('--y', (Math.random() * -380 + 120) + 'px');
    document.body.appendChild(s); setTimeout(() => s.remove(), 1500);
  }
}
let carregandoEl = null;
function carregando(on, txt = 'Enviando…') {
  if (on && !carregandoEl) { carregandoEl = modal(`<div class="centro"><div class="spin" style="margin:10px auto"></div><p>${esc(txt)}</p></div>`, 'alerta'); }
  if (!on && carregandoEl) { carregandoEl.remove(); carregandoEl = null; }
}

function formTarefa(t, cat) {
  const novo = !t; const souPai = S.papel === 'pai';
  t = t || { categoria: cat || 'casa', recorrencia: cat === 'trabalho' ? 'unica' : 'diaria', dias: [], data_unica: hojeISO(), horario: '', aviso_antes: 30, foto: true, obrigatoria: cat !== 'trabalho', xp: cat === 'trabalho' ? 20 : 10, valor: 0, ativa: true, icone: '', titulo: '', descricao: '' };
  modal(`<button class="icone-btn fechar" data-act="fechar">✕</button><h2>${novo ? 'Nova tarefa' : 'Editar tarefa'}</h2>
  <form data-form="tarefa" data-id="${esc(t.id || '')}">
    <div class="grid2" style="grid-template-columns:70px 1fr"><label class="campo"><span>Ícone</span><input name="icone" value="${esc(t.icone)}" placeholder="🧹" maxlength="8" autocomplete="off" style="text-align:center"></label>
    <label class="campo"><span>Título</span><input name="titulo" value="${esc(t.titulo)}" required placeholder="Ex.: Arrumar o quarto"></label></div>
    <details class="icones"><summary>😀 Escolher ícone</summary>${Object.entries(ICONES).map(([g, l]) => `<div class="mut peq" style="margin:8px 0 4px">${g}</div><div class="grade-icones">${l.map(i => `<button type="button" data-act="escolherIcone" data-i="${i}">${i}</button>`).join('')}</div>`).join('')}</details>
    <label class="campo"><span>Categoria</span><select name="categoria">${Object.entries(CATS).map(([k, v]) => `<option value="${k}" ${t.categoria === k ? 'selected' : ''}>${v.icone} ${v.nome}</option>`).join('')}</select></label>
    <label class="campo"><span>Explicação (o que precisa ficar feito)</span><textarea name="descricao">${esc(t.descricao)}</textarea></label>
    <label class="campo"><span>Itens para marcar um por um (um por linha, opcional)</span><textarea name="itens" rows="3" placeholder="Ex.: Lixeira da cozinha&#10;Lixeira do banheiro&#10;Lixeira do quarto" ${souPai ? '' : 'readonly'}>${esc(itensDe(t).join('\n'))}</textarea></label>
    <label class="campo"><span>Repetição</span><select name="recorrencia" data-change="recorrencia"><option value="diaria" ${t.recorrencia === 'diaria' ? 'selected' : ''}>Repete (dias da semana)</option><option value="unica" ${t.recorrencia === 'unica' ? 'selected' : ''}>Uma vez só (fica até ser feita)</option></select></label>
    <div id="boxDias" ${t.recorrencia === 'unica' ? 'hidden' : ''}><span class="mut peq">Dias (nenhum marcado = todo dia)</span><div class="dias" style="margin:6px 0 12px">${DSEM.map((d, i) => `<label><input type="checkbox" name="dia" value="${i}" ${(t.dias || []).includes(i) ? 'checked' : ''}><span>${d}</span></label>`).join('')}</div></div>
    <label class="campo" id="boxData" ${t.recorrencia === 'unica' ? '' : 'hidden'}><span>A partir de</span><input type="date" name="data_unica" value="${esc(t.data_unica || hojeISO())}"></label>
    <div class="grid2"><label class="campo"><span>Horário do lembrete</span><input type="time" name="horario" value="${esc(t.horario)}"></label>
    <label class="campo"><span>XP (pontos)</span><input type="number" name="xp" min="0" max="1000" value="${num(t.xp)}"></label></div>
    <label class="campo"><span>🔔 Avisar antes do horário</span><select name="aviso_antes">${[[0, 'Não avisar antes'], [10, '10 minutos antes'], [15, '15 minutos antes'], [30, '30 minutos antes'], [60, '1 hora antes']].map(([v, n]) => `<option value="${v}" ${num(t.aviso_antes ?? 30) === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
    ${souPai || t.valor ? `<label class="campo"><span>Vale dinheiro? (R$)</span><input type="number" name="valor" min="0" step="0.5" value="${num(t.valor)}" ${souPai ? '' : 'readonly'}></label>` : ''}
    <label class="check"><input type="checkbox" name="foto" ${t.foto ? 'checked' : ''} ${souPai ? '' : 'disabled'}> Exigir foto ANTES e DEPOIS</label>
    <label class="check"><input type="checkbox" name="obrigatoria" ${t.obrigatoria ? 'checked' : ''} ${souPai ? '' : 'disabled'}> Obrigatória para liberar PC/celular</label>
    <label class="check"><input type="checkbox" name="ativa" ${t.ativa !== false ? 'checked' : ''}> Ativa</label>
    <button class="btn pri" style="margin-top:8px">Salvar</button>
    ${!novo && souPai ? `<button type="button" class="btn bad" style="margin-top:8px" data-act="apagarTarefa" data-id="${esc(t.id)}">Apagar tarefa</button>` : ''}
  </form>`);
}

function formMissao(m) {
  const novo = !m;
  m = m || { icone: '🏆', titulo: '', descricao: '', tipo: 'total', meta: 10, categoria: 'casa', premio: '', valor: 0, xp: 50, ativa: true };
  modal(`<button class="icone-btn fechar" data-act="fechar">✕</button><h2>${novo ? 'Nova missão' : 'Editar missão'}</h2>
  <form data-form="missao" data-id="${esc(m.id || '')}">
    <div class="grid2" style="grid-template-columns:70px 1fr"><label class="campo"><span>Ícone</span><input name="icone" value="${esc(m.icone)}" maxlength="8" autocomplete="off" style="text-align:center"></label>
    <label class="campo"><span>Nome da missão</span><input name="titulo" value="${esc(m.titulo)}" required></label></div>
    <details class="icones"><summary>😀 Escolher ícone</summary>${Object.entries(ICONES).map(([g, l]) => `<div class="mut peq" style="margin:8px 0 4px">${g}</div><div class="grade-icones">${l.map(i => `<button type="button" data-act="escolherIcone" data-i="${i}">${i}</button>`).join('')}</div>`).join('')}</details>
    <label class="campo"><span>Descrição</span><input name="descricao" value="${esc(m.descricao)}"></label>
    <label class="campo"><span>Tipo</span><select name="tipo">${Object.entries(TIPOS_MISSAO).map(([k, v]) => `<option value="${k}" ${m.tipo === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
    <div class="grid2"><label class="campo"><span>Meta (X)</span><input type="number" name="meta" min="1" value="${num(m.meta)}"></label>
    <label class="campo"><span>Categoria (se for o caso)</span><select name="categoria">${Object.entries(CATS).map(([k, v]) => `<option value="${k}" ${m.categoria === k ? 'selected' : ''}>${v.nome}</option>`).join('')}</select></label></div>
    <label class="campo"><span>Prêmio</span><input name="premio" value="${esc(m.premio)}" placeholder="Ex.: +2h de videogame no sábado"></label>
    <div class="grid2"><label class="campo"><span>Dinheiro (R$)</span><input type="number" name="valor" min="0" step="0.5" value="${num(m.valor)}" ${S.papel === 'pai' ? '' : 'readonly'}></label>
    <label class="campo"><span>XP bônus</span><input type="number" name="xp" min="0" value="${num(m.xp)}"></label></div>
    <label class="check"><input type="checkbox" name="ativa" ${m.ativa !== false ? 'checked' : ''}> Ativa</label>
    <p class="mut peq">A contagem começa a partir de quando a missão é criada.</p>
    <button class="btn pri">Salvar</button>
    ${!novo && S.papel === 'pai' ? `<button type="button" class="btn bad" style="margin-top:8px" data-act="apagarMissao" data-id="${esc(m.id)}">Apagar missão</button>` : ''}
  </form>`);
}

function formFilho(f) {
  const novo = !f; f = f || { nome: '', horas_pc: 2, horas_cel: 2, premio_extra: '', exigir_aprovacao: false };
  const tem = !novo && S.dados.perfis.some(p => p.filho_id === f.id);
  modal(`<button class="icone-btn fechar" data-act="fechar">✕</button><h2>${novo ? 'Adicionar filho' : esc(f.nome)}</h2>
  <form data-form="filho" data-id="${esc(f.id || '')}">
    <label class="campo"><span>Nome</span><input name="nome" value="${esc(f.nome)}" required></label>
    <div class="grid2"><label class="campo"><span>💻 Horas de computador</span><input type="number" name="horas_pc" min="0" step="0.5" value="${num(f.horas_pc)}"></label>
    <label class="campo"><span>📱 Horas de celular</span><input type="number" name="horas_cel" min="0" step="0.5" value="${num(f.horas_cel)}"></label></div>
    <label class="campo"><span>📲 WhatsApp do filho (para o botão de WhatsApp)</span><input name="whatsapp" inputmode="tel" value="${esc(f.whatsapp || '')}" placeholder="85 99999-9999"></label>
    <div class="grid2"><label class="campo"><span>🖼️ R$ por imagem</span><input type="number" name="valor_imagem" min="0" step="0.5" value="${num(f.valor_imagem ?? 1)}"></label>
    <label class="campo"><span>Imagens por grupo</span><input type="number" name="tamanho_grupo" min="1" step="1" value="${num(f.tamanho_grupo ?? 10)}"></label></div>
    <label class="campo"><span>Prêmio extra do dia (opcional)</span><input name="premio_extra" value="${esc(f.premio_extra)}" placeholder="Ex.: sobremesa liberada"></label>
    <label class="check"><input type="checkbox" name="exigir_todas" ${f.exigir_todas !== false ? 'checked' : ''}> 🎮 Só jogar depois de concluir TODAS as tarefas do dia (inclusive opcionais e trabalhos)</label>
    <label class="check"><input type="checkbox" name="exigir_aprovacao" ${f.exigir_aprovacao ? 'checked' : ''}> Só liberar depois que eu aprovar as fotos</label>
    <button class="btn pri" style="margin-top:6px">Salvar</button>
  </form>
  ${!novo && S.modo === 'online' ? `<div class="card" style="margin-top:14px"><h3>🔑 Acesso de ${esc(f.nome)}</h3>
    <p class="mut peq">${tem ? 'Acesso criado. Você pode trocar o PIN.' : 'Crie um PIN de 4 números para ele entrar no app.'}</p>
    <form data-form="${tem ? 'trocarPin' : 'criarAcesso'}" data-id="${esc(f.id)}"><input name="pin" class="inp pin" inputmode="numeric" pattern="[0-9]{4}" minlength="4" maxlength="4" placeholder="••••" required>
    <button class="btn pri" style="margin-top:8px">${tem ? 'Trocar PIN' : 'Criar acesso'}</button></form></div>` : ''}`);
}

function abrirPedidoModal(p) {
  modal(`<div class="grande">🔐</div><h2>Pedido de permissão</h2>
    <p><b>${esc(nomeFilho(p.filho_id))}</b> quer ajustar:<br><b style="font-size:1.15rem">${esc(AREAS[p.area] || p.area)}</b></p>
    ${p.mensagem ? `<div class="aviso info">"${esc(p.mensagem)}"</div>` : ''}
    <p class="mut peq">Pedido às ${hora(p.criado_em)}. Autorizar por quanto tempo?</p>
    <div class="grid2"><button class="btn ok" data-act="responder" data-id="${esc(p.id)}" data-min="30">✅ 30 min</button><button class="btn ok" data-act="responder" data-id="${esc(p.id)}" data-min="60">✅ 1 hora</button>
    <button class="btn ok" data-act="responder" data-id="${esc(p.id)}" data-min="180">✅ 3 horas</button><button class="btn ok" data-act="responder" data-id="${esc(p.id)}" data-min="dia">✅ Até o fim do dia</button></div>
    <button class="btn bad" style="margin-top:10px" data-act="responder" data-id="${esc(p.id)}" data-min="0">❌ Não autorizar</button>
    <button class="btn ghost" style="margin-top:8px" data-act="fechar">Decidir depois</button>`, 'alerta');
}

const pedidosMostrados = new Set();
function verificarPedidosPai() {
  if (S.papel !== 'pai') return;
  const p = pedidosPendentes().find(x => !pedidosMostrados.has(x.id));
  if (!p) return;
  pedidosMostrados.add(p.id); beep(); abrirPedidoModal(p);
}

/* ===================================================================
   AÇÕES (cliques)
   =================================================================== */
const acoes = {
  fechar: () => fecharTopo(),
  ir: d => { S.tela = d.tela; window.scrollTo(0, 0); render(); },
  selFilho: d => { if (S.filhoSel === d.id) return modalPerfil(d.id); S.filhoSel = d.id; lsSet('mok_filho_sel', d.id); render(); },
  modoDemo: () => { localStorage.setItem('mok_modo', 'demo'); location.reload(); },
  sairDemo: () => { localStorage.removeItem('mok_modo'); localStorage.removeItem('mok_demo_papel'); location.reload(); },
  trocarConexao: () => { localStorage.removeItem('mok_conn'); location.reload(); },
  loginPai: () => {
    modal(`<button class="icone-btn fechar" data-act="fechar">✕</button><h2>👨 Entrar como Pai</h2><form data-form="loginPai">
      <label class="campo"><span>E-mail</span><input name="email" type="email" value="${esc(lsGet('mok_email_pai', ''))}" required autocomplete="email"></label>
      <label class="campo"><span>Senha</span><input name="senha" type="password" required autocomplete="current-password"></label><button class="btn pri">Entrar</button></form>`);
  },
  loginFilho: d => {
    if (!S.ini.com_acesso.includes(d.id)) return modal(`<div class="grande">🔑</div><h2>${esc(d.nome)}</h2><p class="mut">Seu acesso ainda não foi criado. Peça para o pai criar em <b>Mais → Filhos</b>.</p><button class="btn pri" data-act="fechar">Ok</button>`, 'alerta');
    modal(`<button class="icone-btn fechar" data-act="fechar">✕</button><h2>Oi, ${esc(d.nome)}! 👋</h2><form data-form="loginFilho" data-id="${esc(d.id)}">
      <label class="campo"><span>Seu PIN</span><input name="pin" class="pin" type="password" inputmode="numeric" required autocomplete="current-password"></label><button class="btn pri">Entrar</button></form>`);
    setTimeout(() => { const i = $('#modais input[name=pin]'); if (i) i.focus(); }, 100);
  },
  demoPai: () => {
    const pin = lsGet('mok_demo_pin');
    modal(`<button class="icone-btn fechar" data-act="fechar">✕</button><h2>👨 Pai</h2><form data-form="demoPai">
      <label class="campo"><span>${pin ? 'PIN do pai' : 'Crie um PIN do pai (4+ números) — os filhos não sabem'}</span><input name="pin" class="pin" type="password" inputmode="numeric" minlength="4" required></label><button class="btn pri">Entrar</button></form>`);
  },
  demoFilho: async d => { S.papel = 'filho'; S.eu = d.id; await abrirApp(); },
  sair: async () => {
    if (S.modo === 'online') { try { await DB.sb.auth.signOut(); } catch { } }
    location.reload();
  },
  foto: d => { fotoAlvo = { tarefa: d.id, tipo: d.tipo }; abrirCamera(d.tipo); },
  concluir: async d => {
    const t = tarefaPorId(d.id); const dia = hojeISO(); const r0 = regDe(t, dia) || novoReg(t, dia);
    if (t.foto && !(r0.foto_antes && r0.foto_depois)) return toast('Tire a foto ANTES e DEPOIS primeiro.', 'bad');
    if (itensMarcados(r0).length < itensDe(t).length) return toast('Marque todos os itens primeiro.', 'bad');
    const antes = statusDia(dia).liberado;
    const r = { ...r0, status: 'feita', feito_em: agoraISO(), obs: '' };
    if (!(await salvarReg(r))) return;
    confete(); toast(`Missão cumprida! +${t.xp} XP${t.valor > 0 ? ' · ' + brl(t.valor) : ''}`, 'ok');
    if (!antes && statusDia(dia).liberado) {
      const f = filhoAtual();
      setTimeout(() => modal(`<div class="grande">🎉</div><h2>TUDO FEITO!</h2><p>Computador e celular <b>LIBERADOS</b>:</p>
        <div class="grid2"><div class="stat"><b>💻 ${horasTxt(f.horas_pc)}</b><span>computador</span></div><div class="stat"><b>📱 ${horasTxt(f.horas_cel)}</b><span>celular</span></div></div>
        <button class="btn ok" style="margin-top:14px" data-act="fechar">Bora! 🎮</button>`, 'alerta'), 500);
      enviarMsgAuto(`✅ Terminei todas as tarefas de hoje!`);
    }
  },
  refazer: async d => {
    const t = tarefaPorId(d.id); const r = regDe(t, hojeISO()); if (!r) return;
    const limpo = { ...r, status: 'pendente', foto_antes: null, foto_antes_em: null, foto_depois: null, foto_depois_em: null, feito_em: null };
    if (itensDe(t).length) limpo.itens_feitos = [];
    await salvarReg(limpo);
  },
  marcarItem: async d => {
    const t = tarefaPorId(d.id); if (!t) return; const dia = hojeISO(); const r0 = regDe(t, dia) || novoReg(t, dia);
    if (ehFeita(r0)) return;
    const i = Number(d.i); const m = itensMarcados(r0);
    const novo = m.includes(i) ? m.filter(x => x !== i) : [...m, i].sort((a, b) => a - b);
    const r = { ...r0, itens_feitos: novo }; if (r.status === 'reprovada') r.status = 'pendente';
    if (await salvarReg(r) && !m.includes(i)) { if (novo.length >= itensDe(t).length) toast('Tudo marcado! Agora toque em "Marcar como feita".', 'ok'); }
  },
  aprovar: async d => {
    const r = S.dados.registros.find(x => x.id === d.reg); if (!r) return;
    if (await salvarReg({ ...r, status: 'aprovada' })) toast('Aprovada ⭐', 'ok');
  },
  reprovar: async d => {
    const r = S.dados.registros.find(x => x.id === d.reg); if (!r) return;
    modal(`<button class="icone-btn fechar" data-act="fechar">✕</button><h2>🔁 Pedir para refazer</h2><form data-form="reprovar" data-reg="${esc(r.id)}">
      <label class="campo"><span>O que ficou faltando?</span><input name="obs" placeholder="Ex.: ainda tem roupa no chão" required></label><button class="btn bad">Enviar</button></form>`);
  },
  verFotos: d => {
    const r = S.dados.registros.find(x => x.id === d.reg); const t = r && tarefaPorId(r.tarefa_id);
    modal(`<button class="icone-btn fechar" data-act="fechar">✕</button><h2>${esc(t ? t.titulo : 'Fotos')}</h2><div class="lightbox">
      ${r.foto_antes ? `<p class="mut peq">ANTES · ${dataHoraBR(r.foto_antes_em)}</p><img src="${esc(r.foto_antes)}">` : ''}
      ${r.foto_depois ? `<p class="mut peq">DEPOIS · ${dataHoraBR(r.foto_depois_em)}</p><img src="${esc(r.foto_depois)}">` : ''}</div>
      ${S.papel === 'filho' && !ehFeita(r) ? `<button class="btn ghost" data-act="refotografar" data-id="${esc(r.tarefa_id)}">📷 Tirar as fotos de novo</button>` : ''}`);
  },
  refotografar: async d => { fecharModais(); await acoes.refazer(d); },
  novaTarefa: d => formTarefa(null, d.cat),
  editarTarefa: d => formTarefa(tarefaPorId(d.id)),
  apagarTarefa: async d => {
    if (!confirm('Apagar esta tarefa?')) return;
    try { await DB.remover('tarefas', d.id); S.dados.tarefas = S.dados.tarefas.filter(t => t.id !== d.id); fecharModais(); render(); toast('Tarefa apagada'); } catch (e) { toast(msgErro(e), 'bad'); }
  },
  novaMissao: () => formMissao(),
  editarMissao: d => formMissao(S.dados.missoes.find(m => m.id === d.id)),
  apagarMissao: async d => {
    if (!confirm('Apagar esta missão?')) return;
    try { await DB.remover('missoes', d.id); S.dados.missoes = S.dados.missoes.filter(m => m.id !== d.id); fecharModais(); render(); } catch (e) { toast(msgErro(e), 'bad'); }
  },
  resgatar: async d => {
    const m = S.dados.missoes.find(x => x.id === d.id); if (!m || resgatada(m)) return;
    const r = { id: uid(), filho_id: m.filho_id, missao_id: m.id, titulo: m.titulo, premio: m.premio, valor: num(m.valor), xp: num(m.xp), criado_em: agoraISO() };
    try { const salvo = await DB.inserir('resgates', r); S.dados.resgates.push(salvo || r); confete(); render();
      modal(`<div class="grande">🏅</div><h2>Missão completa!</h2><p><b>${esc(m.titulo)}</b></p>${m.premio ? `<p>🎁 ${esc(m.premio)}</p>` : ''}${num(m.valor) ? `<p>💰 ${brl(m.valor)} na sua carteira</p>` : ''}<p class="mut">+${m.xp} XP</p><button class="btn ok" data-act="fechar">Show!</button>`, 'alerta');
      enviarMsgAuto(`🏅 Completei a missão "${m.titulo}"! Prêmio: ${m.premio || brl(m.valor)}`);
    } catch (e) { toast(msgErro(e), 'bad'); }
  },
  pedir: d => {
    modal(`<button class="icone-btn fechar" data-act="fechar">✕</button><h2>✋ Pedir permissão</h2><p class="mut peq">O pedido aparece na tela do pai na hora.</p><form data-form="pedido">
      <label class="campo"><span>O que você quer ajustar?</span><select name="area">${Object.entries(AREAS).map(([k, v]) => `<option value="${k}" ${d.area === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <label class="campo"><span>Explique para o pai</span><textarea name="mensagem" placeholder="Ex.: queria mudar o horário da louça para 14h" required></textarea></label>
      <button class="btn pri">Enviar pedido</button></form>`);
  },
  abrirPedido: d => { const p = S.dados.pedidos.find(x => x.id === d.id); if (p) abrirPedidoModal(p); },
  responder: async d => {
    const p = S.dados.pedidos.find(x => x.id === d.id); if (!p) return;
    let exp = null, status = 'negado';
    if (d.min !== '0') { status = 'aprovado'; const e = new Date(); if (d.min === 'dia') e.setHours(23, 59, 0, 0); else e.setMinutes(e.getMinutes() + Number(d.min)); exp = e.toISOString(); }
    try {
      const n = { ...p, status, respondido_em: agoraISO(), expira_em: exp };
      await DB.salvar('pedidos', n); Object.assign(p, n); fecharModais(); render();
      toast(status === 'aprovado' ? 'Autorizado ✅' : 'Pedido negado', status === 'aprovado' ? 'ok' : '');
      enviarMsgAuto(status === 'aprovado' ? `✅ Autorizei você a ajustar "${AREAS[p.area] || p.area}" até ${hora(exp)}.` : `❌ Não autorizei o ajuste em "${AREAS[p.area] || p.area}".`, p.filho_id);
      verificarPedidosPai();
    } catch (e) { toast(msgErro(e), 'bad'); }
  },
  editarPremios: () => formFilho(filhoAtual()),
  editarPerfil: () => {
    const f = filhoAtual();
    modal(`<button class="icone-btn fechar" data-act="fechar">✕</button><h2>Meu nome</h2><form data-form="perfil"><label class="campo"><span>Nome</span><input name="nome" value="${esc(f.nome)}" required></label><button class="btn pri">Salvar</button></form>`);
  },
  editarFilho: d => formFilho(S.dados.filhos.find(f => f.id === d.id)),
  novoFilho: () => formFilho(),
  pagar: () => {
    const c = carteira();
    modal(`<button class="icone-btn fechar" data-act="fechar">✕</button><h2>💸 Pagamento para ${esc(filhoAtual().nome)}</h2><form data-form="pagar">
      <label class="campo"><span>Valor (saldo: ${brl(c.saldo)})</span><input type="number" name="valor" min="0.01" step="0.01" value="${c.saldo > 0 ? c.saldo.toFixed(2) : ''}" required></label>
      <label class="campo"><span>Observação</span><input name="obs" placeholder="Ex.: Pix de sábado"></label><button class="btn ok">Registrar</button></form>`);
  },
  apagarPagamento: async d => {
    if (!confirm('Apagar este pagamento?')) return;
    try { await DB.remover('pagamentos', d.id); S.dados.pagamentos = S.dados.pagamentos.filter(p => p.id !== d.id); render(); } catch (e) { toast(msgErro(e), 'bad'); }
  },
  rapida: d => enviarMsg(d.txt),
  ativarNotif: async () => {
    if (!('Notification' in window)) return toast('Este navegador não tem notificações. Instale o app pelo Chrome.', 'bad');
    const p = await Notification.requestPermission();
    if (p === 'granted') {
      const ok = await inscreverPush(true);
      notificar('🔔 Notificações ativadas!', ok ? 'Agora chegam mesmo com o app fechado.' : 'Você vai receber os avisos do TáFeito.', 'teste'); render();
    }
    else toast('Notificações bloqueadas. Libere nas configurações do navegador.', 'bad');
  },
  instalar: async () => {
    if (promptInstalar) { promptInstalar.prompt(); await promptInstalar.userChoice.catch(() => { }); promptInstalar = null; render(); return; }
    modal(`<button class="icone-btn fechar" data-act="fechar">✕</button><h2>⬇️ Instalar o TáFeito</h2>
      <p><b>Android (Chrome):</b> menu ⋮ → <b>Instalar app</b> (ou "Adicionar à tela inicial").</p>
      <p><b>iPhone (Safari):</b> botão Compartilhar → <b>Adicionar à Tela de Início</b>.</p>
      <p><b>Computador (Chrome/Edge):</b> clique no ícone de instalar ⊕ na barra de endereço.</p>
      <p class="mut peq">Se já estiver instalado, é só abrir pelo ícone.</p><button class="btn pri" data-act="fechar">Entendi</button>`);
  },
  agenda: () => modalAgenda(),
  escolherIcone: (d, b) => {
    const f = b.closest('form'); if (!f || !f.icone) return;
    f.icone.value = d.i; f.querySelectorAll('.grade-icones button.on').forEach(x => x.classList.remove('on')); b.classList.add('on');
    const det = b.closest('details'); if (det) det.open = false;
  },
  senhaFilho: d => { const f = S.dados.filhos.find(x => x.id === d.id); if (!f) return; const tem = S.dados.perfis.some(p => p.filho_id === f.id);
    modal(`<button class="icone-btn fechar" data-act="fechar">✕</button><h2>🔑 ${tem ? 'Nova senha' : 'Criar senha'} de ${esc(f.nome)}</h2>
    <p class="mut peq">A senha é um PIN de 4 números. A senha antiga deixa de funcionar na hora.</p>
    <form data-form="senhaFilho" data-id="${esc(f.id)}">
    <label class="campo"><span>Nova senha (PIN)</span><input name="pin" class="pin" type="password" inputmode="numeric" pattern="[0-9]{4}" minlength="4" maxlength="4" required autocomplete="new-password"></label>
    <label class="campo"><span>Repita a senha</span><input name="pin2" class="pin" type="password" inputmode="numeric" pattern="[0-9]{4}" minlength="4" maxlength="4" required autocomplete="new-password"></label>
    <label class="check"><input type="checkbox" onchange="this.form.pin.type=this.form.pin2.type=this.checked?'text':'password'"> Mostrar senha</label>
    <button class="btn pri">Salvar senha</button></form>`); },
  trocarSenha: () => modal(`<button class="icone-btn fechar" data-act="fechar">✕</button><h2>🔒 Trocar senha do Pai</h2><form data-form="trocarSenha">
    <label class="campo"><span>Nova senha (mín. 6 caracteres)</span><input name="senha" type="password" minlength="6" required autocomplete="new-password"></label>
    <label class="campo"><span>Repita a nova senha</span><input name="senha2" type="password" minlength="6" required autocomplete="new-password"></label>
    <button class="btn pri">Salvar nova senha</button></form>`),
  backup: async () => {
    carregando(true, 'Gerando backup…');
    try {
      await carregarTudo();
      const dados = { app: 'TáFeito', versao: VERSAO, gerado_em: agoraISO(), tabelas: {} };
      for (const t of TABELAS) dados.tabelas[t] = S.dados[t];
      const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `tafeito-backup-${hojeISO()}.json`; document.body.appendChild(a); a.click(); a.remove();
      carregando(false); toast('Backup baixado 💾 Agora salve no Drive.', 'ok');
    } catch (e) { carregando(false); toast(msgErro(e), 'bad'); }
  },
  calMes: d => { const [y, m] = S.calMes.split('-').map(Number); const n = new Date(y, m - 1 + Number(d.n), 1); S.calMes = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`; render(); },
  importar: () => modalImportar(),
  avisos: () => modalAvisos(),
  notifAtivar: async () => { if (!('Notification' in window)) return; const p = await Notification.requestPermission(); if (p === 'granted') { await inscreverPush(true); } await checarNotif(); if (S.notifEstado === 'ativo') toast('🔔 Notificações ligadas! App liberado.', 'ok'); },
  notifRechecar: () => checarNotif(),
  enviarImagens: () => modalEnviarImagens(),
  abaImg: d => { S.abaImg = d.aba; render(); },
  baixarImg: d => baixarImg(d.id),
  baixarPasta: d => baixarPasta(d.aba),
  filtroImg: d => { S.filtroImg = d.v; render(); },
  verImg: d => abrirVisor(d.id),
  visorFechar: () => { VISOR = null; desenharVisor(); },
  visorIr: d => irVisor(Number(d.v)),
  visorZoom: () => { if (ignorarZoomVisor) { ignorarZoomVisor = false; return; } VISOR.zoom = !VISOR.zoom; const p = document.querySelector('.visor-palco'); if (p) p.classList.toggle('zoom', VISOR.zoom); },
  petAcao: d => cuidarPet(d.v),
  sugerirMascote: async d => { await enviarMsg(`💡 Sugestão de mascote: "${d.v}" — pode colocar no app?`, S.eu); toast('💡 Sugestão enviada para o pai!', 'ok'); },
  notifPaiTodas: d => salvarNotifPai(d.v === '1' ? [] : NOTIF_PAI.map(x => x[0]).filter(k => k !== 'notif')),
  aprovarImg: d => { const i = S.dados.imagens.find(x => x.id === d.id); avaliarImagem(d.id, i && i.status === 'aprovada' ? 'pendente' : 'aprovada'); },
  reprovarImg: d => modalReprovar(d.id),
  salvarReprova: async d => { const m = ($('#motivoImg') || {}).value || ''; if (!m.trim()) return toast('Escreva o motivo.', 'bad'); if (await avaliarImagem(d.id, 'reprovada', m)) fecharTopo(); },
  motivoRapido: d => { const t = $('#motivoImg'); if (t) { t.value = (t.value.trim() ? t.value.trim() + '; ' : '') + d.v; t.focus(); } },
  desfazerReprova: async d => { if (await avaliarImagem(d.id, 'pendente')) fecharTopo(); },
  apagarImg: async d => {
    if (!confirm('Apagar esta imagem? O valor dela sai do saldo.')) return;
    const i = S.dados.imagens.find(x => x.id === d.id);
    try { await DB.remover('imagens', d.id); await DB.sb.storage.from('mok-imagens').remove([i.caminho]); S.dados.imagens = S.dados.imagens.filter(x => x.id !== d.id); render(); toast('Imagem apagada'); } catch (e) { toast(msgErro(e), 'bad'); }
  },
  notionEntrar: () => notionEntrar(),
  notionDesconectar: async () => { try { await chamarNotion({ acao: 'sair' }); } catch { } localStorage.removeItem('mok_notion_token'); fecharModais(); modalConectores(); },
  icalImportar: () => icalImportar(),
  teste: () => modalTeste(),
  testeAtivar: () => ativarAvisosTeste(),
  testeRapido: () => agendarTeste(new Date(Date.now() + 60000)),
  testeAgendar: () => { const v = $('#testeQuando').value; if (!v) return toast('Escolha a data e a hora.', 'bad'); agendarTeste(new Date(v)); },
  abrirSite: d => window.open(d.url, '_blank', 'noopener'),
  conectores: () => modalConectores(),
  notionImportar: d => notionImportar(d.id, d.nome),
  meuPerfil: () => modalPerfil(S.papel === 'pai' ? 'pai' : S.eu),
  perfilFilho: d => modalPerfil(d.id),
  trocarFoto: d => escolherFotoPerfil(d.id),
  removerFoto: d => salvarFotoPerfil(d.id, ''),
  mascoteEditar: d => modalMascote(d.id || (S.papel === 'pai' ? fid() : S.eu)),
  mascoteTipo: (d, b) => { const nm = $('#mascNome'); if (nm) MASC_EDIT.nome = nm.value; MASC_EDIT.tipo = d.v; const id = b.closest('.modal').querySelector('[data-act=mascoteSalvar]').dataset.id; const r = { ...MASC_EDIT }; fecharModais(); modalMascote(id, r); },
  mascoteOpc: (d, b) => { MASC_EDIT[d.k] = d.v; const box = b.closest('.modal'); box.querySelector('.masc-preview').innerHTML = mascoteVisual(MASC_EDIT, 190); box.querySelectorAll(`[data-k="${d.k}"]`).forEach(x => x.classList.toggle('on', x.dataset.v === d.v)); },
  mascoteSalvar: async d => {
    const nm = $('#mascNome'); MASC_EDIT.nome = (nm && nm.value.trim().slice(0, 20)) || 'Bolt'; const vz = $('#mascVoz'); if (vz) MASC_EDIT.voz = vz.checked;
    try { await salvarPerfil(d.id, { mascote: { ...MASC_EDIT } }); fecharModais(); toast(`🎨 ${MASC_EDIT.nome} está pronto!`, 'ok'); } catch (e) { toast(msgErro(e), 'bad'); }
  },
  mascote: () => { modalAssistente(); const m = mascoteDe(S.eu); if (m.voz !== false) falar(textoMascote()); },
  mascoteFalar: () => falar(textoMascote()),
  mascoteTestarVoz: () => { const n = ($('#mascNome') || {}).value || MASC_EDIT.nome; falar(S.papel === 'pai' && MASC_ID === 'pai' ? `${saudacao()}, ${nomePai()}! Eu sou o ${n}. Vou te contar como os meninos estão.` : `${saudacao()}, ${filhoAtual().nome}! Eu sou o ${n}, seu assistente. Vamos fazer as tarefas?`); },
  chatAbrir: () => { S.chatAberto = true; render(); setTimeout(() => { const i = $('#chatTxt'); if (i && innerWidth > 700) i.focus(); }, 50); },
  chatFechar: () => { S.chatAberto = false; render(); },
  whats: () => modalWhats(),
  whatsEnviar: d => enviarWhats(d.para),
  lerTextoImp: () => { const t = $('#txtImp').value.trim(); if (!t) return toast('Cole o texto primeiro.', 'bad'); const it = interpretarProvas({ text: t }); if (!it.length) return toast('Não encontrei provas nesse texto.', 'bad'); IMPORT = it; fecharModais(); modalRevisao(); },
  calHoje: () => { S.calMes = hojeISO().slice(0, 7); render(); },
  calDia: d => { const l = S.dados.provas.filter(p => p.filho_id === fid() && p.data === d.dia); if (l.length) modalDiaProvas(d.dia, l); else formProva(null, d.dia); },
  novaProva: d => formProva(null, d.dia),
  verProva: d => { const p = S.dados.provas.find(x => x.id === d.id); if (p) modalProva(p); },
  editarProva: d => { fecharModais(); formProva(S.dados.provas.find(x => x.id === d.id)); },
  apagarProva: async d => {
    if (!confirm('Excluir esta prova do calendário?')) return;
    try { await DB.remover('provas', d.id); S.dados.provas = S.dados.provas.filter(p => p.id !== d.id); fecharModais(); render(); toast('Prova excluída'); } catch (e) { toast(msgErro(e), 'bad'); }
  },
  ciente: async (d, b) => {
    if (b) b.disabled = true;
    try {
      const n = await DB.rpc('mok_ciente', { p_prova: d.id, p_etapa: d.etapa || 'lista' });
      S.dados.cientes = await DB.listar('cientes');
      if (d.alerta) { fecharTopo(); alertaAberto = null; }
      render(); toast(`👍 Ciente registrado (${n} no total)`, 'ok'); setTimeout(checarProvas, 400);
    } catch (e) { if (b) b.disabled = false; toast(msgErro(e), 'bad'); }
  },
  agendaTarefa: d => { const t = tarefaPorId(d.id); window.open(linkGoogle(t), '_blank'); },
  baixarIcs: () => baixarIcs(),
  compartilhar: () => {
    const link = linkConvite();
    const txt = `Instala o app *TáFeito* 📲✅\n\n1) Abra este link no Chrome:\n${link}\n\n2) Toque em ⋮ → *Instalar app* (no computador, no ícone de instalar na barra de endereço)\n3) Toque no seu nome e entre com o seu PIN.\n\nSuas tarefas, missões e prêmios estão lá. Bora! 💪`;
    modal(`<button class="icone-btn fechar" data-act="fechar">✕</button><h2>📲 Link do app</h2>
      <p class="mut peq">O link já leva a conexão do app. Mande só para a família.</p><p><code>${esc(link)}</code></p>
      <a class="btn zap" href="https://wa.me/?text=${encodeURIComponent(txt)}" target="_blank" rel="noopener">Enviar pelo WhatsApp</a><div style="height:8px"></div>
      <button class="btn ghost" data-act="copiar" data-txt="${esc(link)}">Copiar link</button>`);
  },
  copiar: async d => { try { await navigator.clipboard.writeText(d.txt); toast('Copiado!', 'ok'); } catch { prompt('Copie:', d.txt); } },
  ajudaBloqueio: () => modal(`<button class="icone-btn fechar" data-act="fechar">✕</button><h2>🔒 Bloqueio de verdade</h2>
    <p>O TáFeito mostra na tela se está <b>LIBERADO</b> ou <b>BLOQUEADO</b> e te avisa quando tudo foi feito. Um app de navegador não tem permissão para travar o Windows ou o Android sozinho.</p>
    <p>Para travar de verdade, use junto (grátis):</p>
    <p>📱 <b>Google Family Link</b> no celular do filho: você bloqueia e libera pelo seu celular, com limite de horas.</p>
    <p>💻 <b>Microsoft Family Safety</b> no computador com Windows: limite de tempo e bloqueio por conta.</p>
    <p class="mut peq">Rotina: quando o TáFeito avisar "Tudo feito", você libera no Family Link/Family Safety pelas horas do prêmio.</p>
    <button class="btn pri" data-act="fechar">Entendi</button>`)
};

const forms = {
  conectar: f => {
    const u = f.u.value.trim().replace(/\/+$/, ''), k = f.k.value.trim();
    if (!/^https:\/\/.+\.supabase\.co$/.test(u)) return toast('A URL precisa ser do tipo https://xxxx.supabase.co', 'bad');
    lsSet('mok_conn', { u, k }); localStorage.removeItem('mok_modo'); location.reload();
  },
  criarPai: async f => {
    carregando(true, 'Criando conta…');
    const email = f.email.value.trim().toLowerCase();
    try {
      lsSet('mok_email_pai', email);
      try { await DB.rpc('mok_criar_pai', { p_nome: f.nome.value.trim(), p_email: email, p_senha: f.senha.value }); }
      catch (e) { if (/mok_criar_pai|function|schema cache/i.test(msgErro(e)) && !/pai cadastrado|inválid|senha/i.test(msgErro(e))) throw new Error('Atualize o banco: abra bravusmidia.com.br/tafeito/sql.html, copie e rode no SQL Editor do Supabase.'); throw e; }
      const { data, error } = await DB.sb.auth.signInWithPassword({ email, password: f.senha.value });
      if (error) throw error;
      carregando(false); fecharModais(); await entrarComSessao(data.user);
    } catch (e) { carregando(false); toast(msgErro(e), 'bad'); }
  },
  loginPai: async f => {
    carregando(true, 'Entrando…');
    try {
      lsSet('mok_email_pai', f.email.value.trim());
      const { data, error } = await DB.sb.auth.signInWithPassword({ email: f.email.value.trim(), password: f.senha.value });
      if (error) throw error; carregando(false); fecharModais(); await entrarComSessao(data.user);
    } catch (e) { carregando(false); toast(msgErro(e), 'bad'); }
  },
  loginFilho: async f => {
    carregando(true, 'Entrando…');
    try {
      const { data, error } = await DB.sb.auth.signInWithPassword({ email: emailFilho(f.dataset.id), password: f.pin.value });
      if (error) throw error; carregando(false); fecharModais(); await entrarComSessao(data.user);
    } catch (e) { carregando(false); toast(msgErro(e), 'bad'); }
  },
  demoPai: async f => {
    const pin = lsGet('mok_demo_pin');
    if (!pin) lsSet('mok_demo_pin', f.pin.value); else if (pin !== f.pin.value) return toast('PIN errado', 'bad');
    fecharModais(); S.papel = 'pai'; S.eu = 'pai'; await abrirApp();
  },
  tarefa: async f => {
    const id = f.dataset.id; const ant = id ? tarefaPorId(id) : null;
    const dias = [...f.querySelectorAll('input[name=dia]:checked')].map(i => Number(i.value));
    const t = {
      ...(ant || { id: uid(), filho_id: fid(), criado_em: agoraISO() }),
      icone: f.icone.value.trim(), titulo: f.titulo.value.trim(), categoria: f.categoria.value, descricao: f.descricao.value.trim(),
      recorrencia: f.recorrencia.value, dias: dias.length === 7 ? [] : dias, data_unica: f.recorrencia.value === 'unica' ? (f.data_unica.value || hojeISO()) : null,
      horario: f.horario.value, aviso_antes: num(f.aviso_antes.value), xp: num(f.xp.value)
    };
    if (S.papel === 'pai') { t.valor = f.valor ? num(f.valor.value) : 0; t.foto = f.foto.checked; t.obrigatoria = f.obrigatoria.checked; }
    else if (!ant) { t.valor = 0; t.foto = true; t.obrigatoria = true; }
    t.ativa = f.ativa.checked;
    if (S.papel === 'pai' && f.itens) { const its = f.itens.value.split('\n').map(x => x.trim()).filter(Boolean).slice(0, 12); if (its.length || Array.isArray(t.itens)) t.itens = its; }
    try {
      const s = await DB.salvar('tarefas', t); const i = S.dados.tarefas.findIndex(x => x.id === t.id);
      if (i >= 0) S.dados.tarefas[i] = s || t; else S.dados.tarefas.push(s || t);
      S.vistos.tars && S.vistos.tars.add(t.id);
      fecharModais(); render(); toast('Tarefa salva ✅', 'ok');
    } catch (e) { toast(msgErro(e), 'bad'); }
  },
  missao: async f => {
    const id = f.dataset.id; const ant = id ? S.dados.missoes.find(m => m.id === id) : null;
    const m = { ...(ant || { id: uid(), filho_id: fid(), criado_em: agoraISO() }), icone: f.icone.value.trim() || '🏆', titulo: f.titulo.value.trim(), descricao: f.descricao.value.trim(),
      tipo: f.tipo.value, meta: Math.max(1, num(f.meta.value)), categoria: f.categoria.value, premio: f.premio.value.trim(), xp: num(f.xp.value), ativa: f.ativa.checked };
    m.valor = S.papel === 'pai' ? num(f.valor.value) : (ant ? ant.valor : 0);
    try { const s = await DB.salvar('missoes', m); const i = S.dados.missoes.findIndex(x => x.id === m.id); if (i >= 0) S.dados.missoes[i] = s || m; else S.dados.missoes.push(s || m); fecharModais(); render(); toast('Missão salva', 'ok'); }
    catch (e) { toast(msgErro(e), 'bad'); }
  },
  filho: async f => {
    const id = f.dataset.id; const ant = id ? S.dados.filhos.find(x => x.id === id) : null;
    let novoId = id;
    if (!ant) { novoId = f.nome.value.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '') || 'filho'; if (S.dados.filhos.some(x => x.id === novoId)) novoId += Math.floor(Math.random() * 90 + 10); }
    const x = { ...(ant || { id: novoId, ordem: S.dados.filhos.length + 1, criado_em: agoraISO() }), nome: f.nome.value.trim(), horas_pc: num(f.horas_pc.value), horas_cel: num(f.horas_cel.value), premio_extra: f.premio_extra.value.trim(), exigir_aprovacao: f.exigir_aprovacao.checked, exigir_todas: f.exigir_todas.checked, whatsapp: f.whatsapp.value.replace(/\D/g, ''), valor_imagem: num(f.valor_imagem.value), tamanho_grupo: Math.max(1, num(f.tamanho_grupo.value) || 10) };
    try { const s = await DB.salvar('filhos', x); const i = S.dados.filhos.findIndex(y => y.id === x.id); if (i >= 0) S.dados.filhos[i] = s || x; else S.dados.filhos.push(s || x); if (!S.filhoSel) S.filhoSel = x.id; fecharModais(); render(); toast('Salvo ✅', 'ok'); }
    catch (e) { toast(msgErro(e), 'bad'); }
  },
  perfil: async f => {
    const x = { ...filhoAtual(), nome: f.nome.value.trim() };
    try { await DB.salvar('filhos', x); Object.assign(filhoAtual(), x); fecharModais(); render(); } catch (e) { toast(msgErro(e), 'bad'); }
  },
  criarAcesso: async f => {
    const filho = f.dataset.id; const pin = f.pin.value.trim();
    if (!/^\d{4}$/.test(pin)) return toast('Use 4 números.', 'bad');
    carregando(true, 'Criando acesso…');
    try {
      await DB.rpc('mok_criar_acesso_filho', { p_filho: filho, p_pin: pin });
      await carregarTudo(); carregando(false); fecharModais(); render();
      modal(`<div class="grande">🔑</div><h2>Acesso criado!</h2><p>${esc(nomeFilho(filho))} entra tocando no nome dele e digitando o PIN <b>${esc(pin)}</b>.</p><button class="btn zap" data-act="compartilhar">Mandar o link pelo WhatsApp</button><div style="height:8px"></div><button class="btn ghost" data-act="fechar">Fechar</button>`, 'alerta');
    } catch (e) { carregando(false); toast(msgErro(e), 'bad'); }
  },
  senhaFilho: async f => {
    const pin = f.pin.value.trim();
    if (!/^\d{4}$/.test(pin)) return toast('Use 4 números.', 'bad');
    if (pin !== f.pin2.value.trim()) return toast('As senhas não são iguais.', 'bad');
    carregando(true, 'Salvando senha…');
    try {
      await DB.rpc('mok_criar_acesso_filho', { p_filho: f.dataset.id, p_pin: pin });
      await carregarTudo(); carregando(false); fecharModais(); render();
      modal(`<div class="grande">🔑</div><h2>Senha salva!</h2><p>${esc(nomeFilho(f.dataset.id))} entra tocando no nome dele e digitando a senha <b>${esc(pin)}</b>.</p><button class="btn ghost" data-act="fechar">Fechar</button>`, 'alerta');
    } catch (e) { carregando(false); toast(msgErro(e), 'bad'); }
  },
  trocarPin: async f => {
    const pin = f.pin.value.trim(); if (!/^\d{4}$/.test(pin)) return toast('Use 4 números.', 'bad');
    try { await DB.rpc('mok_criar_acesso_filho', { p_filho: f.dataset.id, p_pin: pin }); fecharModais(); toast('PIN trocado ✅', 'ok'); } catch (e) { toast(msgErro(e), 'bad'); }
  },
  reprovar: async f => {
    const r = S.dados.registros.find(x => x.id === f.dataset.reg); if (!r) return;
    if (await salvarReg({ ...r, status: 'reprovada', obs: f.obs.value.trim() })) { fecharModais(); toast('Enviado para refazer'); }
  },
  pedido: async f => {
    const p = { id: uid(), filho_id: S.eu, area: f.area.value, mensagem: f.mensagem.value.trim(), status: 'pendente', criado_em: agoraISO(), respondido_em: null, expira_em: null };
    try { await DB.inserir('pedidos', p); S.dados.pedidos.push(p); S.vistos.ped[p.id] = 'pendente'; fecharModais(); render(); toast('Pedido enviado ao pai ✅', 'ok'); } catch (e) { toast(msgErro(e), 'bad'); }
  },
  prova: async f => {
    const id = f.dataset.id; const ant = id ? S.dados.provas.find(p => p.id === id) : null;
    const p = { ...(ant || { id: uid(), filho_id: fid(), criado_por: S.papel === 'pai' ? 'pai' : S.eu, criado_em: agoraISO() }), materia: f.materia.value.trim(), instituicao: f.instituicao.value.trim(), site: /^https?:\/\//.test(f.site.value.trim()) ? f.site.value.trim() : '', conteudo: f.conteudo.value.trim(), data: f.data.value || null, horario: f.horario.value || '08:00' };
    try {
      const s = await DB.salvar('provas', p); const i = S.dados.provas.findIndex(x => x.id === p.id);
      if (i >= 0) S.dados.provas[i] = s || p; else S.dados.provas.push(s || p);
      S.vistos.prv && (S.vistos.prv[p.id] = p.materia + p.data + p.horario);
      if (p.data) S.calMes = p.data.slice(0, 7); fecharModais(); render(); toast(ant ? 'Prova atualizada ✅' : p.data ? '📅 Prova marcada! Vou te lembrar 2 dias, 1 dia e 2 horas antes.' : '📌 Prova salva sem data.', 'ok');
    } catch (e) { toast(msgErro(e), 'bad'); }
  },
  salvarImport: f => salvarImport(f),
  whatsPai: async f => { try { await salvarPerfil('pai', { whatsapp: f.w.value }); toast('WhatsApp salvo ✅', 'ok'); } catch (e) { toast(msgErro(e), 'bad'); } },
  perfil2: async f => {
    const id = f.dataset.id;
    try {
      if (f.nome && S.papel === 'pai') {
        if (id === 'pai') { if (S.modo === 'online') await DB.rpc('mok_registrar_pai', { p_nome: f.nome.value.trim() }); }
        else { const x = S.dados.filhos.find(y => y.id === id); await DB.salvar('filhos', { ...x, nome: f.nome.value.trim() }); }
      }
      await salvarPerfil(id, { whatsapp: f.whatsapp ? f.whatsapp.value : null });
      fecharModais(); toast('Perfil salvo ✅', 'ok');
    } catch (e) { toast(msgErro(e), 'bad'); }
  },
  trocarSenha: async f => {
    if (f.senha.value !== f.senha2.value) return toast('As senhas não são iguais.', 'bad');
    try { const { error } = await DB.sb.auth.updateUser({ password: f.senha.value }); if (error) throw error; fecharModais(); toast('Senha trocada ✅', 'ok'); } catch (e) { toast(msgErro(e), 'bad'); }
  },
  pagar: async f => {
    const p = { id: uid(), filho_id: fid(), valor: num(f.valor.value), obs: f.obs.value.trim(), criado_em: agoraISO() };
    try { await DB.inserir('pagamentos', p); S.dados.pagamentos.push(p); fecharModais(); render(); toast('Pagamento registrado 💸', 'ok'); enviarMsgAuto(`💸 Te paguei ${brl(p.valor)}${p.obs ? ' (' + p.obs + ')' : ''}.`, p.filho_id); } catch (e) { toast(msgErro(e), 'bad'); }
  },
  chat: f => { const i = f.querySelector('input'); const t = i.value.trim(); if (!t) return; i.value = ''; enviarMsg(t); }
};

const mudancas = {
  notifPai: el => { const off = new Set(notifPaiOff()); if (el.checked) off.delete(el.dataset.k); else off.add(el.dataset.k); salvarNotifPai([...off]); },
  diaVer: el => { S.diaVer = el.value || hojeISO(); render(); },
  mascoteCor: el => { MASC_EDIT[el.dataset.k] = el.value; const box = el.closest('.modal'); box.querySelector('.masc-preview').innerHTML = mascoteVisual(MASC_EDIT, 190); },
  recorrencia: el => { const u = el.value === 'unica'; $('#boxDias').hidden = u; $('#boxData').hidden = !u; }
};

document.addEventListener('input', e => { if (e.target.id === 'buscaMasc') filtrarMascotes(e.target.value); });

/* arrastar o chat e o mascote para qualquer lugar da tela */
let arrasto = null, ignorarClique = false;
document.addEventListener('pointerdown', e => {
  const el = e.target.closest('[data-arrastar]'); if (!el) return;
  const r = el.getBoundingClientRect(); arrasto = { el, k: el.dataset.arrastar, dx: e.clientX - r.left, dy: e.clientY - r.top, x0: e.clientX, y0: e.clientY, moveu: false };
});
document.addEventListener('pointermove', e => {
  if (!arrasto) return; const a = arrasto;
  if (!a.moveu && Math.hypot(e.clientX - a.x0, e.clientY - a.y0) < 8) return;
  a.moveu = true; e.preventDefault(); a.el.classList.add('arrastando');
  const w = a.el.offsetWidth, h = a.el.offsetHeight;
  a.x = Math.max(4, Math.min(innerWidth - w - 4, e.clientX - a.dx)); a.y = Math.max(4, Math.min(innerHeight - h - 4, e.clientY - a.dy));
  Object.assign(a.el.style, { left: a.x + 'px', top: a.y + 'px', right: 'auto', bottom: 'auto' });
}, { passive: false });
document.addEventListener('pointerup', () => {
  if (!arrasto) return; const a = arrasto; arrasto = null;
  if (a.moveu) { a.el.classList.remove('arrastando'); lsSet('mok_pos_' + a.k, { x: a.x, y: a.y }); ignorarClique = true; setTimeout(() => { ignorarClique = false; }, 50); }
});
document.addEventListener('click', e => {
  if (ignorarClique) { ignorarClique = false; e.preventDefault(); return; }
  const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
  const fn = acoes[b.dataset.act]; if (!fn) return;
  e.preventDefault(); desbloquearAudio(); fn(b.dataset, b);
});
document.addEventListener('submit', e => {
  const f = e.target.closest('[data-form]'); if (!f) return;
  e.preventDefault(); desbloquearAudio(); const fn = forms[f.dataset.form]; if (fn) fn(f);
});
document.addEventListener('change', e => { const el = e.target.closest('[data-change]'); if (el && mudancas[el.dataset.change]) mudancas[el.dataset.change](el); });

/* ---------------- registros / fotos ---------------- */
function novoReg(t, dia) {
  return { id: regId(t, dia), filho_id: t.filho_id, tarefa_id: t.id, data: dia, categoria: t.categoria, foto_antes: null, foto_antes_em: null, foto_depois: null, foto_depois_em: null, status: 'pendente', feito_em: null, obs: '', xp: num(t.xp), valor: num(t.valor), ...(itensDe(t).length ? { itens_feitos: [] } : {}) };
}
function itensDe(t) { return t && Array.isArray(t.itens) ? t.itens.filter(x => typeof x === 'string' && x.trim()) : []; }
function itensMarcados(r) { return r && Array.isArray(r.itens_feitos) ? r.itens_feitos.map(Number).filter(n => Number.isInteger(n)) : []; }
async function salvarReg(r) {
  const limpo = { ...r }; delete limpo.atualizado_em;
  try {
    const s = await DB.salvar('registros', limpo);
    const i = S.dados.registros.findIndex(x => x.id === r.id);
    if (i >= 0) S.dados.registros[i] = s || r; else S.dados.registros.push(s || r);
    S.vistos.reg[r.id] = (s || r).status; render(); return true;
  } catch (e) { toast(msgErro(e), 'bad'); return false; }
}

let fotoAlvo = null;
/* Câmera dentro do app: não abre o app de câmera do celular, então o Android
   não fecha o navegador por falta de memória (o que fazia a foto se perder). */
let camStream = null;
function pararCamera() { if (camStream) { camStream.getTracks().forEach(t => t.stop()); camStream = null; } }
function escolherGaleria() { pararCamera(); fecharTopo(); const i = $('#inputGaleria'); i.value = ''; i.click(); }
async function abrirCamera(tipo) {
  const rot = tipo === 'antes' ? 'ANTES' : 'DEPOIS';
  const el = modal(`<h3 style="margin:0 0 10px">📷 Foto ${rot}</h3>
    <div class="cam"><video playsinline autoplay muted></video><p class="mut peq cam-msg">Abrindo a câmera…</p></div>
    <div class="acoes" style="margin-top:12px"><button class="btn pri" data-cam="tirar" disabled>📸 Tirar foto</button></div>
    <div class="acoes" style="margin-top:8px"><button class="btn ghost sm" data-cam="galeria">🖼️ Escolher da galeria</button><button class="btn ghost sm" data-cam="sair">Cancelar</button></div>`, 'alerta');
  const video = el.querySelector('video'), msg = el.querySelector('.cam-msg'), btn = el.querySelector('[data-cam=tirar]');
  el.querySelector('[data-cam=sair]').onclick = () => { pararCamera(); fotoAlvo = null; el.remove(); };
  el.querySelector('[data-cam=galeria]').onclick = escolherGaleria;
  btn.onclick = () => {
    if (!video.videoWidth) return;
    const c = document.createElement('canvas'); c.width = video.videoWidth; c.height = video.videoHeight;
    c.getContext('2d').drawImage(video, 0, 0);
    pararCamera(); el.remove();
    c.toBlob(b => { if (b) processarFoto(b); else toast('Não deu para capturar. Tente de novo.', 'bad'); }, 'image/jpeg', .92);
  };
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('sem camera');
    pararCamera();
    camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false });
    if (!el.isConnected) return pararCamera();
    video.srcObject = camStream; await video.play().catch(() => {});
    msg.textContent = ''; btn.disabled = false;
  } catch (e) {
    console.warn('camera', e);
    msg.innerHTML = 'Não consegui abrir a câmera aqui.<br>Permita o acesso à câmera para o TáFeito ou use <b>Escolher da galeria</b> (tire a foto com a câmera do celular antes).';
  }
}
$('#inputGaleria').addEventListener('change', e => { const arq = e.target.files && e.target.files[0]; if (arq) processarFoto(arq); });
$('#inputFoto').addEventListener('change', e => { const arq = e.target.files && e.target.files[0]; if (arq) processarFoto(arq); });
async function processarFoto(arq) {
  if (!arq || !fotoAlvo) return;
  const t = tarefaPorId(fotoAlvo.tarefa); const tipo = fotoAlvo.tipo; fotoAlvo = null;
  carregando(true, 'Enviando foto…');
  try {
    const blob = await prepararFoto(arq, tipo === 'antes' ? 'ANTES' : 'DEPOIS', t.titulo);
    const url = await DB.enviarFoto(blob);
    const dia = hojeISO(); const r = { ...(regDe(t, dia) || novoReg(t, dia)) };
    if (r.status === 'reprovada') r.status = 'pendente';
    r['foto_' + tipo] = url; r['foto_' + tipo + '_em'] = agoraISO();
    if (tipo === 'antes') { r.foto_depois = null; r.foto_depois_em = null; }
    carregando(false);
    if (await salvarReg(r)) toast(tipo === 'antes' ? '📷 Foto ANTES salva. Agora faça a tarefa!' : '📷 Foto DEPOIS salva. Agora marque como feita!', 'ok');
  } catch (err) { carregando(false); toast(msgErro(err), 'bad'); }
}

async function prepararFoto(arq, rotulo, titulo) {
  const max = S.modo === 'local' ? 520 : 1280;
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(arq); });
  let w = img.naturalWidth, h = img.naturalHeight; const esc2 = Math.min(1, max / Math.max(w, h)); w = Math.round(w * esc2); h = Math.round(h * esc2);
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  g.drawImage(img, 0, 0, w, h); URL.revokeObjectURL(img.src);
  const fs = Math.max(12, Math.round(w / 32)); const bar = fs * 2;
  g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(0, h - bar, w, bar);
  g.fillStyle = rotulo === 'ANTES' ? '#f5a524' : '#22c55e'; g.font = `bold ${fs}px sans-serif`; g.textBaseline = 'middle';
  g.fillText(rotulo, fs * .6, h - bar / 2);
  const lw = g.measureText(rotulo + '  ').width;
  g.fillStyle = '#fff'; g.font = `${fs * .85}px sans-serif`;
  g.fillText(`${titulo} • ${new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, fs * .6 + lw, h - bar / 2);
  return await new Promise(res => c.toBlob(res, 'image/jpeg', S.modo === 'local' ? .6 : .75));
}

/* ---------------- chat ---------------- */
async function enviarMsg(texto, filhoId = fid()) {
  const m = { id: uid(), filho_id: filhoId, autor: S.papel === 'pai' ? 'pai' : S.eu, texto: texto.slice(0, 1000), lido: false, criado_em: agoraISO() };
  S.vistos.msgs && S.vistos.msgs.add(m.id);
  S.dados.mensagens.push(m); render();
  try { await DB.inserir('mensagens', m); } catch (e) { S.dados.mensagens = S.dados.mensagens.filter(x => x.id !== m.id); render(); toast(msgErro(e), 'bad'); }
}
function enviarMsgAuto(texto, filhoId) { enviarMsg(texto, filhoId || fid()).catch(() => { }); }
let marcando = false;
async function marcarLidas() {
  if (marcando) return; const eu = S.papel === 'pai' ? 'pai' : S.eu;
  const l = S.dados.mensagens.filter(m => m.filho_id === fid() && !m.lido && m.autor !== eu); if (!l.length) return;
  marcando = true;
  for (const m of l) { m.lido = true; try { await DB.atualizar('mensagens', m.id, { lido: true }); } catch { } }
  marcando = false;
}

/* ---------------- notificações / lembretes ---------------- */
let AC = null;
function desbloquearAudio() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch { } }
function beep() {
  try {
    desbloquearAudio(); if (!AC) return;
    [0, .25, .5].forEach((t, i) => {
      const o = AC.createOscillator(), g = AC.createGain(); o.type = 'sine'; o.frequency.value = i === 2 ? 1175 : 880;
      o.connect(g); g.connect(AC.destination);
      const t0 = AC.currentTime + t; g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.35, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
      o.start(t0); o.stop(t0 + 0.24);
    });
  } catch { }
}
/* push de verdade (chega com o app fechado): o servidor manda pelo Supabase */
async function inscreverPush(avisarErro) {
  try {
    if (S.modo !== 'online' || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window) || Notification.permission !== 'granted') return false;
    const reg = await navigator.serviceWorker.ready;
    const resp = await fetch(DB.c.u.replace(/\/$/, '') + '/functions/v1/tafeito-push?chave=1', { headers: { apikey: DB.c.k } });
    if (!resp.ok) throw new Error('push indisponível (' + resp.status + ')');
    const { chave } = await resp.json(); if (!chave) throw new Error('sem chave');
    let sub = await reg.pushManager.getSubscription();
    if (sub && lsGet('mok_push_chave') !== chave) { try { await sub.unsubscribe(); } catch { } sub = null; }
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64url(chave) });
    const j = sub.toJSON();
    await DB.rpc('mok_push_salvar', { p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth, p_base: DB.c.u.replace(/\/$/, '') });
    lsSet('mok_push_chave', chave); lsSet('mok_push_ok', 1); return true;
  } catch (e) {
    console.warn('push', e); localStorage.removeItem('mok_push_ok');
    if (avisarErro) toast('Aviso com app fechado ainda não ligado no servidor. Com o app aberto funciona.', '');
    return false;
  }
}
function b64url(s) { const p = '='.repeat((4 - s.length % 4) % 4); const b = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(b, c => c.charCodeAt(0)); }

async function notificar(titulo, corpo, tag) {
  beep(); if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  if (document.visibilityState === 'visible') { const c = corpo || ''; toast(`${titulo}${c ? ' — ' + (c.length > 70 ? c.slice(0, 70) + '…' : c) : ''}`); }
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if (lsGet('mok_push_ok') && ['msg', 'ped', 'reg', 'tar', 'lembrete', 'mis', 'pag', 'prova', 'ciente', 'login', 'filho', 'teste', 'central'].includes(tag) && document.visibilityState !== 'visible') return; // o push do servidor já mostra
  const op = { body: corpo || '', icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: tag ? tag + '-' + Date.now() : undefined, vibrate: [200, 100, 200], requireInteraction: true };
  try { const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration(); if (reg) await reg.showNotification(titulo, op); else new Notification(titulo, op); }
  catch { try { new Notification(titulo, op); } catch { } }
}
function checarLembretes() {
  if (S.papel !== 'filho') return;
  const dia = hojeISO(); const hm = new Date().toTimeString().slice(0, 5);
  const enviados = lsGet('mok_avisos', {}); const atrasadas = [];
  for (const t of tarefasDoDia(dia)) {
    if (!t.horario || ehFeita(regDe(t, dia))) continue;
    const av = num(t.aviso_antes ?? 30), ka = regId(t, dia) + '@antes@' + dia;
    if (av > 0 && !enviados[ka] && minutos(t.horario) - minutos(hm) <= av && minutos(t.horario) - minutos(hm) > 0) {
      enviados[ka] = 1; notificar(`⏳ Em ${minutos(t.horario) - minutos(hm)} min: ${t.titulo}`, `Às ${t.horario}. Já vai se preparando!`, 'lembrete');
    }
    const k = regId(t, dia) + '@' + dia; if (enviados[k]) continue;
    if (t.horario <= hm) {
      enviados[k] = 1;
      if (minutos(hm) - minutos(t.horario) <= 10) {
        notificar(`⏰ Hora de: ${t.titulo}`, t.foto ? 'Tire a foto ANTES, faça e tire a foto DEPOIS.' : 'Faça e marque como feita.', 'lembrete');
        modal(`<div class="grande">${esc(t.icone || '⏰')}</div><h2>Hora da tarefa!</h2><p style="font-size:1.15rem"><b>${esc(t.titulo)}</b></p><p class="mut">${esc(t.descricao || '')}</p><button class="btn pri" data-act="fechar">Bora fazer 💪</button>`, 'alerta');
      } else atrasadas.push(t.titulo);
    }
  }
  if (atrasadas.length) notificar(`📋 ${atrasadas.length} tarefa(s) atrasada(s)`, atrasadas.join(', '), 'atraso');
  for (const k of Object.keys(enviados)) if (!k.endsWith('@' + dia)) delete enviados[k];
  lsSet('mok_avisos', enviados);
}

/* ---------------- agenda / despertador ---------------- */
const tz = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Fortaleza';
const rrule = t => (t.dias || []).length && t.dias.length < 7 ? 'RRULE:FREQ=WEEKLY;BYDAY=' + t.dias.map(d => RRDIA[d]).join(',') : 'RRULE:FREQ=DAILY';
function proximoDia(t) { let d = hojeISO(); for (let i = 0; i < 8; i++) { if (!(t.dias || []).length || t.dias.includes(dow(d))) return d; d = addDias(d, 1); } return hojeISO(); }
function datasEvento(t) {
  const dia = t.recorrencia === 'unica' ? (t.data_unica || hojeISO()) : proximoDia(t);
  const hm = t.horario || '08:00'; const ini = new Date(`${dia}T${hm}:00`); const fim = new Date(ini.getTime() + 15 * 60000);
  const f = d => `${hojeISO(d).replace(/-/g, '')}T${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}00`;
  return { ini: f(ini), fim: f(fim) };
}
function linkGoogle(t) {
  const { ini, fim } = datasEvento(t);
  let u = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('✅ ' + t.titulo + ' (TáFeito)')}&dates=${ini}/${fim}&ctz=${encodeURIComponent(tz())}&details=${encodeURIComponent((t.descricao || '') + '\nAbra o TáFeito e tire a foto ANTES e DEPOIS.')}`;
  if (t.recorrencia !== 'unica') u += '&recur=' + encodeURIComponent(rrule(t));
  return u;
}
function baixarIcs() {
  const tars = deFilho('tarefas').filter(t => t.ativa !== false && t.horario);
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//TaFeito//PT-BR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:TáFeito'];
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const escI = s => String(s || '').replace(/\\/g, '\\\\').replace(/[,;]/g, m => '\\' + m).replace(/\n/g, '\\n');
  for (const t of tars) {
    const { ini, fim } = datasEvento(t);
    L.push('BEGIN:VEVENT', `UID:${t.id}@missaook`, `DTSTAMP:${stamp}`, `DTSTART;TZID=${tz()}:${ini}`, `DTEND;TZID=${tz()}:${fim}`);
    if (t.recorrencia !== 'unica') L.push(rrule(t));
    L.push(`SUMMARY:${escI('✅ ' + t.titulo)}`, `DESCRIPTION:${escI((t.descricao || '') + ' — Abra o TáFeito e tire as fotos.')}`,
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:PT0M', `DESCRIPTION:${escI('Hora de: ' + t.titulo)}`, 'END:VALARM', 'END:VEVENT');
  }
  L.push('END:VCALENDAR');
  const blob = new Blob([L.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `tafeito-${fid()}.ics`; document.body.appendChild(a); a.click(); a.remove();
  toast(`${tars.length} lembretes gerados 📅`, 'ok');
}
function modalAgenda() {
  const tars = deFilho('tarefas').filter(t => t.ativa !== false && t.horario).sort((a, b) => a.horario.localeCompare(b.horario));
  modal(`<button class="icone-btn fechar" data-act="fechar">✕</button><h2>📅 Agenda e despertador</h2>
    <p class="mut peq">Os lembretes ficam na agenda do celular e tocam na hora de cada tarefa, mesmo com o app fechado.</p>
    <button class="btn pri" data-act="baixarIcs">Baixar todos os lembretes (.ics)</button>
    <p class="mut peq">iPhone e Samsung: abra o arquivo baixado e toque em "Adicionar". Google Agenda: use os botões abaixo, um por tarefa.</p>
    <div class="card">${tars.length ? tars.map(t => `<div class="lista-item"><span>${esc(t.icone || '⏰')}</span><div class="tt">${esc(t.titulo)}<small>${infoTarefa(t)}</small></div><a class="btn ghost sm" href="${esc(linkGoogle(t))}" target="_blank" rel="noopener">+ Google</a></div>`).join('') : '<p class="mut">Nenhuma tarefa com horário.</p>'}</div>
    <div class="aviso info">⏰ Quer que <b>toque como despertador</b>? No app Relógio do celular, crie alarmes nos mesmos horários com o nome da tarefa. Na agenda, escolha um som de alerta mais alto.</div>`);
}

/* ---------------- link de convite ---------------- */
const emailFilho = id => `${id}.${(S.ini && S.ini.familia) || (S.config && S.config.familia) || 'familia'}@missaook.app`;
function linkConvite() { const base = location.origin + location.pathname.replace(/index\.html$/, ''); return `${base}#c=${b64enc({ u: DB.c.u, k: DB.c.k })}`; }

/* ---------------- PWA ---------------- */
function registrarSW() { if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(e => console.warn('sw', e)); }
if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', e => { if (e.data && e.data.tipo === 'push-mudou') checarNotif(); });
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); promptInstalar = e; render(); });
window.addEventListener('appinstalled', () => { promptInstalar = null; toast('App instalado ✅', 'ok'); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.papel) { DB.ping(); aoMudarBanco(); checarLembretes(); checarProvas(); checarNotif(); } });

iniciar().catch(e => { console.error(e); telaErro('Algo deu errado', msgErro(e)); });
