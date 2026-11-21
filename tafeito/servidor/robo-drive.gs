/**
 * TáFeito — ROBÔ DO GOOGLE DRIVE (Google Apps Script, roda na conta do Drive do pai)
 * Copia as imagens do Work para:  TáFeito / Imagens / <ano> / <mês> / feed | story
 * Nome do arquivo mostra o status:   F3 · Henrique · ✅ Aprovada.png   (❌ Não aprovada / ⏳ Aguardando)
 * Imagem não aprovada: o motivo fica na descrição do arquivo e no "Checklist" do mês (Google Docs).
 *
 * Como instalar (uma vez só):
 *   1. script.google.com → Novo projeto → cole este código → salve com o nome "TáFeito Robô Drive"
 *   2. Escolha a função "instalar" e clique em Executar → autorize com a conta do Drive
 *   Pronto: ele roda sozinho a cada 5 minutos.
 */
const TF = {
  URL: 'https://xzqupdrzmjsorpzoqvzj.supabase.co/functions/v1/tafeito-drive',
  PASTA_IMAGENS: '17lFppdAHCEd-T6S2zW3xdnnM44NgHS_5', // TáFeito / Imagens
  FUSO: 'America/Fortaleza',
};
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const ROT = { aprovada: '✅ Aprovada', reprovada: '❌ Não aprovada', pendente: '⏳ Aguardando' };

function instalar() {
  console.log('Robô rodando na conta: ' + Session.getEffectiveUser().getEmail()); // também libera o e-mail no login do robô
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('sincronizar').timeBased().everyMinutes(5).create();
  sincronizar();
}

function api_(corpo) {
  const r = UrlFetchApp.fetch(TF.URL, {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { 'x-google-token': ScriptApp.getOAuthToken() }, payload: JSON.stringify(corpo),
  });
  if (r.getResponseCode() !== 200) throw new Error('TáFeito respondeu ' + r.getResponseCode() + ': ' + r.getContentText());
  return JSON.parse(r.getContentText());
}

function pasta_(pai, nome) {
  const it = pai.getFoldersByName(nome);
  return it.hasNext() ? it.next() : pai.createFolder(nome);
}
function anoMes_(iso) {
  const d = new Date(iso);
  return { ano: Number(Utilities.formatDate(d, TF.FUSO, 'yyyy')), mes: Number(Utilities.formatDate(d, TF.FUSO, 'M')) };
}
function pastaDoMes_(am) {
  const raiz = DriveApp.getFolderById(TF.PASTA_IMAGENS);
  return pasta_(pasta_(raiz, String(am.ano)), MESES[am.mes - 1]);
}
function nomeArquivo_(i) {
  const ext = ((i.nome || i.caminho).match(/\.(png|jpe?g|webp|gif|heic|avif)$/i) || ['.png'])[0].toLowerCase();
  const cod = (i.formato === 'feed' ? 'F' : 'S') + i.numero_formato;
  return cod + ' · ' + i.filho + ' · ' + ROT[i.status || 'pendente'] + ext;
}
function descricao_(i) {
  let t = 'TáFeito · imagem #' + i.numero + ' (' + i.formato + ') de ' + i.filho + ' · ' + ROT[i.status || 'pendente'];
  if (i.status === 'reprovada' && i.motivo) t += '\nPor que não foi aprovada: ' + i.motivo;
  return t;
}

function sincronizar() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    const r = api_({ acao: 'pendentes' });
    const feitos = [], meses = {};
    (r.novas || []).forEach(i => {
      if (!i.url) return;
      try {
        const am = anoMes_(i.criado_em);
        const destino = pasta_(pastaDoMes_(am), i.formato);
        const blob = UrlFetchApp.fetch(i.url).getBlob().setName(nomeArquivo_(i));
        const arq = destino.createFile(blob);
        arq.setDescription(descricao_(i));
        feitos.push({ id: i.id, drive_id: arq.getId(), assinatura: i.assinatura });
        meses[am.ano + '-' + am.mes] = am;
      } catch (e) { console.warn('imagem ' + i.id + ': ' + e); }
    });
    (r.mudaram || []).forEach(i => {
      try {
        const arq = DriveApp.getFileById(i.drive_id);
        arq.setName(nomeArquivo_(i)); arq.setDescription(descricao_(i));
        feitos.push({ id: i.id, drive_id: i.drive_id, assinatura: i.assinatura });
      } catch (e) { feitos.push({ id: i.id, drive_id: null, assinatura: null }); } // arquivo apagado no Drive: envia de novo
      const am = anoMes_(i.criado_em); meses[am.ano + '-' + am.mes] = am;
    });
    if (feitos.length) api_({ acao: 'feito', itens: feitos });
    Object.keys(meses).forEach(k => checklist_(meses[k]));
  } finally { lock.releaseLock(); }
}

/** Google Docs "Checklist" dentro da pasta do mês: ✅ aprovadas, ❌ não aprovadas (com o porquê) e ⏳ aguardando */
function checklist_(am) {
  const itens = api_({ acao: 'mes', ano: am.ano, mes: am.mes }).itens || [];
  const pasta = pastaDoMes_(am);
  const titulo = '✅ Checklist das imagens — ' + MESES[am.mes - 1] + ' ' + am.ano;
  const ex = pasta.getFilesByName(titulo);
  const doc = ex.hasNext() ? DocumentApp.openById(ex.next().getId()) : (() => {
    const d = DocumentApp.create(titulo); const f = DriveApp.getFileById(d.getId()); f.moveTo(pasta); return d;
  })();
  const c = doc.getBody(); c.clear();
  c.appendParagraph(titulo).setHeading(DocumentApp.ParagraphHeading.TITLE);
  const n = s => itens.filter(i => (i.status || 'pendente') === s).length;
  c.appendParagraph('✅ ' + n('aprovada') + ' aprovadas   ·   ❌ ' + n('reprovada') + ' não aprovadas   ·   ⏳ ' + n('pendente') + ' aguardando   ·   total ' + itens.length);
  c.appendParagraph('Atualizado em ' + Utilities.formatDate(new Date(), TF.FUSO, 'dd/MM/yyyy HH:mm') + ' (o app TáFeito atualiza sozinho)').setItalic(true);
  ['feed', 'story'].forEach(fmt => {
    const l = itens.filter(i => i.formato === fmt);
    if (!l.length) return;
    c.appendParagraph(fmt === 'feed' ? '📁 Feed' : '📁 Story').setHeading(DocumentApp.ParagraphHeading.HEADING1).setItalic(false);
    l.forEach(i => {
      const cod = (fmt === 'feed' ? 'F' : 'S') + i.numero_formato;
      const p = c.appendListItem(cod + ' — ' + i.filho + ' — ' + ROT[i.status || 'pendente']).setGlyphType(DocumentApp.GlyphType.BULLET).setItalic(false);
      p.setForegroundColor(i.status === 'aprovada' ? '#15803d' : i.status === 'reprovada' ? '#b91c1c' : '#92400e');
      if (i.status === 'reprovada' && i.motivo) {
        c.appendParagraph('     Por que não foi aprovada: ' + i.motivo).setForegroundColor('#374151').setItalic(true);
      }
    });
  });
  doc.saveAndClose();
}
