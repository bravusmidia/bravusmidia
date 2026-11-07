/* Meta Pixel — página do e-book Fale Sem Medo em 21 Dias
   Eventos: PageView e ViewContent ao abrir; AddToCart ao clicar em um botão de compra.
   InitiateCheckout e Purchase são disparados pela Kiwify (mesmo Pixel). */
(function () {
  'use strict';
  var PIXEL_ID = '1433756271553732';
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
  n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
  document,'script','https://connect.facebook.net/en_US/fbevents.js');
  var produto = { content_name: 'Fale Sem Medo em 21 Dias', content_ids: ['ebook-fale-sem-medo'], content_type: 'product', value: 37, currency: 'BRL' };
  fbq('init', PIXEL_ID);
  fbq('track', 'PageView');
  fbq('track', 'ViewContent', produto);
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest && ev.target.closest('a[href*="pay.kiwify.com.br"]');
    if (a) fbq('track', 'AddToCart', produto);
  });
})();
