'use strict';
/* =====================================================================
   MISSÃO OK — tarefas da família com fotos, missões e prêmios
   Desenvolvido por Andrade
   ===================================================================== */
const VERSAO = '1.1.0';
const LIXEIRAS = ['Lixeira da cozinha', 'Lixeira do banheiro', 'Lixeira do quarto'];
const TABELAS = ['config', 'filhos', 'tarefas', 'registros', 'pedidos', 'missoes', 'resgates', 'pagamentos', 'mensagens', 'perfis'];
const AREAS = { tarefas: 'Tarefas e horários', missoes: 'Missões', premios: 'Prêmios e tempo de tela', perfil: 'Meu perfil (nome)', outro: 'Outro assunto' };
const CATS = { casa: { nome: 'Casa', icone: '🏠' }, estudo: { nome: 'Estudo', icone: '📚' }, trabalho: { nome: 'Work', icone: '💼' } };
const PATENTES = ['Recruta', 'Soldado', 'Cabo', '3º Sargento', '2º Sargento', '1º Sargento', 'Suboficial', 'Aspirante', 'Tenente', 'Capitão', 'Major', 'Tenente-Coronel', 'Coronel', 'Brigadeiro'];
const DSEM = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const RRDIA = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const TIPOS_MISSAO = { total: 'Concluir X tarefas', categoria: 'Concluir X tarefas de uma categoria', sequencia: 'X dias seguidos com tudo feito', dias: 'X dias (não precisa ser seguido) com tudo feito' };
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
const msgErro = e => { const m = (e && (e.message || e.error_description || e.msg)) || String(e); if (/Failed to fetch|NetworkError/i.test(m)) return 'Sem internet. Tente de novo.'; if (/Invalid login/i.test(m)) return 'Senha/PIN incorreto.'; if (/Email not confirmed/i.test(m)) return 'E-mail não confirmado: no Supabase, desligue "Confirm email" (veja o guia).'; return m; };

/* ---------------- estado ---------------- */
const S = {
  modo: null, papel: null, eu: null, filhoSel: null, tela: null, diaVer: hojeISO(),
  dados: Object.fromEntries(TABELAS.map(t => [t, []])), config: {}, online: new Set(),
  vistos: { ok: false }, abaPedidos: 'novo'
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
    horario, foto: true, obrigatoria: categoria !== 'trabalho', xp: 10, valor: 0, ativa: true, criado_em: criado, ...extra
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
    T('📖', 'Estudar 1 hora', 'estudo', '15:00', { dias: [1, 2, 3, 4, 5], descricao: 'Foto do caderno antes e depois do estudo.', xp: 15 }),
    T('✏️', 'Dever de casa', 'estudo', '16:00', { dias: [1, 2, 3, 4, 5], descricao: 'Foto do dever antes e depois de feito.', xp: 15 }),
    T('🖼️', 'Tarefas de imagem', 'trabalho', '', { recorrencia: 'unica', data_unica: hojeISO(), valor: 10, xp: 20, descricao: 'O pai explica no chat o que fazer.' }),
    T('📲', 'Deixar de seguir perfis no Instagram', 'trabalho', '', { recorrencia: 'unica', data_unica: hojeISO(), valor: 5, xp: 20, descricao: 'Manual, um por um, da lista que o pai passar.' })
  ];
  const M = (icone, titulo, tipo, meta, extra = {}) => ({ id: uid(), filho_id: filhoId, icone, titulo, descricao: '', tipo, meta, categoria: '', premio: '', valor: 0, xp: 50, ativa: true, criado_em: criado, ...extra });
  const missoes = [
    M('🔥', 'Semana de ouro', 'sequencia', 7, { descricao: '7 dias seguidos com todas as tarefas feitas.', premio: '+2h de jogo no fim de semana', valor: 10, xp: 100 }),
    M('🧹', 'Faxineiro de elite', 'categoria', 30, { categoria: 'casa', descricao: '30 tarefas de casa concluídas.', premio: 'Escolher o lanche do sábado', valor: 20, xp: 100 }),
    M('🧠', 'Cérebro afiado', 'categoria', 10, { categoria: 'estudo', descricao: '10 tarefas de estudo concluídas.', premio: 'Escolher o filme da família', xp: 80 }),
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
  const obr = tarefasDoDia(dia, null, soDiarias, filhoId).filter(t => t.obrigatoria);
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
  const ganho = concluidos(filhoId).reduce((s, r) => s + num(r.valor), 0) + deFilho('resgates', filhoId).reduce((s, r) => s + num(r.valor), 0);
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
  const pessoas = [`<button class="pessoa" data-act="loginPai"><div class="av" style="background:linear-gradient(135deg,#4f7cff,#7b5cff)">👨</div><div><b>Pai</b><span class="mut peq">Administrador</span></div></button>`]
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
    S.papel = perfil.papel; S.eu = perfil.papel === 'pai' ? 'pai' : perfil.filho_id;
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
  DB.ping(); setInterval(() => DB.ping(), 60000);
  setInterval(checarLembretes, 30000); setTimeout(checarLembretes, 2500);
  setInterval(() => { if (S.diaVer !== hojeISO() && S.tela !== 'painel') S.diaVer = hojeISO(); render(); }, 60000);
  render();
  verificarPedidosPai();
  inscreverPush(false);
}

