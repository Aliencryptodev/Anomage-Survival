// ===== SISTEMA UI RETRO - JavaScript =====

class RetroUIManager {
  constructor() {
    this.weaponIcons = {
      fire: '🔥',
      light: '⚡',
      ice: '❄️',
      dark: '🌑'
    };
    this.currentWeapon = 'fire';
    this.lastHP = 100;
    this.lastMana = 50;
    this.gameStarted = false;
    this.hudCreated = false;
  }

  initializeRetroUI() {
    if (this.hudCreated) return;
    
    // Crear contenedor principal del HUD
    const hudContainer = document.createElement('div');
    hudContainer.id = 'gameHUD';
    document.body.appendChild(hudContainer);

    // Panel superior izquierdo - Stats del jugador
    const topLeftPanel = document.createElement('div');
    topLeftPanel.className = 'hud-panel-top-left scanlines';
    topLeftPanel.innerHTML = `
      <div style="color: var(--retro-accent); font-size: 8px; margin-bottom: 4px;">STATS</div>
      
      <div style="margin-bottom: 6px;">
        <div style="color: #bbb; font-size: 6px; margin-bottom: 2px;">LIFE</div>
        <div class="stat-bar">
          <div class="stat-bar-fill hp" id="hpBarFill"></div>
          <div class="stat-text" id="hpText">100/100</div>
        </div>
      </div>
      
      <div>
        <div style="color: #bbb; font-size: 6px; margin-bottom: 2px;">MANA</div>
        <div class="stat-bar">
          <div class="stat-bar-fill mana" id="manaBarFill"></div>
          <div class="stat-text" id="manaText">50/50</div>
        </div>
      </div>
    `;
    hudContainer.appendChild(topLeftPanel);

    // Panel superior derecho - Info del mapa
    const topRightPanel = document.createElement('div');
    topRightPanel.className = 'hud-panel-top-right scanlines';
    topRightPanel.innerHTML = `
      <div class="map-info">
        <div class="map-title">SECTOR <span id="mapNumber">1</span></div>
        
        <div class="info-line">
          <span class="info-label">ENEMIES:</span>
          <span class="info-value" id="killCount">0</span><span style="color: #666;">/50</span>
        </div>
        
        <div class="info-line">
          <span class="info-label">BOSS:</span>
          <span class="info-value" id="bossStatus">WAITING</span>
        </div>
        
        <div class="info-line">
          <span class="info-label">ESSENCE:</span>
          <span class="info-value special" id="essenceCount">0</span>
        </div>
      </div>
    `;
    hudContainer.appendChild(topRightPanel);

    // Panel inferior - Armas y controles
    const bottomPanel = document.createElement('div');
    bottomPanel.className = 'hud-panel-bottom scanlines';
    bottomPanel.innerHTML = `
      <div style="color: var(--retro-accent); font-size: 6px; margin-right: 8px;">WEAPON:</div>
      
      <div class="weapon-selector">
        <div class="weapon-slot active" data-weapon="fire" data-key="1">
          <span class="weapon-icon">🔥</span>
        </div>
        <div class="weapon-slot" data-weapon="light" data-key="2">
          <span class="weapon-icon">⚡</span>
        </div>
        <div class="weapon-slot" data-weapon="ice" data-key="3">
          <span class="weapon-icon">❄️</span>
        </div>
        <div class="weapon-slot" data-weapon="dark" data-key="4">
          <span class="weapon-icon">🌑</span>
        </div>
      </div>
      
      <div style="margin-left: 12px;">
        <div style="color: #bbb; font-size: 6px;">LV <span id="weaponLevel" style="color: var(--retro-accent);">1</span></div>
      </div>
      
      <div style="margin-left: 12px; color: #666; font-size: 5px;">
        WASD:MOVE • CLICK:SHOOT
      </div>
    `;
    hudContainer.appendChild(bottomPanel);

    // Eventos de selección de armas
    this.setupWeaponSelection();
    
    this.hudCreated = true;
  }

  setupWeaponSelection() {
    const weaponSlots = document.querySelectorAll('.weapon-slot');
    
    weaponSlots.forEach(slot => {
      slot.addEventListener('click', () => {
        const weapon = slot.dataset.weapon;
        this.selectWeapon(weapon);
      });
    });

    // Escuchar teclas del juego original
    document.addEventListener('keydown', (e) => {
      const keyMap = {
        '1': 'fire',
        '2': 'light', 
        '3': 'ice',
        '4': 'dark'
      };
      
      if (keyMap[e.key] && this.gameStarted) {
        this.selectWeapon(keyMap[e.key]);
      }
    });
  }

