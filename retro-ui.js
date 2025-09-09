// ===== SISTEMA UI DIABLO 2 COMPLETO - JavaScript =====

class Diablo2UIManager {
  constructor() {
    this.weaponIcons = {
      fire: '🔥',
      light: '⚡',
      ice: '❄️',
      dark: '🌑'
    };
    this.weaponNames = {
      fire: 'FIREBALL',
      light: 'LIGHTNING',
      ice: 'ICE SHARD',
      dark: 'DARK MAGIC'
    };
    this.currentWeapon = 'fire';
    this.lastHP = 100;
    this.lastMana = 50;
    this.gameStarted = false;
    this.hudCreated = false;
  }

  initializeDiablo2UI() {
    if (this.hudCreated) return;
    
    // Crear contenedor principal del HUD
    const hudContainer = document.createElement('div');
    hudContainer.id = 'gameHUD';
    hudContainer.className = 'd2-enter-animation';
    document.body.appendChild(hudContainer);

    // Orbes de vida y maná (izquierda)
    const leftOrbPanel = document.createElement('div');
    leftOrbPanel.className = 'd2-orb-panel left';
    leftOrbPanel.innerHTML = `
      <div class="d2-orb health" title="Life">
        <div class="d2-orb-fill" id="healthOrbFill"></div>
        <div class="d2-orb-text" id="healthOrbText">100/100</div>
      </div>
    `;
    hudContainer.appendChild(leftOrbPanel);

    // Orbe de maná (derecha)
    const rightOrbPanel = document.createElement('div');
    rightOrbPanel.className = 'd2-orb-panel right';
    rightOrbPanel.innerHTML = `
      <div class="d2-orb mana" title="Mana">
        <div class="d2-orb-fill" id="manaOrbFill"></div>
        <div class="d2-orb-text" id="manaOrbText">50/50</div>
      </div>
    `;
    hudContainer.appendChild(rightOrbPanel);

    // Panel central superior - Info del juego
    const infoPanel = document.createElement('div');
    infoPanel.className = 'd2-info-panel';
    infoPanel.innerHTML = `
      <div class="d2-title">SANCTUARY - SECTOR <span id="d2MapNumber">1</span></div>
      
      <div class="d2-stats-row">
        <span class="d2-stat-label">Demons Slain:</span>
        <span class="d2-stat-value" id="d2KillCount">0</span><span style="color: #666;">/50</span>
      </div>
      
      <div class="d2-stats-row">
        <span class="d2-stat-label">Prime Evil:</span>
        <span class="d2-stat-value" id="d2BossStatus">DORMANT</span>
      </div>
      
      <div class="d2-stats-row">
        <span class="d2-stat-label">Soul Essence:</span>
        <span class="d2-stat-value special" id="d2EssenceCount">0</span>
      </div>
    `;
    hudContainer.appendChild(infoPanel);

    // Cinturón de habilidades inferior
    const skillBelt = document.createElement('div');
    skillBelt.className = 'd2-skill-belt';
    skillBelt.innerHTML = `
      <div class="d2-skill-slot active" data-weapon="fire" data-key="1" title="Fireball">
        <span class="d2-skill-icon">🔥</span>
        <div class="d2-skill-key">1</div>
        <div class="d2-skill-level" id="fireLevel">1</div>
      </div>
      
      <div class="d2-skill-slot" data-weapon="light" data-key="2" title="Lightning Bolt">
        <span class="d2-skill-icon">⚡</span>
        <div class="d2-skill-key">2</div>
        <div class="d2-skill-level" id="lightLevel">1</div>
      </div>
      
      <div class="d2-skill-slot" data-weapon="ice" data-key="3" title="Ice Shard">
        <span class="d2-skill-icon">❄️</span>
        <div class="d2-skill-key">3</div>
        <div class="d2-skill-level" id="iceLevel">1</div>
      </div>
      
      <div class="d2-skill-slot" data-weapon="dark" data-key="4" title="Dark Magic">
        <span class="d2-skill-icon">🌑</span>
        <div class="d2-skill-key">4</div>
        <div class="d2-skill-level" id="darkLevel">1</div>
      </div>
      
      <div class="d2-belt-separator"></div>
      
      <div class="d2-belt-info">
        <div class="d2-belt-title">ACTIVE SPELL</div>
        <div class="d2-belt-value" id="d2ActiveSpell">FIREBALL</div>
      </div>
    `;
    hudContainer.appendChild(skillBelt);

    // Eventos de selección de habilidades
    this.setupSkillSelection();
    
    this.hudCreated = true;
  }

