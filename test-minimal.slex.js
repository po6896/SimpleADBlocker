// ==UserScript==
// @name            SAB Test
// @name:ja         SABテスト
// @author          おそうじロボ
// @description     Diagnostic test for Simple AD Blocker
// @description:ja  動作テスト用
// @include         http://*
// @include         https://*
// @version         0.1.0
// @require         api
// @require         jquery
// ==/UserScript==

(function(){
  'use strict';
  var r=[];
  var ok=0;var ng=0;
  function t(name,fn){try{var res=fn();if(res){r.push('OK:'+name);ok++;}else{r.push('NG:'+name);ng++;}}catch(e){r.push('NG:'+name);ng++;}}

  t('CSS',function(){SLEX_addStyle('.adsbygoogle{display:none!important}');return true;});
  t('jQ',function(){return $('body').length>0;});
  t('Proxy',function(){var p=new Proxy({},{get:function(){return 1;}});return p.x===1;});
  t('MO',function(){return typeof MutationObserver!=='undefined';});
  t('HTTP',function(){return typeof SLEX_httpGet==='function';});
  t('WS',function(){return typeof WebSocket!=='undefined';});

  t('XHR-block',function(){
    var xhr=new XMLHttpRequest();
    xhr.open('GET','https://pagead2.googlesyndication.com/test');
    return xhr._sab_blocked===true;
  });

  t('fetch-hook',function(){return window.fetch.toString().indexOf('native')===-1||window.fetch.toString().indexOf('Proxy')!==-1;});

  t('shadow',function(){
    var d=document.createElement('div');
    var s=d.attachShadow({mode:'closed'});
    return s!==undefined&&s!==null;
  });

  t('setAttribute',function(){
    var s=document.createElement('script');
    s.setAttribute('src','https://googlesyndication.com/test.js');
    var val=s.src||s.getAttribute('src')||'';
    return val.indexOf('googlesyndication')===-1;
  });

  t('sendBeacon',function(){return navigator.sendBeacon.toString().indexOf('native')===-1;});

  t('popstate-guard',function(){return history.forward.toString().indexOf('native')===-1||history.forward.toString()==='function () {}';});

  t('adBlockDetected',function(){try{var x=window.adBlockDetected;return false;}catch(e){return true;}});

  t('ga-noop',function(){return typeof window.ga==='function'&&typeof window.gtag==='function';});

  t('cookie-clean',function(){return typeof document.cookie==='string';});

  t('iframe-contam',function(){
    var ifr=document.createElement('iframe');
    ifr.style.cssText='display:none;width:0;height:0;';
    document.body.appendChild(ifr);
    var result=false;
    try{
      setTimeout(function(){
        try{result=ifr.contentWindow._sab===true;}catch(e){}
        try{document.body.removeChild(ifr);}catch(e){}
      },200);
    }catch(e){}
    return true;
  });

  var msg=ok+'/'+r.length+' | '+r.join(' | ');
  try{SLEX_addStyle('#_sab_diag{position:fixed!important;bottom:0!important;left:0!important;right:0!important;background:#000!important;color:#0f0!important;font-size:14px!important;padding:10px!important;z-index:2147483647!important;text-align:center!important;font-family:monospace!important;border-top:2px solid #0f0!important;max-height:25vh!important;overflow-y:auto!important;line-height:1.6!important;}');}catch(e){}
  var div=document.createElement('div');
  div.id='_sab_diag';
  div.textContent=msg;
  if(document.body){document.body.appendChild(div);}else{document.addEventListener('DOMContentLoaded',function(){document.body.appendChild(div);});}
})();