async function carregarTudo() {
  const res = await Promise.all(TABELAS.map(t => DB.listar(t).catch(e => { console.warn(t, e); return null; })));
  TABELAS.forEach((t, i) => { if (res[i]) S.dados[t] = res[i]; });
  S.config = S.dados.config.find(c => c.id == 1) || {};
}

let timerRecarga = null;
function aoMudarBanco() {
  clearTimeout(timerRecarga);
  timerRecarga = setTimeout(async () => { await carregarTudo(); detectarNovidades(); render(); verificarPedidosPai(); }, 300);
}

/* notificações a partir das mudanças (chat, pedidos, tarefas novas, aprovações) */
function detectarNovidades() {
  const V = S.vistos, D = S.dados, primeira = !V.ok;
  V.msgs = V.msgs || new Set(); V.tars = V.tars || new Set(); V.ped = V.ped || {}; V.reg = V.reg || {};
  const avisar = (t, c, tag) => { if (!primeira) notificar(t, c, tag); };
  for (const m of D.mensagens) {
    if (V.msgs.has(m.id)) continue; V.msgs.add(m.id);
    const deOutro = m.autor !== (S.papel === 'pai' ? 'pai' : S.eu);
    if (deOutro && !(S.tela === 'chat' && m.filho_id === fid())) avisar(`💬 ${m.autor === 'pai' ? 'Pai' : nomeFilho(m.autor)}`, m.texto, 'msg');
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
    ? { painel: telaPainel, tarefas: telaTarefasPai, work: telaWorkPai, missoes: telaMissoes, chat: telaChat, mais: telaMaisPai }
    : { hoje: telaHoje, work: telaWorkFilho, missoes: telaMissoes, premios: telaPremios, chat: telaChat, mais: telaMaisFilho };
  const fn = telas[S.tela] || Object.values(telas)[0];
  $('#app').innerHTML = topo() + (S.papel === 'pai' ? barraFilhos() : '') + `<main>${fn()}</main>` + nav();

  if (foco) { const el = document.getElementById(foco.id); if (el) { el.value = foco.v; el.focus(); try { el.setSelectionRange(foco.s, foco.s); } catch { } } }
  const m2 = $('#msgs'); if (m2) m2.scrollTop = rolagem > 80 ? m2.scrollHeight - m2.clientHeight - rolagem : m2.scrollHeight;
  if (S.tela === 'chat') marcarLidas();
}

function topo() {
  let pres = '';
  if (S.modo === 'local') pres = `<span class="presenca"><span class="tag warn" style="margin:0">demo</span></span>`;
  else if (S.papel === 'filho') {
    const pai = S.dados.perfis.find(p => p.papel === 'pai');
    const on = S.online.has('pai');
    pres = `<span class="presenca"><span class="dot ${on ? 'on' : ''}"></span>Pai ${on ? 'online' : (pai && pai.visto_em ? 'visto ' + hora(pai.visto_em) : 'offline')}</span>`;
  }
  const sub = S.papel === 'pai' ? 'Painel do Pai' : `Olá, ${esc(filhoAtual().nome)}!`;
  return `<header class="topo"><div class="marca">${logoImg()}<div>TáFeito<small>${sub}</small></div></div><div class="esp"></div>
    ${promptInstalar ? `<button class="icone-btn" data-act="instalar" title="Instalar">⬇️</button>` : ''}${pres}</header>`;
}

function barraFilhos() {
  return `<div class="filhos-bar">${S.dados.filhos.map(f => {
    const on = S.online.has(f.id); const nl = naoLidas(f.id); const pp = S.dados.pedidos.filter(p => p.filho_id === f.id && p.status === 'pendente').length;
    return `<button class="chip ${f.id === S.filhoSel ? 'on' : ''}" data-act="selFilho" data-id="${esc(f.id)}">
      ${S.modo === 'online' ? `<span class="dot ${on ? 'on' : ''}"></span>` : ''}${esc(f.nome)}${nl + pp ? `<span class="badge">${nl + pp}</span>` : ''}</button>`;
  }).join('')}</div>`;
}

function nav() {
  const itens = S.papel === 'pai'
    ? [['painel', '📊', 'Painel'], ['tarefas', '✅', 'Tarefas'], ['work', '💼', 'Work'], ['missoes', '🎯', 'Missões'], ['chat', '💬', 'Chat'], ['mais', '☰', 'Mais']]
    : [['hoje', '✅', 'Tarefas'], ['work', '💼', 'Work'], ['missoes', '🎯', 'Missões'], ['premios', '🏆', 'Prêmios'], ['chat', '💬', 'Chat'], ['mais', '☰', 'Mais']];
  const badge = id => {
    let n = 0;
    if (id === 'chat') n = S.papel === 'pai' ? naoLidas() : naoLidas(S.eu);
    if (id === 'mais' && S.papel === 'pai') n = pedidosPendentes().length;
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
    <h2>${st.liberado ? 'LIBERADO! Missão cumprida' : 'Computador e celular BLOQUEADOS'}</h2>
    <p style="margin:0;opacity:.85">${st.liberado ? 'Todas as tarefas feitas. Pode usar:' : `Faltam ${st.total - st.feitas} de ${st.total} tarefas para liberar`}</p>
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
  if (t.horario) partes.push(`⏰ ${t.horario}`);
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
  const dia = hojeISO(); const tars = tarefasDoDia(dia, ['casa', 'estudo']);
  const st = statusDia(dia);
  const casa = tars.filter(t => t.categoria === 'casa'), est = tars.filter(t => t.categoria === 'estudo');
  const pct = st.total ? Math.round(st.feitas / st.total * 100) : 0;
  return `${avisoNotificacao()}${bannerPermissoes()}
    <div class="card"><div class="linha"><div class="esp"><b>Missões de hoje</b><br><span class="mut peq">${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</span></div><b style="font-size:1.4rem">${st.feitas}/${st.total}</b></div>
    <div class="barra" style="margin-top:10px"><i style="width:${pct}%"></i></div></div>
    ${!tars.length ? `<div class="vazio"><span class="e">🎉</span>Nenhuma tarefa de casa ou estudo hoje.</div>` : ''}
    ${casa.length ? `<div class="secao">🏠 Casa</div>${casa.map(t => cardTarefaFilho(t, dia)).join('')}` : ''}
    ${est.length ? `<div class="secao">📚 Estudo</div>${est.map(t => cardTarefaFilho(t, dia)).join('')}` : ''}
    ${pode('tarefas') ? `<button class="btn ghost" data-act="novaTarefa" data-cat="casa">＋ Nova tarefa</button>` : `<button class="btn ghost sm" style="width:100%" data-act="pedir" data-area="tarefas">✋ Pedir permissão para ajustar tarefas</button>`}
    <div class="secao">🏆 Prêmio do dia</div>${cardPremio(dia)}
    <p class="rodape">Desenvolvido por Andrade</p>`;
}

function telaWorkFilho() {
  const dia = hojeISO(); const tars = tarefasDoDia(dia, ['trabalho']); const c = carteira();
  const hist = concluidos().filter(r => num(r.valor) > 0).sort((a, b) => (b.feito_em || '').localeCompare(a.feito_em || '')).slice(0, 15);
  return `<div class="card destaque"><div class="linha"><div class="esp"><span class="mut peq">Seu saldo a receber</span><h1 style="margin:2px 0">${brl(c.saldo)}</h1><span class="mut peq">Ganho total ${brl(c.ganho)} · já recebido ${brl(c.pago)}</span></div><span style="font-size:2.4rem">💰</span></div></div>
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
  return `${bannerPermissoes()}
    <div class="card"><h3>✋ Pedir permissão ao pai</h3><p class="mut peq">Para mudar algo no app você precisa da autorização do pai.</p>
    <button class="btn pri" data-act="pedir">Fazer um pedido</button></div>
    ${meus.length ? `<div class="card"><h3>Meus pedidos</h3>${meus.map(p => `<div class="lista-item"><div class="tt">${esc(AREAS[p.area] || p.area)}<small>${esc(p.mensagem || '')} · ${dataHoraBR(p.criado_em)}</small></div>${tagPedido(p)}</div>`).join('')}</div>` : ''}
    ${pode('perfil') ? `<div class="card"><h3>Meu perfil</h3><button class="btn ghost" data-act="editarPerfil">✏️ Mudar meu nome</button></div>` : ''}
    <div class="card"><h3>⚙️ Aparelho</h3>
      <button class="btn ghost" data-act="ativarNotif">🔔 Ativar / testar notificações</button><div style="height:8px"></div>
      <button class="btn ghost" data-act="agenda">📅 Pôr lembretes na agenda / despertador</button><div style="height:8px"></div>
      <button class="btn ghost" data-act="instalar">⬇️ Instalar o app</button><div style="height:8px"></div>
      <button class="btn bad" data-act="sair">Sair</button></div>
    <p class="rodape">TáFeito v${VERSAO} · Desenvolvido por Andrade</p>`;
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
  return `${avisoNotificacao()}
    ${pend.map(p => `<div class="aviso warn linha"><div class="esp">🔐 <b>${esc(f.nome)}</b> pediu para ajustar <b>${esc(AREAS[p.area] || p.area)}</b>${p.mensagem ? `: "${esc(p.mensagem)}"` : ''}</div><button class="btn sm pri" data-act="abrirPedido" data-id="${esc(p.id)}">Ver</button></div>`).join('')}
    <div class="card"><div class="linha">${S.modo === 'online' ? `<span class="dot ${on ? 'on' : ''}"></span>` : ''}<div class="esp"><b>${esc(f.nome)}</b> <span class="mut peq">${S.modo === 'online' ? (on ? 'online agora' : (perfil && perfil.visto_em ? 'visto ' + dataHoraBR(perfil.visto_em) : (perfil ? 'offline' : 'acesso ainda não criado'))) : ''}</span></div>
      <input type="date" class="inp" style="width:auto;padding:7px 9px" value="${dia}" data-change="diaVer"></div></div>
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
  return `<div class="linha" style="margin-bottom:6px"><div class="esp"><h2 style="margin:0">Tarefas de ${esc(filhoAtual().nome)}</h2><span class="mut peq">Casa e estudo</span></div>
    <button class="btn pri sm" data-act="novaTarefa" data-cat="casa">＋ Nova</button></div>
    ${listaGerenciar(['casa', 'estudo'])}`;
}

function telaWorkPai() {
  const c = carteira(); const pags = deFilho('pagamentos').sort((a, b) => (b.criado_em || '').localeCompare(a.criado_em || ''));
  return `<div class="card destaque"><span class="mut peq">${esc(filhoAtual().nome)} tem a receber</span><h1 style="margin:2px 0">${brl(c.saldo)}</h1>
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
  return `<div class="card"><h3>👨‍👦 Filhos e acessos</h3>${S.dados.filhos.map(f => {
      const tem = S.dados.perfis.some(p => p.filho_id === f.id);
      return `<div class="lista-item"><div class="chip" style="padding:6px 10px;background:${corFilho(f.id)}">${esc(f.nome[0])}</div><div class="tt"><b>${esc(f.nome)}</b><small>💻 ${horasTxt(f.horas_pc)} · 📱 ${horasTxt(f.horas_cel)}${S.modo === 'online' ? (tem ? ' · acesso criado' : ' · sem acesso') : ''}</small></div>
      <button class="icone-btn" data-act="editarFilho" data-id="${esc(f.id)}">⚙️</button></div>`;
    }).join('')}
    <button class="btn ghost" style="margin-top:8px" data-act="novoFilho">＋ Adicionar filho</button></div>
    ${S.modo === 'online' ? `<div class="card"><h3>📲 Mandar o app pelo WhatsApp</h3><p class="mut peq">Gera o link de instalação já conectado. Seu filho abre, instala e entra com o PIN dele.</p><button class="btn zap" data-act="compartilhar">Enviar link pelo WhatsApp</button></div>` : `<div class="card"><h3>🧪 Modo demonstração</h3><p class="mut peq">Os dados ficam só neste aparelho. Para usar em celulares diferentes, conecte ao Supabase (veja o guia).</p><button class="btn pri" data-act="sairDemo">Conectar ao Supabase</button></div>`}
    <div class="card"><h3>🔐 Pedidos de permissão</h3>${peds.length ? peds.map(p => `<div class="lista-item"><div class="tt"><b>${esc(nomeFilho(p.filho_id))}</b> · ${esc(AREAS[p.area] || p.area)}<small>${esc(p.mensagem || '')} · ${dataHoraBR(p.criado_em)}</small></div>${p.status === 'pendente' ? `<button class="btn pri sm" data-act="abrirPedido" data-id="${esc(p.id)}">Responder</button>` : tagPedido(p)}</div>`).join('') : '<p class="mut peq">Nenhum pedido ainda.</p>'}</div>
    <div class="card"><h3>⚙️ Aparelho</h3>
      <button class="btn ghost" data-act="ativarNotif">🔔 Ativar / testar notificações</button><div style="height:8px"></div>
      <button class="btn ghost" data-act="agenda">📅 Lembretes na agenda (tarefas de ${esc(filhoAtual().nome)})</button><div style="height:8px"></div>
      <button class="btn ghost" data-act="instalar">⬇️ Instalar o app</button><div style="height:8px"></div>
      <button class="btn ghost" data-act="ajudaBloqueio">🔒 Como bloquear o PC/celular de verdade</button><div style="height:8px"></div>
      <button class="btn bad" data-act="sair">Sair</button></div>
    <p class="rodape">TáFeito v${VERSAO} · Desenvolvido por Andrade</p>`;
}

/* ===================================================================
   MODAIS
   =================================================================== */
function modal(html, cls = '') {
  const el = document.createElement('div'); el.className = 'modal-bg';
  el.innerHTML = `<div class="modal ${cls}">${html}</div>`;
  el.addEventListener('click', e => { if (e.target === el && !cls.includes('alerta')) el.remove(); });
  $('#modais').appendChild(el); return el;
}
const fecharModais = () => { $('#modais').innerHTML = ''; };
const fecharTopo = () => { const l = $('#modais').lastElementChild; if (l) l.remove(); };
function toast(txt, tipo = '') {
  const el = document.createElement('div'); el.className = 'toast ' + tipo; el.textContent = txt;
  $('#toasts').appendChild(el); setTimeout(() => el.remove(), 3200);
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
  t = t || { categoria: cat || 'casa', recorrencia: cat === 'trabalho' ? 'unica' : 'diaria', dias: [], data_unica: hojeISO(), horario: '', foto: true, obrigatoria: cat !== 'trabalho', xp: cat === 'trabalho' ? 20 : 10, valor: 0, ativa: true, icone: '', titulo: '', descricao: '' };
  modal(`<button class="icone-btn fechar" data-act="fechar">✕</button><h2>${novo ? 'Nova tarefa' : 'Editar tarefa'}</h2>
  <form data-form="tarefa" data-id="${esc(t.id || '')}">
    <div class="grid2" style="grid-template-columns:70px 1fr"><label class="campo"><span>Ícone</span><input name="icone" value="${esc(t.icone)}" placeholder="🧹" maxlength="4" style="text-align:center"></label>
    <label class="campo"><span>Título</span><input name="titulo" value="${esc(t.titulo)}" required placeholder="Ex.: Arrumar o quarto"></label></div>
    <label class="campo"><span>Categoria</span><select name="categoria">${Object.entries(CATS).map(([k, v]) => `<option value="${k}" ${t.categoria === k ? 'selected' : ''}>${v.icone} ${v.nome}</option>`).join('')}</select></label>
    <label class="campo"><span>Explicação (o que precisa ficar feito)</span><textarea name="descricao">${esc(t.descricao)}</textarea></label>
    <label class="campo"><span>Itens para marcar um por um (um por linha, opcional)</span><textarea name="itens" rows="3" placeholder="Ex.: Lixeira da cozinha&#10;Lixeira do banheiro&#10;Lixeira do quarto" ${souPai ? '' : 'readonly'}>${esc(itensDe(t).join('\n'))}</textarea></label>
    <label class="campo"><span>Repetição</span><select name="recorrencia" data-change="recorrencia"><option value="diaria" ${t.recorrencia === 'diaria' ? 'selected' : ''}>Repete (dias da semana)</option><option value="unica" ${t.recorrencia === 'unica' ? 'selected' : ''}>Uma vez só (fica até ser feita)</option></select></label>
    <div id="boxDias" ${t.recorrencia === 'unica' ? 'hidden' : ''}><span class="mut peq">Dias (nenhum marcado = todo dia)</span><div class="dias" style="margin:6px 0 12px">${DSEM.map((d, i) => `<label><input type="checkbox" name="dia" value="${i}" ${(t.dias || []).includes(i) ? 'checked' : ''}><span>${d}</span></label>`).join('')}</div></div>
    <label class="campo" id="boxData" ${t.recorrencia === 'unica' ? '' : 'hidden'}><span>A partir de</span><input type="date" name="data_unica" value="${esc(t.data_unica || hojeISO())}"></label>
    <div class="grid2"><label class="campo"><span>Horário do lembrete</span><input type="time" name="horario" value="${esc(t.horario)}"></label>
    <label class="campo"><span>XP (pontos)</span><input type="number" name="xp" min="0" max="1000" value="${num(t.xp)}"></label></div>
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
    <div class="grid2" style="grid-template-columns:70px 1fr"><label class="campo"><span>Ícone</span><input name="icone" value="${esc(m.icone)}" maxlength="4" style="text-align:center"></label>
    <label class="campo"><span>Nome da missão</span><input name="titulo" value="${esc(m.titulo)}" required></label></div>
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
    <label class="campo"><span>Prêmio extra do dia (opcional)</span><input name="premio_extra" value="${esc(f.premio_extra)}" placeholder="Ex.: sobremesa liberada"></label>
    <label class="check"><input type="checkbox" name="exigir_aprovacao" ${f.exigir_aprovacao ? 'checked' : ''}> Só liberar depois que eu aprovar as fotos</label>
    <button class="btn pri" style="margin-top:6px">Salvar</button>
  </form>
  ${!novo && S.modo === 'online' ? `<div class="card" style="margin-top:14px"><h3>🔑 Acesso de ${esc(f.nome)}</h3>
    <p class="mut peq">${tem ? 'Acesso criado. Você pode trocar o PIN.' : 'Crie um PIN de 6 números para ele entrar no app.'}</p>
    <form data-form="${tem ? 'trocarPin' : 'criarAcesso'}" data-id="${esc(f.id)}"><input name="pin" class="inp pin" inputmode="numeric" pattern="[0-9]{6,}" minlength="6" maxlength="12" placeholder="••••••" required>
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
  selFilho: d => { S.filhoSel = d.id; lsSet('mok_filho_sel', d.id); render(); },
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
  foto: d => { fotoAlvo = { tarefa: d.id, tipo: d.tipo }; const i = $('#inputFoto'); i.value = ''; i.click(); },
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
      horario: f.horario.value, xp: num(f.xp.value)
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
    const x = { ...(ant || { id: novoId, ordem: S.dados.filhos.length + 1, criado_em: agoraISO() }), nome: f.nome.value.trim(), horas_pc: num(f.horas_pc.value), horas_cel: num(f.horas_cel.value), premio_extra: f.premio_extra.value.trim(), exigir_aprovacao: f.exigir_aprovacao.checked };
    try { const s = await DB.salvar('filhos', x); const i = S.dados.filhos.findIndex(y => y.id === x.id); if (i >= 0) S.dados.filhos[i] = s || x; else S.dados.filhos.push(s || x); if (!S.filhoSel) S.filhoSel = x.id; fecharModais(); render(); toast('Salvo ✅', 'ok'); }
    catch (e) { toast(msgErro(e), 'bad'); }
  },
  perfil: async f => {
    const x = { ...filhoAtual(), nome: f.nome.value.trim() };
    try { await DB.salvar('filhos', x); Object.assign(filhoAtual(), x); fecharModais(); render(); } catch (e) { toast(msgErro(e), 'bad'); }
  },
  criarAcesso: async f => {
    const filho = f.dataset.id; const pin = f.pin.value.trim();
    if (!/^\d{6,12}$/.test(pin)) return toast('Use de 6 a 12 números.', 'bad');
    carregando(true, 'Criando acesso…');
    try {
      await DB.rpc('mok_criar_acesso_filho', { p_filho: filho, p_pin: pin });
      await carregarTudo(); carregando(false); fecharModais(); render();
      modal(`<div class="grande">🔑</div><h2>Acesso criado!</h2><p>${esc(nomeFilho(filho))} entra tocando no nome dele e digitando o PIN <b>${esc(pin)}</b>.</p><button class="btn zap" data-act="compartilhar">Mandar o link pelo WhatsApp</button><div style="height:8px"></div><button class="btn ghost" data-act="fechar">Fechar</button>`, 'alerta');
    } catch (e) { carregando(false); toast(msgErro(e), 'bad'); }
  },
  trocarPin: async f => {
    const pin = f.pin.value.trim(); if (!/^\d{6,}$/.test(pin)) return toast('Use pelo menos 6 números.', 'bad');
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
  pagar: async f => {
    const p = { id: uid(), filho_id: fid(), valor: num(f.valor.value), obs: f.obs.value.trim(), criado_em: agoraISO() };
    try { await DB.inserir('pagamentos', p); S.dados.pagamentos.push(p); fecharModais(); render(); toast('Pagamento registrado 💸', 'ok'); enviarMsgAuto(`💸 Te paguei ${brl(p.valor)}${p.obs ? ' (' + p.obs + ')' : ''}.`, p.filho_id); } catch (e) { toast(msgErro(e), 'bad'); }
  },
  chat: f => { const i = f.querySelector('input'); const t = i.value.trim(); if (!t) return; i.value = ''; enviarMsg(t); }
};

const mudancas = {
  diaVer: el => { S.diaVer = el.value || hojeISO(); render(); },
  recorrencia: el => { const u = el.value === 'unica'; $('#boxDias').hidden = u; $('#boxData').hidden = !u; }
};

document.addEventListener('click', e => {
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
$('#inputFoto').addEventListener('change', async e => {
  const arq = e.target.files && e.target.files[0]; if (!arq || !fotoAlvo) return;
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
});

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
  if (lsGet('mok_push_ok') && ['msg', 'ped', 'reg', 'tar'].includes(tag)) return; // o push do servidor já mostra
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
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); promptInstalar = e; render(); });
window.addEventListener('appinstalled', () => { promptInstalar = null; toast('App instalado ✅', 'ok'); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.papel) { aoMudarBanco(); checarLembretes(); } });

iniciar().catch(e => { console.error(e); telaErro('Algo deu errado', msgErro(e)); });
