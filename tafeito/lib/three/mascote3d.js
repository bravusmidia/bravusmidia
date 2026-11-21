// TáFeito — Mascote 3D (personagem original), feito com Three.js (grátis, MIT).
// Cada <canvas class="masc3d" data-m='{...}'> vira um boneco 3D animado. Um único motor 3D desenha todos.
import * as THREE from './three.module.min.js';

const PADRAO = { pele: '#e3a77a', cabelo: 'espetado', corCabelo: '#1e140e', olhos: '#4a2e1d', sobrancelha: 'confiante', roupa: 'jaqueta', corRoupa: '#2f6df0', corDetalhe: '#fbbf24', estampa: 'raio', calca: '#1e293b', tenis: '#ffffff', chapeu: 'nenhum', oculos: 'nenhum', extra: 'nenhum', boca: 'sorriso', movimento: 'acenar' };

let renderer = null;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
} catch (e) { renderer = null; }

const alvos = new Map(); // canvas -> { chave, cena, cam, boneco, t0 }

const mat = (cor, extra = {}) => new THREE.MeshStandardMaterial({ color: new THREE.Color(cor), roughness: 0.55, metalness: 0.02, ...extra });
const contorno = new THREE.MeshBasicMaterial({ color: 0x0b0f1a, side: THREE.BackSide });
function malha(geo, m, { pos, rot, esc, borda = 0.035 } = {}) {
  const g = new THREE.Group();
  const me = new THREE.Mesh(geo, m); me.castShadow = true; g.add(me);
  if (borda) { const o = new THREE.Mesh(geo, contorno); o.scale.setScalar(1 + borda); g.add(o); }
  if (pos) g.position.set(...pos); if (rot) g.rotation.set(...rot); if (esc) g.scale.set(...esc);
  return g;
}
const esfera = (r, ws = 32, hs = 24) => new THREE.SphereGeometry(r, ws, hs);
const capsula = (r, l) => new THREE.CapsuleGeometry(r, l, 10, 20);
const escurecer = (c, f) => { const k = new THREE.Color(c); k.multiplyScalar(f); return k; };

