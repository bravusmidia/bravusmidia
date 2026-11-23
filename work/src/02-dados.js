/* ---------------- dados: modo local ---------------- */
class LocalStore {
  constructor() {
    this.key = 'bw_local_v1'; this.subs = []; this.load();
    try { this.bc = new BroadcastChannel('bravus-work'); this.bc.onmessage = e => { this.load(); this.emit(e.data); }; } catch {}
  }
  load() { this.db = lsGet(this.key, {}) || {}; }
  save(t) { lsSet(this.key, this.db); try { this.bc && this.bc.postMessage(t); } catch {} this.emit(t); }
  emit(t) { this.subs.forEach(f => f(t)); }
  onChange(f) { this.subs.push(f); }
  async list(t) { return (this.db[t] || []).map(r => ({ ...r })); }
  async insert(t, row) {
    const r = { id: uid(), created_at: new Date().toISOString(), ...row };
    (this.db[t] = this.db[t] || []).push(r); this.save(t); return r;
  }
  async insertUnique(t, row) {
    if ((this.db[t] || []).some(x => x.user_id === row.user_id && x.key === row.key)) return null;
    return this.insert(t, row);
  }
  async update(t, id, patch) { const r = (this.db[t] || []).find(x => x.id === id); if (r) Object.assign(r, patch); this.save(t); return r; }
  async remove(t, id) { this.db[t] = (this.db[t] || []).filter(x => x.id !== id); this.save(t); }
  async upsertSettings(data) { this.db.settings = [{ id: 'main', data }]; this.save('settings'); }
  async invoke(name) { throw new Error('Integração disponível depois de conectar o Supabase (veja Ajustes > Integrações).'); }
}

/* ---------------- dados: Supabase ---------------- */
class SupaStore {
  constructor(sb) { this.sb = sb; this.subs = []; }
  emit(t) { this.subs.forEach(f => f(t)); }
  onChange(f) { this.subs.push(f); }
  listen() {
    this.ch = this.sb.channel('bw-db').on('postgres_changes', { event: '*', schema: 'public' }, p => this.emit(p.table)).subscribe();
  }
  chk({ data, error }) { if (error) throw new Error(error.message); return data; }
  async list(t) {
    let q = this.sb.from(t).select('*');
    if (t === 'messages') q = q.order('created_at', { ascending: false }).limit(300);
    if (t === 'activity') q = q.order('created_at', { ascending: false }).limit(400);
    if (t === 'notifications') q = q.order('created_at', { ascending: false }).limit(200);
    return this.chk(await q);
  }
  async insert(t, row) { const r = this.chk(await this.sb.from(t).insert(row).select().single()); this.emit(t); return r; }
  async insertUnique(t, row) {
    // sem .select(): quem cria o aviso nem sempre pode ler o aviso de outra pessoa (regra de segurança)
    const { error } = await this.sb.from(t).upsert(row, { onConflict: 'user_id,key', ignoreDuplicates: true });
    if (error) throw new Error(error.message); this.emit(t); return null;
  }
  async update(t, id, patch) { const r = this.chk(await this.sb.from(t).update(patch).eq('id', id).select().maybeSingle()); this.emit(t); return r; }
  async remove(t, id) { this.chk(await this.sb.from(t).delete().eq('id', id)); this.emit(t); }
  async upsertSettings(data) { this.chk(await this.sb.from('settings').upsert({ id: 'main', data })); this.emit('settings'); }
  async invoke(name, body) {
    const { data, error } = await this.sb.functions.invoke(name, { body });
    if (error) {
      let msg = error.message || 'Falha na integração';
      try { const j = await error.context.json(); if (j && j.error) msg = j.error; } catch {}
      throw new Error(msg);
    }
    return data;
  }
}

