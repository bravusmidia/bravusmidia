// Para atualizar o site no navegador:
// 1. git add .
// 2. git commit -m "descricao da alteracao"
// 3. git push origin HEAD:main

// ── SCROLL REVEAL ──
const reveals = document.querySelectorAll('.reveal');
const obs = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      obs.unobserve(e.target);
    }
  });
}, { threshold: 0.1 });
reveals.forEach(r => obs.observe(r));

// ── FORMULÁRIO (Formspree) ──
async function handleSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('.btn-submit');

  btn.textContent = 'Enviando...';
  btn.disabled = true;

  try {
    const response = await fetch(form.action, {
      method: 'POST',
      body: new FormData(form),
      headers: { 'Accept': 'application/json' }
    });

    if (response.ok) {
      document.getElementById('form-success').style.display = 'block';
      btn.style.display = 'none';
      form.reset();
    } else {
      btn.textContent = 'Erro ao enviar. Tente novamente.';
      btn.disabled = false;
    }
  } catch (err) {
    btn.textContent = 'Erro ao enviar. Tente novamente.';
    btn.disabled = false;
  }
}

// ── MENU MOBILE ──
function toggleMenu() {
  const links = document.querySelector('.nav-links');
  if (links.style.display === 'flex') {
    links.style.display = 'none';
  } else {
    links.style.cssText = 'display:flex; flex-direction:column; position:absolute; top:68px; left:0; right:0; background:#0A0C10; padding:24px 6%; gap:20px; border-bottom:1px solid #1C2030;';
  }
}