function texturaEstampa(tipo, cor) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.fillStyle = cor; g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 8; g.lineJoin = 'round';
  if (tipo === 'raio') { g.beginPath(); g.moveTo(150, 20); g.lineTo(70, 140); g.lineTo(125, 140); g.lineTo(95, 236); g.lineTo(190, 100); g.lineTo(135, 100); g.lineTo(175, 20); g.closePath(); g.fill(); g.stroke(); }
  else if (tipo === 'estrela') { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 48 : 110; g.lineTo(128 + Math.cos(a) * r, 128 + Math.sin(a) * r); } g.closePath(); g.fill(); g.stroke(); }
  else if (tipo === 'numero') { g.font = '900 150px Arial Black, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.strokeText('10', 128, 136); g.fillText('10', 128, 136); }
  else if (tipo === 'listras') { for (let y = 40; y < 230; y += 56) g.fillRect(0, y, 256, 26); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function construir(m) {
  m = { ...PADRAO, ...m };
  const raiz = new THREE.Group(); const P = {};
  const mPele = mat(m.pele, { roughness: 0.6 }), mCab = mat(m.corCabelo, { roughness: 0.45 }), mRoupa = mat(m.corRoupa), mDet = mat(m.corDetalhe, { roughness: 0.4 });
  const mCalca = mat(m.calca), mTenis = mat(m.tenis, { roughness: 0.35 }), mSola = mat('#f3f4f6'), mPreto = mat('#111318', { roughness: 0.3 }), mBranco = mat('#ffffff', { roughness: 0.2 });
  const corpo = new THREE.Group(); raiz.add(corpo); P.corpo = corpo;

  // pernas e tênis
  for (const s of [-1, 1]) {
    corpo.add(malha(capsula(0.15, 0.42), mCalca, { pos: [0.19 * s, 0.5, 0] }));
    corpo.add(malha(esfera(0.2), mTenis, { pos: [0.2 * s, 0.13, 0.06], esc: [0.95, 0.62, 1.35] }));
    corpo.add(malha(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 24), mSola, { pos: [0.2 * s, 0.04, 0.07], esc: [1, 1, 1.4], borda: 0.02 }));
  }
  // tronco
  const pernaRoupa = m.roupa === 'regata' ? mRoupa : mRoupa;
  corpo.add(malha(capsula(0.43, 0.42), pernaRoupa, { pos: [0, 1.08, 0], esc: [1, 1, 0.82] }));
  if (m.roupa === 'jaqueta') {
    corpo.add(malha(new THREE.BoxGeometry(0.05, 0.7, 0.05), mDet, { pos: [0, 1.06, 0.36], borda: 0 }));
    for (const s of [-1, 1]) corpo.add(malha(new THREE.BoxGeometry(0.1, 0.32, 0.06), mat(escurecer(m.corRoupa, 0.7)), { pos: [0.13 * s, 1.36, 0.33], rot: [0, 0, 0.5 * s], borda: 0 }));
  } else if (m.roupa === 'moletom') {
    corpo.add(malha(new THREE.TorusGeometry(0.3, 0.09, 12, 24), mat(escurecer(m.corRoupa, 0.75)), { pos: [0, 1.48, -0.12], rot: [1.3, 0, 0] }));
    corpo.add(malha(new THREE.BoxGeometry(0.46, 0.18, 0.06), mat(escurecer(m.corRoupa, 0.8)), { pos: [0, 0.86, 0.34], borda: 0.02 }));
  } else if (m.roupa === 'colete') {
    corpo.add(malha(capsula(0.445, 0.36), mat(escurecer(m.corRoupa, 0.55)), { pos: [0, 1.06, 0], esc: [1, 1, 0.8] }));
    corpo.add(malha(new THREE.BoxGeometry(0.2, 0.55, 0.08), mDet, { pos: [0, 1.12, 0.33], borda: 0 }));
  } else if (m.roupa === 'uniforme') {
    corpo.add(malha(new THREE.CylinderGeometry(0.445, 0.445, 0.09, 32), mDet, { pos: [0, 0.86, 0], esc: [1, 1, 0.84], borda: 0 }));
  } else {
    corpo.add(malha(new THREE.TorusGeometry(0.2, 0.04, 10, 24), mat(escurecer(m.corRoupa, 0.7)), { pos: [0, 1.5, 0.05], rot: [1.45, 0, 0], borda: 0 }));
  }
  if (m.estampa && m.estampa !== 'nenhuma') {
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), new THREE.MeshStandardMaterial({ map: texturaEstampa(m.estampa, m.corDetalhe), transparent: true, roughness: 0.5 }));
    pl.position.set(0, 1.08, 0.362); corpo.add(pl);
  }
  // pescoço
  corpo.add(malha(new THREE.CylinderGeometry(0.14, 0.16, 0.18, 20), mPele, { pos: [0, 1.56, 0], borda: 0 }));

  // braços (pivô no ombro)
  const braco = s => {
    const g = new THREE.Group(); g.position.set(0.5 * s, 1.36, 0);
    const manga = m.roupa === 'regata' ? mPele : mRoupa;
    g.add(malha(capsula(0.13, 0.34), manga, { pos: [0, -0.26, 0] }));
    const mao = new THREE.Group(); mao.position.set(0, -0.56, 0); g.add(mao);
    mao.add(malha(esfera(0.14), mPele, { esc: [1, 1.05, 0.9] }));
    const dedao = malha(capsula(0.045, 0.09), mPele, { pos: [0, 0.12, 0.04], borda: 0.05 }); dedao.visible = false; mao.add(dedao);
    if (m.extra === 'relogio' && s < 0) g.add(malha(new THREE.TorusGeometry(0.13, 0.035, 10, 24), mPreto, { pos: [0, -0.45, 0], rot: [Math.PI / 2, 0, 0], borda: 0 }));
    corpo.add(g); return { g, dedao };
  };
  const bd = braco(1), be = braco(-1); P.bracoD = bd.g; P.bracoE = be.g; P.dedao = bd.dedao;

  // costas
  if (m.extra === 'mochila') {
    corpo.add(malha(new THREE.BoxGeometry(0.62, 0.66, 0.3), mDet, { pos: [0, 1.08, -0.42] }));
    for (const s of [-1, 1]) corpo.add(malha(new THREE.BoxGeometry(0.07, 0.6, 0.06), mat(escurecer(m.corDetalhe, 0.6)), { pos: [0.24 * s, 1.12, 0.33], borda: 0 }));
  }
  if (m.extra === 'capa') {
    const capa = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.78, 1.25, 32, 1, true, Math.PI * 0.62, Math.PI * 0.76), mat('#dc2626', { side: THREE.DoubleSide }));
    capa.position.set(0, 0.92, -0.06); corpo.add(capa); P.capa = capa;
  }
  if (m.extra === 'medalha') {
    corpo.add(malha(new THREE.TorusGeometry(0.22, 0.025, 8, 24, Math.PI), mat('#ef4444'), { pos: [0, 1.36, 0.3], rot: [0, 0, Math.PI], borda: 0 }));
    corpo.add(malha(new THREE.CylinderGeometry(0.1, 0.1, 0.04, 24), mat('#fbbf24', { metalness: 0.6, roughness: 0.25 }), { pos: [0, 1.12, 0.37], rot: [Math.PI / 2, 0, 0] }));
  }
  if (m.extra === 'skate') {
    raiz.add(malha(new THREE.BoxGeometry(1.1, 0.06, 0.34), mDet, { pos: [0, -0.04, 0.05] }));
    for (const x of [-0.38, 0.38]) raiz.add(malha(new THREE.CylinderGeometry(0.06, 0.06, 0.4, 16), mPreto, { pos: [x, -0.12, 0.05], rot: [Math.PI / 2, 0, 0], borda: 0 }));
  }

  // cabeça
  const cab = new THREE.Group(); cab.position.set(0, 2.12, 0); cab.scale.setScalar(1.18); corpo.add(cab); P.cabeca = cab;
  cab.add(malha(esfera(0.62, 48, 36), mPele, { esc: [1, 0.96, 0.94] }));
  cab.add(malha(esfera(0.2), mPele, { pos: [0, -0.32, 0.38], esc: [1.6, 0.8, 0.9], borda: 0 })); // queixo
  for (const s of [-1, 1]) cab.add(malha(esfera(0.13), mPele, { pos: [0.6 * s, -0.02, 0], esc: [0.6, 1, 0.8] }));
  cab.add(malha(esfera(0.07), mat(escurecer(m.pele, 0.92)), { pos: [0, -0.06, 0.6], borda: 0 })); // nariz
  for (const s of [-1, 1]) cab.add(malha(esfera(0.09), mat('#ff8a8a', { transparent: true, opacity: 0.35 }), { pos: [0.33 * s, -0.16, 0.5], esc: [1.2, 0.6, 0.3], borda: 0 }));
  // olhos
  const surp = m.sobrancelha === 'surpresa';
  for (const s of [-1, 1]) {
    const o = new THREE.Group(); o.position.set(0.22 * s, 0.06, 0.5); cab.add(o);
    o.add(malha(esfera(0.13), mBranco, { esc: [0.9, surp ? 1.25 : 1.1, 0.5], borda: 0.06 }));
    const iris = new THREE.Mesh(esfera(0.075), mat(m.olhos, { roughness: 0.2 })); iris.position.set(0.01 * s, -0.01, 0.055); iris.scale.set(1, 1.1, 0.5); o.add(iris);
    const pup = new THREE.Mesh(esfera(0.04), mPreto); pup.position.set(0.01 * s, -0.01, 0.085); pup.scale.set(1, 1.1, 0.4); o.add(pup);
    const br = new THREE.Mesh(esfera(0.022), mBranco); br.position.set(0.04, 0.035, 0.1); o.add(br);
    // sobrancelha
    const ang = { confiante: s > 0 ? 0.25 : -0.05, alegre: -0.15 * s, brava: -0.35 * s, surpresa: 0.1 * s }[m.sobrancelha] ?? 0;
    cab.add(malha(capsula(0.035, 0.16), mat(escurecer(m.corCabelo, 1)), { pos: [0.22 * s, surp ? 0.3 : 0.25, 0.53], rot: [0, 0, Math.PI / 2 + ang], borda: 0.04 }));
  }
  // boca
  const mBoca = mat('#5b1c1c');
  if (m.boca === 'sorrisao' || m.boca === 'lingua') {
    cab.add(malha(esfera(0.14), mBoca, { pos: [0, -0.24, 0.5], esc: [1.2, 0.6, 0.4], borda: 0 }));
    cab.add(malha(new THREE.BoxGeometry(0.2, 0.05, 0.05), mBranco, { pos: [0, -0.18, 0.56], borda: 0 }));
    if (m.boca === 'lingua') cab.add(malha(esfera(0.07), mat('#f472b6'), { pos: [0.02, -0.3, 0.55], esc: [1.1, 0.8, 0.6], borda: 0 }));
  } else {
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.025, 8, 20, Math.PI), mBoca);
    t.position.set(m.boca === 'debochado' ? 0.04 : 0, -0.2, 0.55); t.rotation.set(0, 0, Math.PI + (m.boca === 'debochado' ? 0.35 : 0)); cab.add(t);
  }
  // cabelo
  const cap = r => malha(new THREE.SphereGeometry(r, 40, 24, 0, Math.PI * 2, 0, Math.PI * 0.4), mCab, { pos: [0, 0.12, -0.04], esc: [1.03, 1, 1.03] });
  const hair = new THREE.Group(); cab.add(hair);
  if (m.cabelo === 'espetado') {
    hair.add(cap(0.64));
    [[0, 0.62, 0, 0], [0.25, 0.55, 0.12, -0.5], [-0.25, 0.55, 0.12, 0.5], [0.4, 0.4, -0.05, -0.9], [-0.4, 0.4, -0.05, 0.9], [0, 0.5, 0.35, 0.3], [0.15, 0.48, -0.35, -0.3], [-0.15, 0.48, -0.35, 0.3]].forEach(([x, y, z, r]) =>
      hair.add(malha(new THREE.ConeGeometry(0.15, 0.42, 16), mCab, { pos: [x, y, z], rot: [z * 1.3, 0, r] })));
  } else if (m.cabelo === 'topete') {
    hair.add(cap(0.64)); hair.add(malha(esfera(0.3), mCab, { pos: [0.05, 0.58, 0.28], esc: [1.4, 0.9, 1.1], rot: [0.4, 0, -0.2] }));
  } else if (m.cabelo === 'cacheado') {
    hair.add(cap(0.62)); for (let i = 0; i < 22; i++) { const a = i / 22 * Math.PI * 2, y = 0.3 + (i % 3) * 0.14; hair.add(malha(esfera(0.15), mCab, { pos: [Math.cos(a) * 0.52 * (1 - (i % 3) * 0.2), y, Math.sin(a) * 0.5 * (1 - (i % 3) * 0.2) - 0.02], borda: 0.02 })); }
  } else if (m.cabelo === 'liso') {
    hair.add(cap(0.66)); hair.add(malha(new THREE.CylinderGeometry(0.66, 0.6, 0.55, 32, 1, true, Math.PI * 0.75, Math.PI * 1.5), mat(m.corCabelo, { side: THREE.DoubleSide }), { pos: [0, -0.05, -0.02], borda: 0 }));
    hair.add(malha(esfera(0.3), mCab, { pos: [-0.15, 0.4, 0.4], esc: [1.6, 0.55, 0.6], rot: [0, 0, 0.2] }));
  } else if (m.cabelo === 'moicano') {
    hair.add(malha(new THREE.SphereGeometry(0.625, 40, 24, 0, Math.PI * 2, 0, Math.PI * 0.4), mat(escurecer(m.corCabelo, 0.75), { transparent: true, opacity: 0.6 }), { pos: [0, 0.03, -0.02], borda: 0 }));
    for (let i = 0; i < 6; i++) hair.add(malha(new THREE.ConeGeometry(0.11, 0.38, 12), mCab, { pos: [0, 0.6 - Math.abs(i - 2) * 0.04, 0.4 - i * 0.17], rot: [-0.3 + i * 0.18, 0, 0] }));
  } else if (m.cabelo === 'tranças') {
    hair.add(cap(0.65)); for (let i = 0; i < 7; i++) { const a = Math.PI * 0.15 + i / 6 * Math.PI * 0.7; hair.add(malha(capsula(0.05, 0.4), mCab, { pos: [Math.cos(a) * 0.58, -0.15, -Math.sin(a) * 0.45], borda: 0.05 })); }
  } else if (m.cabelo === 'raspado') {
    hair.add(malha(new THREE.SphereGeometry(0.625, 40, 24, 0, Math.PI * 2, 0, Math.PI * 0.4), mat(m.corCabelo, { transparent: true, opacity: 0.55 }), { pos: [0, 0.03, -0.02], borda: 0 }));
  }
  // chapéus
  if (m.chapeu === 'bone' || m.chapeu === 'bonetras') {
    hair.visible = m.cabelo === 'cacheado' || m.cabelo === 'liso';
    cab.add(malha(new THREE.SphereGeometry(0.67, 40, 24, 0, Math.PI * 2, 0, Math.PI * 0.44), mRoupa, { pos: [0, 0.16, 0], esc: [1, 0.85, 1] }));
    const aba = malha(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 32, 1, false, 0, Math.PI), mat(escurecer(m.corRoupa, 0.7)), { pos: [0, 0.22, m.chapeu === 'bone' ? 0.42 : -0.42], rot: [m.chapeu === 'bone' ? 0.15 : -0.15, m.chapeu === 'bone' ? Math.PI / 2 * 0 : Math.PI, 0], esc: [1.1, 1, 1.3] });
    aba.rotation.y = m.chapeu === 'bone' ? -Math.PI / 2 : Math.PI / 2; cab.add(aba);
    cab.add(malha(esfera(0.06), mDet, { pos: [0, 0.66, 0], borda: 0 }));
  } else if (m.chapeu === 'gorro') {
    hair.visible = false; cab.add(malha(new THREE.SphereGeometry(0.68, 40, 24, 0, Math.PI * 2, 0, Math.PI * 0.45), mRoupa, { pos: [0, 0.14, 0] }));
    cab.add(malha(new THREE.TorusGeometry(0.64, 0.08, 12, 40), mat(escurecer(m.corRoupa, 0.7)), { pos: [0, 0.3, 0], rot: [Math.PI / 2, 0, 0], borda: 0 }));
    cab.add(malha(esfera(0.13), mDet, { pos: [0, 0.82, 0] }));
  } else if (m.chapeu === 'fone') {
    cab.add(malha(new THREE.TorusGeometry(0.66, 0.05, 12, 40, Math.PI), mPreto, { pos: [0, 0.02, 0], borda: 0 }));
    for (const s of [-1, 1]) cab.add(malha(new THREE.CylinderGeometry(0.17, 0.17, 0.12, 24), mDet, { pos: [0.66 * s, 0, 0], rot: [0, 0, Math.PI / 2] }));
  } else if (m.chapeu === 'bandana') {
    cab.add(malha(new THREE.TorusGeometry(0.6, 0.07, 10, 40), mDet, { pos: [0, 0.3, 0], rot: [Math.PI / 2 - 0.1, 0, 0], borda: 0.03 }));
    cab.add(malha(esfera(0.1), mDet, { pos: [0.1, 0.32, -0.6] }));
  } else if (m.chapeu === 'coroa') {
    const mOuro = mat('#fbbf24', { metalness: 0.7, roughness: 0.25 });
    cab.add(malha(new THREE.CylinderGeometry(0.36, 0.38, 0.18, 24, 1, true), mat('#fbbf24', { metalness: 0.7, roughness: 0.25, side: THREE.DoubleSide }), { pos: [0, 0.62, 0], borda: 0 }));
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; cab.add(malha(new THREE.ConeGeometry(0.07, 0.2, 10), mOuro, { pos: [Math.cos(a) * 0.36, 0.8, Math.sin(a) * 0.36], borda: 0 })); }
    cab.add(malha(esfera(0.06), mat('#ef4444', { metalness: 0.3, roughness: 0.2 }), { pos: [0, 0.64, 0.37], borda: 0 }));
  }
  // óculos
  if (m.oculos === 'redondo') for (const s of [-1, 1]) cab.add(malha(new THREE.TorusGeometry(0.15, 0.025, 10, 28), mPreto, { pos: [0.22 * s, 0.06, 0.58], borda: 0 }));
  if (m.oculos === 'escuro') for (const s of [-1, 1]) cab.add(malha(new THREE.BoxGeometry(0.3, 0.17, 0.05), mat('#0b0f1a', { roughness: 0.1, metalness: 0.4 }), { pos: [0.21 * s, 0.07, 0.58], borda: 0.03 }));
  if (m.oculos === 'gamer') { cab.add(malha(new THREE.BoxGeometry(0.78, 0.22, 0.08), mDet, { pos: [0, 0.07, 0.56] })); cab.add(malha(new THREE.BoxGeometry(0.7, 0.14, 0.03), mat('#0ea5e9', { emissive: '#0ea5e9', emissiveIntensity: 0.8 }), { pos: [0, 0.07, 0.61], borda: 0 })); }

  // pose do joinha / aceno
  if (m.movimento === 'joinha') P.dedao.visible = true;
  return { raiz, P, m };
}