  selectWeapon(weaponType) {
    // Actualizar UI
    document.querySelectorAll('.weapon-slot').forEach(slot => {
      slot.classList.remove('active');
    });
    
    const activeSlot = document.querySelector(`[data-weapon="${weaponType}"]`);
    if (activeSlot) {
      activeSlot.classList.add('active');
    }

    this.currentWeapon = weaponType;
    
    // Actualizar nivel del arma
    const level = (window.GAME && window.GAME.upgrades) ? window.GAME.upgrades[weaponType] || 1 : 1;
    const levelEl = document.getElementById('weaponLevel');
    if (levelEl) {
      levelEl.textContent = level;
      this.createParticleEffect(levelEl, '✨');
    }

    // Sincronizar con el juego original
    if (window.GAME) {
      window.GAME.weapon = weaponType;
    }
  }

  update() {
    if (!window.GAME || !window.GAME.player || !this.gameStarted) return;

    const player = window.GAME.player;
    
    // Actualizar barras de vida y maná
    this.updateHealthBar(player.hp, player.hpMax);
    this.updateManaBar(player.mana, player.manaMax);
    
    // Actualizar info del mapa
    this.updateMapInfo();
    
    // Actualizar arma actual si cambió
    if (window.GAME.weapon !== this.currentWeapon) {
      this.selectWeapon(window.GAME.weapon);
    }

    // Actualizar barra de boss si existe
    if (window.CURRENT_BOSS && !window.CURRENT_BOSS.dead) {
      this.updateBossBar(window.CURRENT_BOSS.hp, window.CURRENT_BOSS.hpMax);
    }
  }

  updateHealthBar(hp, hpMax) {
    const percentage = (hp / hpMax) * 100;
    const fill = document.getElementById('hpBarFill');
    const text = document.getElementById('hpText');
    
    if (fill) fill.style.width = `${percentage}%`;
    if (text) text.textContent = `${Math.round(hp)}/${hpMax}`;
    
    // Efecto de daño
    if (hp < this.lastHP) {
      this.flashDamage();
    }
    this.lastHP = hp;
  }

  updateManaBar(mana, manaMax) {
    const percentage = (mana / manaMax) * 100;
    const fill = document.getElementById('manaBarFill');
    const text = document.getElementById('manaText');
    
    if (fill) fill.style.width = `${percentage}%`;
    if (text) text.textContent = `${Math.round(mana)}/${manaMax}`;
    
    this.lastMana = mana;
  }

  updateMapInfo() {
    // Actualizar número de mapa
    const mapEl = document.getElementById('mapNumber');
    if (mapEl && window.BIOME !== undefined) {
      mapEl.textContent = window.BIOME + 1;
    }
    
    // Actualizar kills
    const killEl = document.getElementById('killCount');
    if (killEl && window.GAME) {
      killEl.textContent = window.GAME.killed || 0;
    }
    
    // Actualizar estado del boss
    const bossEl = document.getElementById('bossStatus');
    if (bossEl) {
      if (window.CURRENT_BOSS) {
        if (window.CURRENT_BOSS.dead) {
          bossEl.textContent = 'DEFEATED';
          bossEl.style.color = 'var(--retro-green)';
          bossEl.classList.remove('blink');
        } else {
          bossEl.textContent = 'ALIVE';
          bossEl.style.color = 'var(--retro-red)';
          bossEl.classList.add('blink');
        }
      } else {
        bossEl.textContent = 'WAITING';
        bossEl.style.color = 'var(--retro-text)';
        bossEl.classList.remove('blink');
      }
    }
    
    // Actualizar essence
    const essenceEl = document.getElementById('essenceCount');
    if (essenceEl && window.GAME) {
      essenceEl.textContent = window.GAME.points || 0;
    }
  }

  flashDamage() {
    const panels = document.querySelectorAll('.hud-panel-top-left');
    panels.forEach(panel => {
      panel.style.borderColor = 'var(--retro-red)';
      panel.style.boxShadow = '0 0 10px var(--retro-red)';
      
      setTimeout(() => {
        panel.style.borderColor = 'var(--retro-border)';
        panel.style.boxShadow = '2px 2px 0 var(--retro-shadow)';
      }, 200);
    });
  }

  createParticleEffect(element, particle) {
    const rect = element.getBoundingClientRect();
    const particleEl = document.createElement('div');
    particleEl.className = 'particle-effect';
    particleEl.textContent = particle;
    particleEl.style.left = rect.left + 'px';
    particleEl.style.top = rect.top + 'px';
    particleEl.style.position = 'fixed';
    particleEl.style.zIndex = '1000';
    particleEl.style.fontSize = '8px';
    particleEl.style.color = 'var(--retro-accent)';
    
    document.body.appendChild(particleEl);
    
    setTimeout(() => {
      particleEl.remove();
    }, 2000);
  }

