// ===== PARCHE DE OPTIMIZACIÓN COMPLETO =====
// Añadir al final de game.js o como archivo separado

// Override de la función loadImage original
const originalLoadImage = window.loadImage || loadImage;
function loadImage(src, timeout = 5000) {
  return new Promise((resolve) => {
    const img = new Image();
    let loaded = false;
    
    const onLoad = () => {
      if (!loaded) {
        loaded = true;
        resolve(img);
      }
    };
    
    const onError = () => {
      if (!loaded) {
        loaded = true;
        resolve(placeholder("MISS"));
      }
    };
    
    setTimeout(() => {
      if (!loaded) {
        loaded = true;
        resolve(placeholder("TIMEOUT"));
      }
    }, timeout);
    
    img.onload = onLoad;
    img.onerror = onError;
    img.src = src;
  });
}

// Sistema de assets críticos
const CRITICAL_ASSETS = {
  getPlayerAssets: (heroKey) => {
    const hero = ATLAS[heroKey] || ATLAS.anomage;
    return Object.values(hero).flat();
  },
  getBasicSpells: () => ATLAS.spells.fire || [],
  getCurrentBiome: () => [BIOMES[BIOME].ground],
  getUI: () => [ITEM_IMAGES.potion_hp, ITEM_IMAGES.potion_mana],
  getBasicEnemy: () => {
    const enemyByBiome = ["skeleton", "ghost", "orc", "bat", "shrimp"];
    const type = enemyByBiome[BIOME] || "skeleton";
    return ATLAS.enemies[type] || [];
  }
};

// Carga crítica
async function preloadCritical(atlas, heroKey, onProgress) {
  const criticalUrls = [
    ...CRITICAL_ASSETS.getPlayerAssets(heroKey),
    ...CRITICAL_ASSETS.getBasicSpells(),
    ...CRITICAL_ASSETS.getCurrentBiome(),
    ...CRITICAL_ASSETS.getUI(),
    ...CRITICAL_ASSETS.getBasicEnemy()
  ];

  let done = 0;
  const total = criticalUrls.length;
  const cache = {};

  for (const url of criticalUrls) {
    cache[url] = await loadImage(url);
    onProgress(++done, total);
  }

  cache.__grounds = [];
  cache.__grounds[BIOME] = await loadImage(BIOMES[BIOME].ground);
  
  return cache;
}

// Carga secundaria
async function preloadSecondary(atlas, cache, onProgress) {
  const allUrls = [];
  
  for (const g in atlas) {
    for (const a in atlas[g]) {
      allUrls.push(...atlas[g][a]);
    }
  }

  const groundUrls = BIOMES.map(b => b.ground);
  const propUrls = uniquePropSrcs();
  
  const secondaryUrls = [
    ...allUrls.filter(url => !cache[url]),
    ...groundUrls.filter(url => !cache[url]),
    ...propUrls.filter(url => !cache[url]),
    ...Object.values(ITEM_IMAGES).filter(url => !cache[url])
  ];

  let done = 0;
  const total = secondaryUrls.length;

  for (let i = 0; i < secondaryUrls.length; i += 3) {
    const chunk = secondaryUrls.slice(i, i + 3);
    await Promise.all(chunk.map(async url => {
      if (!cache[url]) {
        cache[url] = await loadImage(url);
      }
      done++;
      if (onProgress) onProgress(done, total);
    }));
    
    await new Promise(resolve => setTimeout(resolve, 16));
  }

  if (!cache.__grounds) cache.__grounds = [];
  for (let i = 0; i < BIOMES.length; i++) {
    if (!cache.__grounds[i]) {
      cache.__grounds[i] = await loadImage(BIOMES[i].ground);
    }
  }

  for (const src of propUrls) {
    if (!cache[src]) {
      cache[src] = await loadImage(src);
    }
  }

  return cache;
}

// Gestor de carga
class OptimizedGameLoader {
  constructor() {
    this.loadingState = 'waiting';
    this.addProgressBar();
  }

  addProgressBar() {
    if (!document.getElementById('loadingProgress')) {
      const progressBar = document.createElement('div');
      progressBar.id = 'loadingProgress';
      progressBar.style.cssText = 'position:fixed;top:0;left:0;width:0%;height:3px;background:linear-gradient(90deg,#ff6b35,#9fef00,#4CAF50);transition:width 0.3s ease;z-index:1000';
      document.body.appendChild(progressBar);
    }
  }

  updateProgress(phase, progress) {
    const bar = document.getElementById('loadingProgress');
    if (bar) {
      const totalProgress = phase === 'critical' ? progress * 0.3 : 0.3 + (progress * 0.7);
      bar.style.width = `${totalProgress * 100}%`;
    }
  }

  async loadGame(heroKey) {
    try {
      this.loadingState = 'critical';
      progressEl.innerHTML = '<span style="color:#ff6b35">Cargando esenciales...</span>';
      
      GAME.cache = await preloadCritical(ATLAS, heroKey, (done, total) => {
        this.updateProgress('critical', done / total);
        progressEl.innerHTML = `<span style="color:#ff6b35">(${done}/${total}) Esenciales</span>`;
      });

      // Preparar mundo mínimo
      for (const p of uniquePropSrcs()) {
        if (GAME.cache[p]) {
          WORLD.propsImgs.set(p, GAME.cache[p]);
        }
      }

      GAME.player = new Player(GAME.cache, ATLAS, heroKey);
      CAMERA.x = GAME.player.x; 
      CAMERA.y = GAME.player.y; 
      biomeEl.textContent = BIOME + 1;

      progressEl.innerHTML = '<span style="color:#4CAF50">¡Listo para jugar!</span>';
      this.enableStartButton();

      // Carga secundaria
      this.loadingState = 'secondary';
      this.loadSecondary();

    } catch (err) {
      progressEl.textContent = "Error: " + err.message;
      console.error(err);
    }
  }