  setupSkillSelection() {
    const skillSlots = document.querySelectorAll('.d2-skill-slot');
    
    skillSlots.forEach(slot => {
      slot.addEventListener('click', () => {
        const weapon = slot.dataset.weapon;
        this.selectWeapon(weapon);
        this.createSpellEffect(slot);
      });

      // Efectos de hover
      slot.addEventListener('mouseenter', () => {
        this.playHoverSound();
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
        const slot = document.querySelector(`[data-weapon="${keyMap[e.key]}"]`);
        if (slot) this.createSpellEffect(slot);
      }
    });
  }

  selectWeapon(weaponType) {
    // Actualizar UI
    document.querySelectorAll('.d2-skill-slot').forEach(slot => {
      slot.classList.remove('active');
    });
    
    const activeSlot = document.querySelector(`[data-weapon="${weaponType}"]`);
    if (activeSlot) {
      activeSlot.classList.add('active');
    }

    this.currentWeapon = weaponType;
    
    // Actualizar niveles de habilidades
    this.updateSkillLevels();
    
    // Actualizar nombre del hechizo activo
    const activeSpellEl = document.getElementById('d2ActiveSpell');
    if (activeSpellEl) {
      activeSpellEl.textContent = this.weaponNames[weaponType];
    }

    // Sincronizar con el juego original
    if (window.GAME) {
      window.GAME.weapon = weaponType;
    }
  }

  updateSkillLevels() {
    ['fire', 'light', 'ice', 'dark'].forEach(weapon => {
      const level = (window.GAME && window.GAME.upgrades) ? window.GAME.upgrades[weapon] || 1 : 1;
      const levelEl = document.getElementById(`${weapon}Level`);
      if (levelEl) {
        levelEl.textContent = level;
        
        // Cambiar color según el nivel
        if (level >= 10) {
          levelEl.style.background = 'var(--d2-orange)';
        } else if (level >= 5) {
          levelEl.style.background = 'var(--d2-blue)';
        } else {
          levelEl.style.background = 'var(--d2-red)';
        }
      }
    });
  }

  update() {
    if (!window.GAME || !window.GAME.player || !this.gameStarted) return;

    const player = window.GAME.player;
    
    // Actualizar orbes de vida y maná
    this.updateHealthOrb(player.hp, player.hpMax);
    this.updateManaOrb(player.mana, player.manaMax);
    
    // Actualizar info del juego
    this.updateGameInfo();
    
    // Actualizar arma actual si cambió
    if (window.GAME.weapon !== this.currentWeapon) {
      this.selectWeapon(window.GAME.weapon);
    }

    // Actualizar niveles de habilidades
    this.updateSkillLevels();

    // Actualizar barra de boss si existe
    if (window.CURRENT_BOSS && !window.CURRENT_BOSS.dead) {
      this.updateBossBar(window.CURRENT_BOSS.hp, window.CURRENT_BOSS.hpMax);
    }
  }

  updateHealthOrb(hp, hpMax) {
    const percentage = (hp / hpMax) * 100;
    const fill = document.getElementById('healthOrbFill');
    const text = document.getElementById('healthOrbText');
    
    if (fill) fill.style.height = `${percentage}%`;
    if (text) text.textContent = `${Math.round(hp)}/${hpMax}`;
    
    // Efecto de daño
    if (hp < this.lastHP) {
      this.flashDamage();
      this.createDamageParticles();
    }
    
    // Cambiar color según el porcentaje de vida
    if (fill) {
      if (percentage <= 25) {
        fill.style.background = 'linear-gradient(0deg, #990000 0%, #cc0000 50%, #ff3333 100%)';
      } else if (percentage <= 50) {
        fill.style.background = 'linear-gradient(0deg, #cc2936 0%, #ff4444 50%, #ff6666 100%)';
      } else {
        fill.style.background = 'linear-gradient(0deg, #cc2936 0%, #ff4444 30%, #ff6666 60%, #ffaaaa 100%)';
      }
    }
    
    this.lastHP = hp;
  }

  updateManaOrb(mana, manaMax) {
    const percentage = (mana / manaMax) * 100;
    const fill = document.getElementById('manaOrbFill');
    const text = document.getElementById('manaOrbText');
    
    if (fill) fill.style.height = `${percentage}%`;
    if (text) text.textContent = `${Math.round(mana)}/${manaMax}`;
    
    this.lastMana = mana;
  }

  updateGameInfo() {
    // Actualizar número de sector
    const mapEl = document.getElementById('d2MapNumber');
    if (mapEl && window.BIOME !== undefined) {
      mapEl.textContent = window.BIOME + 1;
    }
    
    // Actualizar kills
    const killEl = document.getElementById('d2KillCount');
    if (killEl && window.GAME) {
      killEl.textContent = window.GAME.killed || 0;
    }
    
    // Actualizar estado del boss
    const bossEl = document.getElementById('d2BossStatus');
    if (bossEl) {
      if (window.CURRENT_BOSS) {
        if (window.CURRENT_BOSS.dead) {
          bossEl.textContent = 'VANQUISHED';
          bossEl.className = 'd2-stat-value special';
          bossEl.classList.remove('danger');
        } else {
          bossEl.textContent = 'AWAKENED';
          bossEl.className = 'd2-stat-value danger';
        }
      } else {
        bossEl.textContent = 'DORMANT';
        bossEl.className = 'd2-stat-value';
      }
    }
    
    // Actualizar essence
    const essenceEl = document.getElementById('d2EssenceCount');
    if (essenceEl && window.GAME) {
      essenceEl.textContent = window.GAME.points || 0;
    }
  }

  flashDamage() {
    const healthOrb = document.querySelector('.d2-orb.health');
    if (healthOrb) {
      healthOrb.style.boxShadow = `
        inset 0 0 20px rgba(255,0,0,0.8),
        0 0 30px var(--d2-red),
        0 0 50px rgba(255,0,0,0.6)
      `;
      
      setTimeout(() => {
        healthOrb.style.boxShadow = `
          inset 0 0 20px rgba(0,0,0,0.5),
          var(--d2-glow) var(--d2-border),
          0 0 30px rgba(0,0,0,0.8)
        `;
      }, 300);
    }
  }

  createDamageParticles() {
    const healthOrb = document.querySelector('.d2-orb.health');
    if (!healthOrb) return;

    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        const particle = document.createElement('div');
        particle.className = 'd2-particle';
        particle.textContent = '💥';
        
        const rect = healthOrb.getBoundingClientRect();
        particle.style.left = (rect.left + Math.random() * rect.width) + 'px';
        particle.style.top = (rect.top + Math.random() * rect.height) + 'px';
        
        document.body.appendChild(particle);
        
        setTimeout(() => particle.remove(), 3000);
      }, i * 100);
    }
  }

  createSpellEffect(slot) {
    const rect = slot.getBoundingClientRect();
    const particle = document.createElement('div');
    particle.className = 'd2-particle';
    particle.textContent = '✨';
    particle.style.left = (rect.left + rect.width / 2) + 'px';
    particle.style.top = (rect.top + rect.height / 2) + 'px';
    particle.style.color = 'var(--d2-orange)';
    
    document.body.appendChild(particle);
    setTimeout(() => particle.remove(), 3000);
  }

  playHoverSound() {
    // Simular efecto de sonido con vibración visual
  }

  showDiablo2UI() {
    this.gameStarted = true;
    
    // Ocultar HUD original
    const originalTopbar = document.getElementById('topbar');
    const originalHud = document.getElementById('hud');
    
    if (originalTopbar) originalTopbar.classList.add('hidden');
    if (originalHud) originalHud.classList.add('hidden');
    
    // Mostrar HUD Diablo 2
    const gameHUD = document.getElementById('gameHUD');
    if (gameHUD) {
      gameHUD.classList.add('active');
    }
  }

  hideDiablo2UI() {
    this.gameStarted = false;
    
    // Mostrar HUD original
    const originalTopbar = document.getElementById('topbar');
    const originalHud = document.getElementById('hud');
    
    if (originalTopbar) originalTopbar.classList.remove('hidden');
    if (originalHud) originalHud.classList.remove('hidden');
    
    // Ocultar HUD Diablo 2
    const gameHUD = document.getElementById('gameHUD');
    if (gameHUD) {
      gameHUD.classList.remove('active');
    }
  }

  createBossBar(bossName, hp, hpMax) {
    // Remover barra anterior si existe
    const existingBar = document.querySelector('.d2-boss-container');
    if (existingBar) existingBar.remove();

    const bossContainer = document.createElement('div');
    bossContainer.className = 'd2-boss-container';
    bossContainer.innerHTML = `
      <div class="d2-boss-name">${bossName.toUpperCase()}</div>
      <div class="d2-boss-bar">
        <div class="d2-boss-fill" id="d2BossFill"></div>
      </div>
    `;
    
    const gameHUD = document.getElementById('gameHUD');
    if (gameHUD) {
      gameHUD.appendChild(bossContainer);
    }
    
    // Actualizar inmediatamente
    this.updateBossBar(hp, hpMax);
    
    // Crear efecto de aparición épica
    this.createBossAppearanceEffect();
  }

  updateBossBar(hp, hpMax) {
    const fill = document.getElementById('d2BossFill');
    if (fill) {
      const percentage = (hp / hpMax) * 100;
      fill.style.width = `${percentage}%`;
    }
  }

  removeBossBar() {
    const bossBar = document.querySelector('.d2-boss-container');
    if (bossBar) {
      // Efecto de desaparición
      bossBar.style.animation = 'fadeOut 2s ease-out forwards';
      setTimeout(() => bossBar.remove(), 2000);
    }
  }

  createBossAppearanceEffect() {
    // Crear múltiples partículas para la aparición del boss
    for (let i = 0; i < 10; i++) {
      setTimeout(() => {
        const particle = document.createElement('div');
        particle.className = 'd2-particle';
        particle.textContent = ['💀', '⚡', '🔥', '💥'][Math.floor(Math.random() * 4)];
        particle.style.left = (window.innerWidth / 2 + (Math.random() - 0.5) * 200) + 'px';
        particle.style.top = (150 + Math.random() * 100) + 'px';
        particle.style.color = 'var(--d2-red)';
        particle.style.fontSize = '20px';
        
        document.body.appendChild(particle);
        setTimeout(() => particle.remove(), 3000);
      }, i * 100);
    }
  }

  createPickupEffect(type, x, y) {
    const effects = {
      fire: '🔥',
      light: '⚡',
      ice: '❄️',
      dark: '🌑',
      potion_hp: '💊',
      potion_mana: '🧪'
    };

    const particle = document.createElement('div');
    particle.className = 'd2-particle';
    particle.textContent = effects[type] || '✨';
    particle.style.left = x + 'px';
    particle.style.top = y + 'px';
    particle.style.fontSize = '16px';
    
    document.body.appendChild(particle);
    setTimeout(() => particle.remove(), 3000);
  }
}