  showRetroUI() {
    this.gameStarted = true;
    
    // Ocultar HUD original
    const originalTopbar = document.getElementById('topbar');
    const originalHud = document.getElementById('hud');
    
    if (originalTopbar) originalTopbar.classList.add('hidden');
    if (originalHud) originalHud.classList.add('hidden');
    
    // Mostrar HUD retro
    const gameHUD = document.getElementById('gameHUD');
    if (gameHUD) {
      gameHUD.classList.add('active');
    }
  }

  hideRetroUI() {
    this.gameStarted = false;
    
    // Mostrar HUD original
    const originalTopbar = document.getElementById('topbar');
    const originalHud = document.getElementById('hud');
    
    if (originalTopbar) originalTopbar.classList.remove('hidden');
    if (originalHud) originalHud.classList.remove('hidden');
    
    // Ocultar HUD retro
    const gameHUD = document.getElementById('gameHUD');
    if (gameHUD) {
      gameHUD.classList.remove('active');
    }
  }

  createBossBar(bossName, hp, hpMax) {
    // Remover barra anterior si existe
    const existingBar = document.querySelector('.boss-bar-container');
    if (existingBar) existingBar.remove();

    const bossContainer = document.createElement('div');
    bossContainer.className = 'boss-bar-container scanlines';
    bossContainer.innerHTML = `
      <div class="boss-name">${bossName.toUpperCase()}</div>
      <div class="boss-bar">
        <div class="boss-bar-fill" id="bossBarFill"></div>
      </div>
    `;
    
    const gameHUD = document.getElementById('gameHUD');
    if (gameHUD) {
      gameHUD.appendChild(bossContainer);
    }
    
    // Actualizar inmediatamente
    this.updateBossBar(hp, hpMax);
  }

  updateBossBar(hp, hpMax) {
    const fill = document.getElementById('bossBarFill');
    if (fill) {
      const percentage = (hp / hpMax) * 100;
      fill.style.width = `${percentage}%`;
    }
  }

  removeBossBar() {
    const bossBar = document.querySelector('.boss-bar-container');
    if (bossBar) {
      setTimeout(() => bossBar.remove(), 1000);
    }
  }
}

// Inicializar el sistema UI retro
let retroUI;

// Función para inicializar cuando el DOM esté listo
function initRetroUI() {
  retroUI = new RetroUIManager();
  retroUI.initializeRetroUI();
  
  // Loop de actualización
  setInterval(() => {
    if (retroUI) {
      retroUI.update();
    }
  }, 100);
  
  console.log('🎮 UI Retro activada!');
}

// Inicializar cuando esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initRetroUI);
} else {
  initRetroUI();
}

// Interceptar el inicio del juego para cambiar la UI
const originalBtnStartHandler = document.getElementById('btnStart');
if (originalBtnStartHandler) {
  originalBtnStartHandler.addEventListener('click', () => {
    setTimeout(() => {
      if (retroUI && window.GAME && window.GAME.running) {
        retroUI.showRetroUI();
      }
    }, 500);
  });
}

// Interceptar cuando el juego se pausa/termina
const originalEndOverlay = window.endOverlay;
if (typeof originalEndOverlay === 'function') {
  window.endOverlay = function(title, sub) {
    if (retroUI) retroUI.hideRetroUI();
    originalEndOverlay(title, sub);
  };
}

// Integración con el sistema de boss existente
if (typeof window.onBossDefeated === 'function') {
  const originalOnBossDefeated = window.onBossDefeated;
  window.onBossDefeated = function(boss) {
    if (retroUI) retroUI.removeBossBar();
    originalOnBossDefeated(boss);
  };
}

// Integración con spawn de boss
if (typeof window.spawnBoss === 'function') {
  const originalSpawnBoss = window.spawnBoss;
  window.spawnBoss = function() {
    originalSpawnBoss();
    if (retroUI && window.CURRENT_BOSS) {
      setTimeout(() => {
        retroUI.createBossBar('BOSS', window.CURRENT_BOSS.hp, window.CURRENT_BOSS.hpMax);
      }, 100);
    }
  };
}

// Monitor para detectar cuando el juego empieza
let gameStartMonitor = setInterval(() => {
  if (window.GAME && window.GAME.running && retroUI && !retroUI.gameStarted) {
    retroUI.showRetroUI();
  } else if (window.GAME && !window.GAME.running && retroUI && retroUI.gameStarted) {
    // Solo ocultar si realmente el juego se detuvo (no es pausa temporal)
    const startDiv = document.getElementById('start');
    const overlayDiv = document.getElementById('overlay');
    if ((startDiv && startDiv.classList.contains('show')) || 
        (overlayDiv && overlayDiv.classList.contains('show'))) {
      retroUI.hideRetroUI();
    }
  }
}, 500);

// Limpieza cuando se cierra la página
window.addEventListener('beforeunload', () => {
  if (gameStartMonitor) {
    clearInterval(gameStartMonitor);
  }
});