  async loadSecondary() {
    try {
      await preloadSecondary(ATLAS, GAME.cache, (done, total) => {
        this.updateProgress('secondary', done / total);
        const percent = Math.round((done / total) * 100);
        progressEl.innerHTML = `<span style="color:#4CAF50">Optimizando... ${percent}%</span>`;
      });

      for (const p of uniquePropSrcs()) {
        if (!WORLD.propsImgs.has(p) && GAME.cache[p]) {
          WORLD.propsImgs.set(p, GAME.cache[p]);
        }
      }

      this.loadingState = 'complete';
      progressEl.innerHTML = '<span style="color:#9fef00">Totalmente optimizado ✔</span>';
      
      setTimeout(() => {
        const bar = document.getElementById('loadingProgress');
        if (bar) bar.style.opacity = '0';
      }, 1500);
      
    } catch (err) {
      console.warn('Error cargando assets secundarios:', err);
    }
  }

  enableStartButton() {
    const btnStart = document.getElementById('btnStart');
    btnStart.disabled = false;
    btnStart.style.opacity = '1';
    btnStart.style.pointerEvents = 'auto';
    btnStart.style.background = 'linear-gradient(135deg, #4CAF50, #45a049)';
    btnStart.style.borderColor = '#4CAF50';
    btnStart.innerHTML = 'JUGAR AHORA <span style="color:#9fef00">✓</span>';
  }
}

// Carga de previews
async function loadCharacterPreviews() {
  const previewCache = {};
  const previewSprites = [
    ...(ATLAS.anomage?.idle || []),
    ...(ATLAS.shrimp?.idle || [])
  ];
  
  for (const sprite of previewSprites) {
    previewCache[sprite] = await loadImage(sprite);
  }
  
  if (!GAME.cache) GAME.cache = {};
  Object.assign(GAME.cache, previewCache);
  
  setTimeout(() => {
    drawHeroPreview('prev-anomage', 'anomage');
    drawHeroPreview('prev-shrimp', 'shrimp');
  }, 100);
}

// Setup de selección de personajes
function setupCharacterSelection() {
  const buttons = document.querySelectorAll('#charSelect .char');
  const btnStart = document.getElementById('btnStart');
  
  btnStart.disabled = true;
  btnStart.style.opacity = '0.5';
  btnStart.style.pointerEvents = 'none';
  btnStart.textContent = 'Selecciona personaje...';
  
  buttons.forEach(btn => {
    btn.addEventListener('click', async () => {
      buttons.forEach(b => {
        b.style.border = '1px solid #888';
        b.style.background = '#151515';
      });
      btn.style.border = '2px solid #9fef00';
      btn.style.background = '#1a1a1a';
      
      SELECTED_HERO_KEY = btn.dataset.hero;
      SELECTED_HERO_NAME = (SELECTED_HERO_KEY === 'shrimp') ? 'SHRIMP' : 'ANOMAGE';
      chosenNameEl.textContent = SELECTED_HERO_NAME;
      
      if (optimizedLoader.loadingState === 'waiting') {
        btnStart.textContent = 'Preparando...';
        await optimizedLoader.loadGame(SELECTED_HERO_KEY);
      } else {
        optimizedLoader.enableStartButton();
      }
    });
  });
  
  setTimeout(() => buttons[0].click(), 100);
}

// Instancia del loader
const optimizedLoader = new OptimizedGameLoader();

// Override de la función boot original
const originalBoot = boot;
async function boot(reuse = false) {
  try {
    if (!reuse) {
      try {
        ATLAS = normalizeAtlasPaths(await tryFetchSpritesJson());
        document.getElementById('spritesState').innerHTML = 'Sprites <span class="ok">✔</span>';
      } catch {
        ATLAS = normalizeAtlasPaths(defaultAtlasJson());
        warn.classList.add('show');
      }
    }

    setupCharacterSelection();
    await loadCharacterPreviews();
    fitCanvas();
    
    let last = performance.now();
    (function loop(now) {
      const dt = now - last;
      last = now;
      
      if (GAME.running) {
        update(dt);
        draw();
      } else if (GAME.player) {
        draw();
      }
      
      requestAnimationFrame(loop);
    })(last);

  } catch (err) {
    progressEl.textContent = "Error: " + err.message;
    console.error(err);
  }
}

// Override del botón de inicio
document.getElementById('btnStart').addEventListener('click', async () => {
  if (optimizedLoader.loadingState === 'waiting') {
    toast('Selecciona un personaje primero');
    return;
  }
  
  startDiv.classList.remove('show');
  
  try {
    if (document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen();
    }
  } catch {}
  
  if (!GAME.player || GAME.player.heroKey !== SELECTED_HERO_KEY) {
    GAME.player = new Player(GAME.cache, ATLAS, SELECTED_HERO_KEY);
  }
  
  CAMERA.x = GAME.player.x;
  CAMERA.y = GAME.player.y;
  biomeEl.textContent = BIOME + 1;
  
  regenerateBiome();
  resetWave();
  
  playMusic(BIOMES[BIOME].music);
  GAME.running = true;
  
  toast('¡Juego iniciado!');
});

console.log('🚀 Sistema de carga optimizado activado!');
