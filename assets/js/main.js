/* Bravus Mídia — scripts do site (sem dependências) */
(function () {
  'use strict';

  /* Para onde os pedidos do formulário são enviados.
     Hoje: Formspree (chega no e-mail cadastrado no Formspree).
     Para trocar pelo Google Forms, altere só este endereço e os nomes dos campos em FIELD_NAMES. */
  var FORM_ENDPOINT = 'https://formspree.io/f/xqevzonb';
  var FIELD_NAMES = { nome: 'nome', whatsapp: 'whatsapp', email: 'email', servico: 'servico', mensagem: 'mensagem' };

  // Impede que o site seja exibido dentro de outro site (proteção contra clickjacking).
  if (window.top !== window.self) {
    try { window.top.location = window.self.location.href; } catch (e) { document.documentElement.hidden = true; }
  }

  // Menu no celular
  var toggle = document.querySelector('.menu-toggle');
  var nav = document.getElementById('menu');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.addEventListener('click', function (ev) {
      if (ev.target.closest('a')) { nav.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); }
    });
  }

  // Menu suspenso "Bravus Academy": abre e fecha ao clicar
  document.querySelectorAll('.nav-drop').forEach(function (drop) {
    var btn = drop.querySelector('.nav-drop-btn');
    if (!btn) return;
    function setOpen(open) {
      drop.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    btn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      setOpen(!drop.classList.contains('is-open'));
    });
    document.addEventListener('click', function (ev) {
      if (!drop.contains(ev.target)) setOpen(false);
    });
    drop.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && drop.classList.contains('is-open')) { setOpen(false); btn.focus(); }
    });
    drop.addEventListener('focusout', function (ev) {
      if (ev.relatedTarget && !drop.contains(ev.relatedTarget)) setOpen(false);
    });
  });

  var form = document.getElementById('form-orcamento');
  if (!form) return;

  var el = {
    nome: form.querySelector('#f-nome'),
    tel: form.querySelector('#f-tel'),
    email: form.querySelector('#f-email'),
    servico: form.querySelector('#f-servico'),
    msg: form.querySelector('#f-msg'),
    hp: form.querySelector('#f-site'),
    btn: form.querySelector('button[type="submit"]'),
    alert: document.getElementById('form-alert'),
    success: document.getElementById('form-success'),
    successName: document.getElementById('success-name'),
    again: document.getElementById('form-again')
  };

  // Botões "Quero este plano" e "Quero ser avisado" já escolhem a opção no formulário
  document.querySelectorAll('[data-servico]').forEach(function (link) {
    link.addEventListener('click', function () {
      var value = link.getAttribute('data-servico');
      if (Array.prototype.some.call(el.servico.options, function (o) { return o.value === value; })) {
        el.servico.value = value;
        setError('servico', false);
      }
    });
  });

  // Máscara do telefone: (85) 99999-9999
  function maskPhone(v) {
    var d = String(v).replace(/\D/g, '').slice(0, 11);
    if (d.length === 0) return '';
    if (d.length <= 2) return '(' + d;
    if (d.length <= 6) return '(' + d.slice(0, 2) + ') ' + d.slice(2);
    if (d.length <= 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
    return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
  }
  el.tel.addEventListener('input', function () { el.tel.value = maskPhone(el.tel.value); });

  var rules = {
    nome: function () { return el.nome.value.trim().split(/\s+/).filter(Boolean).length >= 2 && el.nome.value.trim().length <= 80; },
    tel: function () { var n = el.tel.value.replace(/\D/g, '').length; return n === 10 || n === 11; },
    email: function () { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(el.email.value.trim()) && el.email.value.length <= 120; },
    servico: function () { return el.servico.value !== ''; }
  };

  function setError(key, show) {
    var input = el[key];
    var msg = document.getElementById('err-' + key);
    input.setAttribute('aria-invalid', show ? 'true' : 'false');
    if (msg) msg.hidden = !show;
  }

  Object.keys(rules).forEach(function (key) {
    el[key].addEventListener('blur', function () { if (el[key].value) setError(key, !rules[key]()); });
    el[key].addEventListener('input', function () { if (el[key].getAttribute('aria-invalid') === 'true') setError(key, !rules[key]()); });
  });

  var sending = false;
  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    if (sending) return;
    el.alert.hidden = true;

    var firstBad = null;
    Object.keys(rules).forEach(function (key) {
      var ok = rules[key]();
      setError(key, !ok);
      if (!ok && !firstBad) firstBad = el[key];
    });
    if (firstBad) { firstBad.focus(); return; }

    // Campo invisível: se vier preenchido, é robô. Finge sucesso e não envia.
    if (el.hp && el.hp.value) { showSuccess(); return; }

    var data = new FormData();
    data.append(FIELD_NAMES.nome, el.nome.value.trim());
    data.append(FIELD_NAMES.whatsapp, el.tel.value.trim());
    data.append(FIELD_NAMES.email, el.email.value.trim());
    data.append(FIELD_NAMES.servico, el.servico.value);
    data.append(FIELD_NAMES.mensagem, el.msg.value.trim().slice(0, 600));
    data.append('_subject', 'Novo pedido pelo site: ' + el.servico.value);

    sending = true;
    el.btn.disabled = true;
    el.btn.textContent = 'Enviando...';

    fetch(FORM_ENDPOINT, { method: 'POST', body: data, headers: { Accept: 'application/json' }, referrerPolicy: 'strict-origin-when-cross-origin' })
      .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); showSuccess(); })
      .catch(function () { el.alert.hidden = false; })
      .then(function () { sending = false; el.btn.disabled = false; el.btn.textContent = 'Enviar pedido de orçamento'; });
  });

  function showSuccess() {
    el.successName.textContent = el.nome.value.trim().split(/\s+/)[0] || '';
    form.hidden = true;
    el.success.hidden = false;
    el.success.focus();
  }

  el.again.addEventListener('click', function () {
    form.reset();
    Object.keys(rules).forEach(function (key) { setError(key, false); });
    el.success.hidden = true;
    form.hidden = false;
    el.nome.focus();
  });
})();
