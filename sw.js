// Plan Mi Vereda: guarda la app en el dispositivo para usarla sin internet.
const APP='pmv-app-v2', TILES='pmv-mapa-v1', MAX_TILES=3000;
const SHELL=['./','./index.html','./config.js','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>{ e.waitUntil(caches.open(APP).then(c=>c.addAll(SHELL.map(u=>new Request(u,{cache:'no-store'})))).then(()=>self.skipWaiting())); });
self.addEventListener('activate',e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==APP&&k!==TILES).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET') return;
  if(u.hostname.endsWith('google.com')||u.hostname.endsWith('googleusercontent.com')) return;   // la planilla: siempre en vivo
  // fondo del mapa: se guardan las zonas que ya se miraron con internet
  if(/arcgisonline\.com/.test(u.hostname)){
    e.respondWith(caches.open(TILES).then(async c=>{ const hit=await c.match(e.request); if(hit) return hit;
      try{ const r=await fetch(e.request); if(r.ok||r.type==='opaque'){ c.put(e.request,r.clone()); c.keys().then(k=>{ if(k.length>MAX_TILES) c.delete(k[0]); }); } return r; }
      catch(err){ return new Response('',{status:504}); } }));
    return;
  }
  const esApp = u.origin===location.origin && (e.request.mode==='navigate' || /\/(index\.html|config\.js|manifest\.webmanifest|icon-\d+\.png)?$/.test(u.pathname));
  if(esApp){
    // la app: con internet se baja SIEMPRE la versión nueva (sin caché del navegador); sin internet, la guardada
    e.respondWith(caches.open(APP).then(async c=>{
      const red=fetch(e.request.url,{cache:'no-store',credentials:'same-origin'}).then(r=>{ if(r&&r.ok) c.put(e.request,r.clone()); return r; }).catch(()=>null);
      const espera=new Promise(ok=>setTimeout(()=>ok(null),4000));   // si la señal es muy lenta, abre la guardada
      const r=await Promise.race([red,espera]);
      if(r&&r.ok) return r;
      return (await c.match(e.request,{ignoreSearch:true})) || (await red) || c.match('./index.html'); }));
  }
});
