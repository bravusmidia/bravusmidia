/* Meta Pixel — página do e-book Tráfego Pago do Zero
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
  var produto = { content_name: 'Tráfego Pago do Zero', content_ids: ['ebook-trafego-pago-do-zero'], content_type: 'product', value: 47, currency: 'BRL' };
  fbq('init', PIXEL_ID);
  fbq('track', 'PageView');
  fbq('track', 'ViewContent', produto);
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest && ev.target.closest('a[href*="pay.kiwify.com.br"]');
    if (a) fbq('track', 'AddToCart', produto);
  });
})();
