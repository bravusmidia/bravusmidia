/* ---------- CONTEÚDO (calendário editorial) ---------- */
const CST = [['ideia', 'Ideia'], ['gravado', 'Gravado'], ['editado', 'Editado'], ['aprovacao', 'Aprovação'], ['agendado', 'Agendado'], ['publicado', 'Publicado']];
const CHN = [['reels', 'Reels'], ['feed', 'Feed'], ['stories', 'Stories'], ['youtube', 'YouTube'], ['shorts', 'Shorts']];
V.conteudo = () => {
  const start = S.contentWeek || (() => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return iso(d); })();
  S.contentWeek = start; const end = addDays(start, 6);
  const items = S.d.content.filter(c => !c.date || (c.date >= start && c.date <= end) || c.status === 'ideia');
  return head('Conteúdo', 'Calendário editorial · prepare a semana no fim de semana', isAdmin() ? `<button class="btn pri" data-act="editContent">${ic('plus')}Conteúdo</button>` : '') + `
  <div class="datebar" style="margin-bottom:14px"><button class="btn sm ic" data-act="cWeek" data-d="${addDays(start, -7)}">${ic('left')}</button><b>${fdate(start)} – ${fdate(end)}</b><button class="btn sm ic" data-act="cWeek" data-d="${addDays(start, 7)}">${ic('right')}</button></div>
  <div class="kan">${CST.map(s => { const it = items.filter(c => c.status === s[0]).sort((a, b) => (a.date || '').localeCompare(b.date || '')); return `<div class="kcol"><h4>${s[1]}<span>${it.length}</span></h4>${it.map(c => `<div class="kit" data-act="editContent" data-id="${c.id}"><b>${esc(c.title)}</b><div class="row wrap" style="gap:4px"><span class="chip blue">${esc((CHN.find(x => x[0] === c.channel) || ['', c.channel || '—'])[1])}</span><span class="chip">${c.date ? fdate(c.date) : 'sem data'}</span></div><div class="small muted" style="margin-top:6px">${esc(cname(c.client_id))} · ${esc(firstName(c.assignee))}</div>${s[0] !== 'publicado' ? `<button class="btn sm" style="margin-top:8px;width:100%" data-act="cNext" data-id="${c.id}">${s[0] === 'aprovacao' && isAdmin() ? 'Aprovar →' : 'Avançar →'}</button>` : ''}</div>`).join('')}</div>`; }).join('')}</div>
  <p class="note" style="margin-top:10px">Nada é publicado automaticamente: tudo passa por “Aprovação” antes de ir ao ar.</p>`;
};
function contentForm(c = {}) {
  modal(c.id ? 'Editar conteúdo' : 'Novo conteúdo', `<div class="f"><input type="hidden" name="id" value="${esc(c.id || '')}">
    ${fld('Título / tema *', 'title', c.title, 'text', 'required maxlength="160"')}
    <div class="f2">${sel('Formato', 'channel', CHN, c.channel || 'reels')}${fld('Data de publicação', 'date', c.date || '', 'date')}</div>
    <div class="f2">${sel('Cliente', 'client_id', clientOpts('Bravus Mídia (próprio)'), c.client_id || '')}${sel('Responsável', 'assignee', teamOpts(), c.assignee || S.me.id)}</div>
    ${sel('Status', 'status', CST, c.status || 'ideia')}
    ${area('Roteiro / legenda / observações', 'notes', c.notes)}
  </div>`, { form: 'saveContent', footer: `${c.id ? `<button type="button" class="btn bad" data-act="delContent" data-id="${c.id}">${ic('trash')}</button>${remBtn('conteudo', c.id, c.title)}<span class="sp"></span>` : ''}<button type="button" class="btn" data-act="closeModal">Cancelar</button><button class="btn pri">Salvar</button>` });
}

