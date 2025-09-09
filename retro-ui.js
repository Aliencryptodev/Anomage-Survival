// ===== PARCHE DE CORRECCIÓN UI - Agregar al final de retro-ui.js =====

// SOLUCIÓN INMEDIATA - Agregar este código al final del archivo retro-ui.js

// 1. Forzar ocultación de UI original
function forceHideOriginalUI() {
  const elementsToHide = [
    '#topbar',
    '#hud'
  ];
  
  elementsToHide.forEach(selector => {
    const el = document.querySelector(selector);
    if (el) {
      el.style.display = 'none !important';
      el.style.visibility = 'hidden !important';
      el.style.opacity = '0 !important';
    }
  });
}

// 2. Corregir z-index y posicionamiento
function fixUILayers() {
  const gameHUD = document.getElementById('gameHUD');
  if (gameHUD) {
    gameHUD.style.zIndex = '999999';
    gameHUD.style.position = 'fixed';
    gameHUD.style.pointerEvents = 'none';
    
    // Habilitar pointer events solo en elementos interactivos
    const interactiveElements = gameHUD.querySelectorAll('.d2-skill-slot, .d2-orb');
    interactiveElements.forEach(el => {
      el.style.pointerEvents = 'auto';
    });
  }
  
  // Asegurar que el canvas esté visible
  const canvas = document.getElementById('game');
  if (canvas) {
    canvas.style.zIndex = '1';
    canvas.style.position = 'relative';
    canvas.style.display = 'block';
    canvas.style.visibility = 'visible';
    canvas.style.opacity = '1';
  }
}

// 3. Reinicializar UI correctamente
function reinitializeUI() {
  // Limpiar UI anterior
  const existingHUD = document.getElementById('gameHUD');
  if (existingHUD) {
    existingHUD.remove();
  }
  
  // Recrear UI
  if (diablo2UI) {
    diablo2UI.hudCreated = false;
    diablo2UI.gameStarted = false;
    diablo2UI.initializeDiablo2UI();
  }
}

// 4. Monitor mejorado sin conflictos
function createImprovedMonitor() {
  // Limpiar monitor anterior
  if (window.gameStartMonitor) {
    clearInterval(window.gameStartMonitor);
  }
  
  let wasRunning = false;
  
  window.gameStartMonitor = setInterval(() => {
    const isRunning = window.GAME && window.GAME.running;
    const hasStartDiv = document.getElementById('start')?.classList.contains('show');
    const hasOverlay = document.getElementById('overlay')?.classList.contains('show');
    
    // Juego empezó
    if (isRunning && !wasRunning && !hasStartDiv && !hasOverlay) {
      console.log('🎮 Activando UI Diablo 2...');
      forceHideOriginalUI();
      fixUILayers();
      
      if (diablo2UI && !diablo2UI.gameStarted) {
        diablo2UI.showDiablo2UI();
      }
      wasRunning = true;
    }
    
    // Juego se detuvo
    if (!isRunning && wasRunning) {
      console.log('🛑 Ocultando UI Diablo 2...');
      if (diablo2UI && diablo2UI.gameStarted) {
        diablo2UI.hideDiablo2UI();
      }
      wasRunning = false;
    }
    
    // Pantallas de menú
    if (hasStartDiv || hasOverlay) {
      if (diablo2UI && diablo2UI.gameStarted) {
        diablo2UI.hideDiablo2UI();
      }
      wasRunning = false;
    }
  }, 250); // Reducir frecuencia para evitar lag
}

// 5. Función de reset completo
function resetUICompletely() {
  console.log('🔄 Reseteando UI completamente...');
  
  // Limpiar todo
  const gameHUD = document.getElementById('gameHUD');
  if (gameHUD) gameHUD.remove();
  
  // Mostrar UI original
  const originalTopbar = document.getElementById('topbar');
  const originalHud = document.getElementById('hud');
  
  if (originalTopbar) {
    originalTopbar.style.display = '';
    originalTopbar.style.visibility = '';
    originalTopbar.style.opacity = '';
    originalTopbar.classList.remove('hidden');
  }
  
  if (originalHud) {
    originalHud.style.display = '';
    originalHud.style.visibility = '';
    originalHud.style.opacity = '';
    originalHud.classList.remove('hidden');
  }
  
  // Reinicializar
  if (diablo2UI) {
    diablo2UI.hudCreated = false;
    diablo2UI.gameStarted = false;
    setTimeout(() => {
      diablo2UI.initializeDiablo2UI();
      createImprovedMonitor();
    }, 100);
  }
}

// 6. Aplicar correcciones inmediatamente
setTimeout(() => {
  console.log('🔧 Aplicando parches de corrección...');
  
  forceHideOriginalUI();
  fixUILayers();
  createImprovedMonitor();
  
  // Comando de emergencia accesible desde consola
  window.resetUI = resetUICompletely;
  window.fixUI = () => {
    forceHideOriginalUI();
    fixUILayers();
  };
  
  console.log('✅ Parches aplicados. Comandos disponibles:');
  console.log('   resetUI() - Reset completo');
  console.log('   fixUI() - Arreglo rápido');
  
}, 1000);

// 7. Override del showDiablo2UI para mayor control
if (diablo2UI) {
  const originalShow = diablo2UI.showDiablo2UI.bind(diablo2UI);
  const originalHide = diablo2UI.hideDiablo2UI.bind(diablo2UI);
  
  diablo2UI.showDiablo2UI = function() {
    console.log('📱 Mostrando UI Diablo 2...');
    forceHideOriginalUI();
    originalShow();
    fixUILayers();
  };
  
  diablo2UI.hideDiablo2UI = function() {
    console.log('📱 Ocultando UI Diablo 2...');
    originalHide();
    
    // Restaurar UI original solo si es necesario
    const startDiv = document.getElementById('start');
    const overlayDiv = document.getElementById('overlay');
    
    if (startDiv?.classList.contains('show') || overlayDiv?.classList.contains('show')) {
      const originalTopbar = document.getElementById('topbar');
      const originalHud = document.getElementById('hud');
      
      if (originalTopbar) {
        originalTopbar.style.display = '';
        originalTopbar.classList.remove('hidden');
      }
      if (originalHud) {
        originalHud.style.display = '';
        originalHud.classList.remove('hidden');
      }
    }
  };
}