// Inicializar el sistema UI Diablo 2
let diablo2UI;

function initDiablo2UI() {
  diablo2UI = new Diablo2UIManager();
  diablo2UI.initializeDiablo2UI();
  
  // Loop de actualización
  setInterval(() => {
    if (diablo2UI) {
      diablo2UI.update();
    }
  }, 100);
  
  console.log('⚔️ UI Diablo 2 activada!');
}

// Inicializar cuando esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDiablo2UI);
} else {
  initDiablo2UI();
}

// Interceptar el inicio del juego
document.addEventListener('DOMContentLoaded', () => {
  const btnStart = document.getElementById('btnStart');
  if (btnStart) {
    btnStart.addEventListener('click', () => {
      setTimeout(() => {
        if (diablo2UI && window.GAME && window.GAME.running) {
          diablo2UI.showDiablo2UI();
        }
      }, 500);
    });
  }
});

// Integración con el sistema de boss existente
const originalOnBossDefeated = window.onBossDefeated;
if (typeof originalOnBossDefeated === 'function') {
  window.onBossDefeated = function(boss) {
    if (diablo2UI) diablo2UI.removeBossBar();
    originalOnBossDefeated(boss);
  };
}

const originalSpawnBoss = window.spawnBoss;
if (typeof originalSpawnBoss === 'function') {
  window.spawnBoss = function() {
    originalSpawnBoss();
    if (diablo2UI && window.CURRENT_BOSS) {
      setTimeout(() => {
        diablo2UI.createBossBar('PRIME EVIL', window.CURRENT_BOSS.hp, window.CURRENT_BOSS.hpMax);
      }, 100);
    }
  };
}