function novaCena() {
  const cena = new THREE.Scene();
  cena.add(new THREE.HemisphereLight(0xdfe8ff, 0x2a2340, 1.4));
  const sol = new THREE.DirectionalLight(0xffffff, 2.4); sol.position.set(2, 4, 3); cena.add(sol);
  const rim = new THREE.DirectionalLight(0x8fb2ff, 1.6); rim.position.set(-3, 2, -3); cena.add(rim);
  const sombra = new THREE.Mesh(new THREE.CircleGeometry(0.75, 32), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 }));
  sombra.rotation.x = -Math.PI / 2; sombra.position.y = 0.005; cena.add(sombra);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50); cam.position.set(0, 1.75, 7.1); cam.lookAt(0, 1.5, 0);
  return { cena, cam, sombra };
}

function preparar(cv) {
  const chave = cv.dataset.m || '{}';
  let a = alvos.get(cv);
  if (a && a.chave === chave) return a;
  if (a && a.b) a.cena.remove(a.b.raiz);
  if (!a) { a = { ...novaCena(), t0: performance.now() / 1000 + Math.random() * 3 }; alvos.set(cv, a); }
  let m = {}; try { m = JSON.parse(chave); } catch { }
  a.b = construir(m); a.cena.add(a.b.raiz); a.chave = chave;
  return a;
}

