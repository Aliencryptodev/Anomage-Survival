// ===== OPTIMIZATION.JS — Carga tolerante + optimización en segundo plano =====
// Seguro con los archivos index.html y game.js entregados. No sobreescribe boot ni duplica listeners.
// Se auto-inicia cuando GAME y ATLAS están listos, y termina silenciamente si ya está todo cargado.

(function(){
  "use strict";

  // ---------- Utilidades seguras ----------
  const get = (id)=>document.getElementById(id);
  const hasWin = typeof window !== "undefined";
  const NOP = ()=>{};

  // Placeholder local por si no existe el de game.js (no interfiere si ya está)
  function localPlaceholder(text="MISS"){
    try{
      if (typeof placeholder === "function") return placeholder(text);
    }catch{}
    const c=document.createElement('canvas'); c.width=64; c.height=64;
    const g=c.getContext('2d');
    g.fillStyle="#1d1f27"; g.fillRect(0,0,64,64);
    g.strokeStyle="#4f46e5"; g.lineWidth=3; g.strokeRect(3,3,58,58);
    g.fillStyle="#c7d2fe"; g.font="bold 10px monospace"; g.fillText(text,8,36);
    const im=new Image(); im.src=c.toDataURL(); return im;
  }

  // ---------- loadImage con timeout y cleanup (override no intrusivo) ----------
  const originalLoadImage = (typeof window.loadImage === "function") ? window.loadImage : null;

  window.loadImage = function loadImageOptimized(src, timeout = 5000){
    return new Promise((resolve)=>{
      try{
        const img = new Image();
        let done = false;

        const cleanup = ()=>{ img.onload = img.onerror = null; clearTimeout(tid); };
        const finish = (v)=>{ if(!done){ done = true; cleanup(); resolve(v); } };

        const tid = setTimeout(()=> finish(localPlaceholder("TIMEOUT")), timeout);
        img.onload  = ()=> finish(img);
        img.onerror = ()=> finish(localPlaceholder("MISS"));
        img.src = src;
      }catch(_){
        resolve(localPlaceholder("MISS"));
      }
    });
  };

  // ---------- Recolector de URLs ----------
  function uniquePropSrcsSafe(){
    try{ return (typeof uniquePropSrcs === "function") ? uniquePropSrcs() : []; }
    catch{ return []; }
  }
  function collectAllUrls(atlas){
    const all = new Set();

    if (!atlas) return [];
    for (const g in atlas){
      for (const a in atlas[g]){
        const arr = atlas[g][a] || [];
        arr.forEach(u => all.add(u));
      }
    }

    // grounds / props / UI si existen en el entorno
    try{
      if (Array.isArray(window.BIOMES)) window.BIOMES.forEach(b => all.add(b.ground));
    }catch{}
    try{
      const props = uniquePropSrcsSafe();
      props.forEach(u => all.add(u));
    }catch{}
    try{
      if (window.ITEM_IMAGES) Object.values(window.ITEM_IMAGES).forEach(u => all.add(u));
    }catch{}

    return Array.from(all).filter(Boolean);
  }

  // ---------- Preload secundario (en lotes para no bloquear) ----------
  async function preloadSecondary(atlas, cache, onProgress = NOP){
    const urls = collectAllUrls(atlas).filter(u => !cache[u]);

    let done = 0;
    const total = urls.length;

    // Lotes de 3 (baja presión en el main thread)
    for (let i = 0; i < urls.length; i += 3) {
      const slice = urls.slice(i, i + 3);
      await Promise.all(slice.map(async (u)=>{
        if (!cache[u]) cache[u] = await window.loadImage(u);
        done++;
        onProgress(done, total);
      }));
      // Cede ~1 frame
      await new Promise(r => setTimeout(r, 16));
    }

    // Grounds por índice (compat con game.js)
    try{
      if (!cache.__grounds) cache.__grounds = [];
      if (Array.isArray(window.BIOMES)){
        for (let i=0;i<window.BIOMES.length;i++){
          if (!cache.__grounds[i]) {
            cache.__grounds[i] = await window.loadImage(window.BIOMES[i].ground);
            onProgress(++done, total);
            await new Promise(r => setTimeout(r, 0));
          }
        }
      }
    }catch{}

    // PropsImgs map (para dibujar desde WORLD)
    try{
      if (window.WORLD && WORLD.propsImgs && typeof WORLD.propsImgs.set === "function"){
        uniquePropSrcsSafe().forEach(src=>{
          if (!WORLD.propsImgs.has(src) && cache[src]) WORLD.propsImgs.set(src, cache[src]);
        });
      }
    }catch{}

    return { done, total };
  }

  // ---------- UI progreso sutil ----------
  function showOptimizing(done, total){
    try{
      const el = get("progress");
      if (!el) return;
      if (total === 0) { el.innerHTML = `<span class="ok">✔</span>`; return; }
      const pct = Math.round((done/Math.max(total,1))*100);
      el.innerHTML = `<span style="color:#4CAF50">Optimizando... ${pct}%</span>`;
    }catch{}
  }

  function endOptimizing(){
    try{
      const el = get("progress");
      if (el) el.innerHTML = `<span class="ok">✔</span>`;
    }catch{}
  }

  // ---------- Arranque en segundo plano ----------
  let started = false;
  async function startBackgroundOptimization(){
    if (started) return;
    started = true;

    // Espera a que el juego esté listo
    const ok = await waitFor(()=> hasWin && window.GAME && window.GAME.cache && window.ATLAS, 8000);
    if (!ok) return; // no hay entorno, salimos silenciosamente

    const atlas = window.ATLAS;
    const cache = window.GAME.cache;

    // Si ya está todo, no hacemos nada pesado
    const urlsTotal = collectAllUrls(atlas);
    const missing = urlsTotal.filter(u => !cache[u]);
    if (missing.length === 0) { endOptimizing(); return; }

    showOptimizing(0, missing.length);
    const res = await preloadSecondary(atlas, cache, (d,t)=> showOptimizing(d, missing.length));
    endOptimizing();

    // Log no intrusivo
    if (hasWin && window.console) {
      console.log(`Optimization: precargados ${res.done}/${res.total} assets secundarios.`);
    }
  }

  // Espera condicional con timeout (ms)
  function waitFor(condFn, timeout = 5000, step = 50){
    return new Promise(resolve=>{
      const t0 = performance.now();
      (function tick(){
        if (condFn()) return resolve(true);
        if (performance.now() - t0 > timeout) return resolve(false);
        setTimeout(tick, step);
      })();
    });
  }

  // ---------- API pública mínima ----------
  window.OptimizedGameLoader = {
    start: startBackgroundOptimization,
    preloadSecondary, // por si quieres usarlo manualmente
  };

  // Auto-inicio cuando el DOM está listo (sin molestar a la pantalla de carga)
  if (hasWin) {
    // Arranca apenas el hilo principal quede libre y GAME exista
    const bootstrap = async ()=>{
      await waitFor(()=> !!window.GAME, 8000);
      // no bloquees: cola al siguiente macrotask para no interferir con boot
      setTimeout(()=> startBackgroundOptimization().catch(NOP), 0);
    };
    if (document.readyState === "complete" || document.readyState === "interactive") bootstrap();
    else window.addEventListener("DOMContentLoaded", bootstrap, { once:true });
  }

})();