// Monitor del estado del juego
let gameStartMonitor = setInterval(() => {
  if (window.GAME && window.GAME.running && diablo2UI && !diablo2UI.gameStarted) {
    diablo2UI.showDiablo2UI();
  } else if (window.GAME && !window.GAME.running && diablo2UI && diablo2UI.gameStarted) {
    const startDiv = document.getElementById('start');
    const overlayDiv = document.getElementById('overlay');
    if ((startDiv && startDiv.classList.contains('show')) || 
        (overlayDiv && overlayDiv.classList.contains('show'))) {
      diablo2UI.hideDiablo2UI();
    }
  }
}, 500);

// Integración con pickups
const originalHandlePickups = window.handlePickups;
if (typeof originalHandlePickups === 'function') {
  window.handlePickups = function() {
    const result = originalHandlePickups();
    
    if (diablo2UI && window.GAME && window.GAME.pickups) {
      window.GAME.pickups.forEach(pickup => {
        const playerPos = window.GAME.player;
        if (playerPos && Math.abs(pickup.x - playerPos.x) < 50 && Math.abs(pickup.y - playerPos.y) < 50) {
          diablo2UI.createPickupEffect(pickup.kind, pickup.x, pickup.y);
        }
      });
    }
    
    return result;
  };
}

// Integración con fin de juego
const originalEndOverlay = window.endOverlay;
if (typeof originalEndOverlay === 'function') {
  window.endOverlay = function(title, sub) {
    if (diablo2UI) diablo2UI.hideDiablo2UI();
    originalEndOverlay(title, sub);
  };
}

// Añadir estilos adicionales
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeOut {
    0% { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(0.8); }
  }
`;
document.head.appendChild(style);

// Limpieza al cerrar
window.addEventListener('beforeunload', () => {
  if (gameStartMonitor) {
    clearInterval(gameStartMonitor);
  }
});