function animar(a, t) {
  const { P, m, raiz } = a.b; const k = t - a.t0;
  raiz.position.y = 0; raiz.rotation.y = Math.sin(k * 0.6) * 0.35; P.corpo.rotation.z = 0;
  P.cabeca.rotation.set(Math.sin(k * 1.3) * 0.05, Math.sin(k * 0.9) * 0.15, Math.sin(k * 1.1) * 0.04);
  P.corpo.position.y = Math.sin(k * 2) * 0.02;
  P.bracoE.rotation.set(0, 0, -0.12 + Math.sin(k * 2) * 0.04);
  P.bracoD.rotation.set(0, 0, 0.12 - Math.sin(k * 2) * 0.04);
  if (P.capa) P.capa.rotation.x = Math.sin(k * 3) * 0.08 - 0.08;
  const mov = m.movimento;
  if (mov === 'acenar') P.bracoD.rotation.set(0, 0, 2.6 + Math.sin(k * 7) * 0.35);
  else if (mov === 'joinha') { P.bracoD.rotation.set(-0.9, 0, 0.5 + Math.sin(k * 3) * 0.08); }
  else if (mov === 'pular') { const p = Math.abs(Math.sin(k * 3)); raiz.position.y = p * 0.45; P.bracoD.rotation.z = 0.4 + p * 1.6; P.bracoE.rotation.z = -0.4 - p * 1.6; a.sombra.scale.setScalar(1 - p * 0.4); }
  else if (mov === 'dancar') { raiz.rotation.y = Math.sin(k * 3) * 0.6; P.corpo.rotation.z = Math.sin(k * 6) * 0.08; P.bracoD.rotation.z = 1.8 + Math.sin(k * 6) * 0.8; P.bracoE.rotation.z = -1.8 + Math.sin(k * 6 + 1) * 0.8; raiz.position.y = Math.abs(Math.sin(k * 6)) * 0.08; }
  else if (mov === 'flutuar') raiz.position.y = 0.15 + Math.sin(k * 1.6) * 0.12;
  if (mov !== 'pular') a.sombra.scale.setScalar(1);
}

let ultimo = 0;
function quadro(agora) {
  requestAnimationFrame(quadro);
  if (!renderer || document.hidden || agora - ultimo < 33) return; ultimo = agora;
  const t = agora / 1000;
  for (const [cv, a] of alvos) if (!cv.isConnected) { a.cena.traverse(o => { o.geometry && o.geometry.dispose(); }); alvos.delete(cv); }
  document.querySelectorAll('canvas.masc3d').forEach(cv => {
    const w = cv.clientWidth || cv.width, h = cv.clientHeight || cv.height; if (!w || !h) return;
    const a = preparar(cv); animar(a, t);
    const pr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(w * pr)) { cv.width = Math.round(w * pr); cv.height = Math.round(h * pr); }
    renderer.setSize(cv.width, cv.height, false); a.cam.aspect = cv.width / cv.height; a.cam.updateProjectionMatrix();
    renderer.render(a.cena, a.cam);
    const g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height); g.drawImage(renderer.domElement, 0, 0);
  });
}
if (renderer) requestAnimationFrame(quadro);
window.Masc3D = { ok: !!renderer };
