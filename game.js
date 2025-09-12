/* =========================================================
   ANOMA SURVIVAL – núcleo del juego (REPARADO)
   ========================================================= */

/* ===== Canvas & DOM ===== */
const VIRT_W = 960, VIRT_H = 540;
const cv = document.getElementById('game');
const ctx = cv.getContext('2d', {alpha: false}); 
ctx.imageSmoothingEnabled = false;

const progressEl = document.getElementById("progress");
const biomeEl = document.getElementById("biome");
const hpEl = document.getElementById("hp");
const killsEl = document.getElementById("kills");
const bossEl = document.getElementById("boss");
const ptsEl = document.getElementById("pts");
const wnameEl = document.getElementById("wname");
const wlvEl = document.getElementById("wlv");
const toastEl = document.getElementById('toast');

const warn = document.getElementById('warn'); 
const btnPick = document.getElementById('btn-pick'); 
const filePick = document.getElementById('file-pick');
const startDiv = document.getElementById('start'); 
const btnStart = document.getElementById('btnStart');
const chosenNameEl = document.getElementById('chosenName');

/* ===== Selección de personaje ===== */
let SELECTED_HERO_KEY = 'anomage';
let SELECTED_HERO_NAME = 'ANOMAGE';

/* ===== Config ===== */
const CHUNK_SIZE = 2048;
const CAMERA = { x: 1024, y: 1024, lerp: 0.15 };
const WAVE_KILL_TARGET = 50;

/* ===== Mostrar/ocultar HUD pintado en el canvas (el viejo) ===== */
const SHOW_CANVAS_HUD = false;

const BIOMES = [
  { key: "forest",   name: "Bosque",   ground: "assets/maps/ground_forest.png",   bossKey: "boss_ent",   music: "assets/audio/music_forest.mp3" },
  { key: "cemetery", name: "Cementerio", ground: "assets/maps/ground_swamp.png",    bossKey: "boss_necro", music: "assets/audio/music_cemetery.mp3" },
  { key: "dungeon",  name: "Mazmorra", ground: "assets/maps/ground_dungeon.png",  bossKey: "boss_golem", music: "assets/audio/music_dungeon.mp3" },
  { key: "desert",   name: "Desierto", ground: "assets/maps/ground_desert.png",   bossKey: "boss_lich",  music: "assets/audio/music_desert.mp3" },
  { key: "volcano",  name: "Volcán",   ground: "assets/maps/ground_volcano.png",  bossKey: "boss_demon", music: "assets/audio/music_volcano.mp3" }
];

const PROPS_DEF = {
  forest: [
    { src: "assets/props/tree_big.png",   w: 128, h: 128, solid: true, count: 26, minDist: 140 },
    { src: "assets/props/tree_small.png", w: 64,  h: 64,  solid: true, count: 22, minDist: 110 },
    { src: "assets/props/rock.png",       w: 64,  h: 64,  solid: true, count: 24, minDist: 90  },
    { src: "assets/props/mushroom.png",   w: 64,  h: 64,  solid: false, count: 14, minDist: 80 }
  ],
  cemetery: [{ src: "assets/props/rock.png", w: 64, h: 64, solid: true, count: 32, minDist: 90 }],
  dungeon:  [{ src: "assets/props/rock.png", w: 64, h: 64, solid: true, count: 24, minDist: 90 }],
  desert:   [{ src: "assets/props/log.png",  w: 96, h: 64, solid: true, count: 20, minDist: 110 }],
  volcano:  [{ src: "assets/props/rock.png", w: 64, h: 64, solid: true, count: 26, minDist: 95 }]
};

/* ===== RPG: mana y pociones ===== */
const MANA_REGEN_PER_SEC = 5;     // mana que regenera por segundo
const SHOT_MANA_COST = 2;          // coste por disparo
const POTION_HP_AMOUNT = 35;
const POTION_MANA_AMOUNT = 30;
const DROP_POTION_CHANCE = 0.20;   // 20% de drop de poción si no hay gema

/* ===== Audio (opcional, si faltan archivos no rompe) ===== */
const SFX = {
  fire: "assets/audio/fire.wav",
  light: "assets/audio/lightning.wav",
  ice: "assets/audio/ice.wav",
  dark: "assets/audio/dark.wav",
  hit: "assets/audio/hit.wav",
  pickup: "assets/audio/pickup.wav",
  portal: "assets/audio/portal.wav",
  bossdeath: "assets/audio/boss_death.wav"
};

let bgm = null; // música actual

function playSfx(name, vol = 0.8) { 
  const src = SFX[name]; 
  if (!src) return; 
  const a = new Audio(); 
  a.src = src; 
  a.volume = vol; 
  a.play().catch(() => {}); 
}

function playMusic(src) { 
  if (!src) return; 
  if (bgm) { 
    bgm.pause(); 
    bgm = null; 
  } 
  bgm = new Audio(src); 
  bgm.loop = true; 
  bgm.volume = 0.35; 
  bgm.play().catch(() => {}); 
}

/* ===== Estado general ===== */
let BIOME = 0, ATLAS = null;
const WORLD = {propsImgs: new Map(), chunks: new Map()};
let GAME = {
  cache: null, 
  player: null, 
  enemies: [], 
  projectiles: [], 
  pickups: [], 
  portal: null, 
  particles: [],
  running: false, 
  killed: 0, 
  points: 0,
  upgrades: { fire: 1, light: 1, ice: 1, dark: 1 },
  weapon: 'fire'
};
let CURRENT_BOSS = null;

/* === Exponer estado al objeto window para overlays externos === */
try {
  Object.defineProperty(window, 'GAME', {
    get: () => GAME,
    configurable: true
  });
  Object.defineProperty(window, 'BIOME', {
    get: () => BIOME,
    set: v => { BIOME = v; },
    configurable: true
  });
  Object.defineProperty(window, 'CURRENT_BOSS', {
    get: () => CURRENT_BOSS,
    set: v => { CURRENT_BOSS = v; },
    configurable: true
  });
} catch(e) {
  // entornos sin window
}

/* ===== Input ===== */
const Input = {keys: new Set(), mouse: {x: VIRT_W/2, y: VIRT_H/2, down: false}};
window.addEventListener('keydown', e => Input.keys.add(e.key.toLowerCase()));
window.addEventListener('keyup', e => Input.keys.delete(e.key.toLowerCase()));
cv.addEventListener('mousemove', e => {
  const r = cv.getBoundingClientRect();
  Input.mouse.x = (e.clientX - r.left) * (cv.width / r.width);
  Input.mouse.y = (e.clientY - r.top) * (cv.height / r.height);
});
cv.addEventListener('mousedown', () => Input.mouse.down = true); 
window.addEventListener('mouseup', () => Input.mouse.down = false);

/* ===== Utils ===== */
function lerp(a, b, t) { return a + (b - a) * t; }
function dist2(ax, ay, bx, by) { 
  const dx = ax - bx, dy = ay - by; 
  return dx * dx + dy * dy; 
}
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

function toast(msg) { 
  toastEl.textContent = msg; 
  toastEl.classList.add('show'); 
  clearTimeout(toastEl._t); 
  toastEl._t = setTimeout(() => toastEl.classList.remove('show'), 1300); 
}

function makeRng(seed) {
  let s = seed | 0;
  return () => ((s ^= s << 13, s ^= s >>> 17, s ^= s << 5) >>> 0) / 4294967296;
}

function rngRange(r, a, b) { return a + r() * (b - a); }
function worldToChunk(x, y) { return {cx: Math.floor(x/CHUNK_SIZE), cy: Math.floor(y/CHUNK_SIZE)}; }

function placeholder(text = "MISS") {
  const c = document.createElement('canvas');
  c.width = 64; 
  c.height = 64;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.fillStyle = "#1d1f27";
  g.fillRect(0, 0, 64, 64);
  g.strokeStyle = "#4f46e5";
  g.lineWidth = 3;
  g.strokeRect(3, 3, 58, 58);
  g.fillStyle = "#c7d2fe";
  g.font = "bold 10px monospace";
  g.fillText(text, 10, 36);
  const im = new Image();
  im.src = c.toDataURL();
  return im;
}

/* ===== Sprites.json (carga con fallback local) ===== */
function normalizeAtlasPaths(json) {
  const out = {}; 
  for (const g in json) { 
    out[g] = {}; 
    for (const a in json[g]) { 
      out[g][a] = json[g][a].map(p => p.startsWith("assets/") ? p : ("assets/" + p)); 
    } 
  } 
  return out;
}

async function tryFetchSpritesJson() { 
  const res = await fetch("assets/Sprites.json", {cache: "no-store"}); 
  if (!res.ok) throw new Error("HTTP " + res.status); 
  return await res.json(); 
}

function defaultAtlasJson() {
  return {
    "anomage": {
      "idle": ["Sprites/image/mage_idle_1.png", "Sprites/image/mage_idle_2.png"],
      "walk_down": ["Sprites/image/mage_down_1.png", "Sprites/image/mage_down_2.png", "Sprites/image/mage_down_3.png", "Sprites/image/mage_down_4.png"],
      "walk_up": ["Sprites/image/mage_up_1.png", "Sprites/image/mage_up_2.png", "Sprites/image/mage_up_3.png", "Sprites/image/mage_up_4.png"],
      "walk_left": ["Sprites/image/mage_left_1.png", "Sprites/image/mage_left_2.png", "Sprites/image/mage_left_3.png", "Sprites/image/mage_left_4.png"],
      "walk_right": ["Sprites/image/mage_right_1.png", "Sprites/image/mage_right_2.png", "Sprites/image/mage_right_3.png", "Sprites/image/mage_right_4.png"]
    },
    "shrimp": {
      "idle": ["Sprites/shrimp_player/shrimp_idle_1.png", "Sprites/shrimp_player/shrimp_idle_2.png"],
      "walk_down": ["Sprites/shrimp_player/shrimp_down_1.png", "Sprites/shrimp_player/shrimp_down_2.png", "Sprites/shrimp_player/shrimp_down_3.png", "Sprites/shrimp_player/shrimp_down_4.png"],
      "walk_up": ["Sprites/shrimp_player/shrimp_up_1.png", "Sprites/shrimp_player/shrimp_up_2.png", "Sprites/shrimp_player/shrimp_up_3.png", "Sprites/shrimp_player/shrimp_up_4.png"],
      "walk_left": ["Sprites/shrimp_player/shrimp_left_1.png", "Sprites/shrimp_player/shrimp_left_2.png", "Sprites/shrimp_player/shrimp_left_3.png", "Sprites/shrimp_player/shrimp_left_4.png"],
      "walk_right": ["Sprites/shrimp_player/shrimp_right_1.png", "Sprites/shrimp_player/shrimp_right_2.png", "Sprites/shrimp_player/shrimp_right_3.png", "Sprites/shrimp_player/shrimp_right_4.png"]
    },
    "spells": {
      "fire": ["Sprites/image_spells/fireball_1.png", "Sprites/image_spells/fireball_2.png", "Sprites/image_spells/fireball_3.png", "Sprites/image_spells/fireball_4.png"],
      "light": ["Sprites/image_spells/lightning_1.png", "Sprites/image_spells/lightning_2.png", "Sprites/image_spells/lightning_3.png", "Sprites/image_spells/lightning_4.png"],
      "ice": ["Sprites/image_spells/ice_shard_1.png", "Sprites/image_spells/ice_shard_2.png", "Sprites/image_spells/ice_shard_3.png", "Sprites/image_spells/ice_shard_4.png"],
      "dark": ["Sprites/image_spells/dark_blast_1.png", "Sprites/image_spells/dark_blast_2.png", "Sprites/image_spells/dark_blast_3.png", "Sprites/image_spells/dark_blast_4.png"]
    },
    "enemies": {
      "skeleton": ["Sprites/enemies/skeleton/skeleton_walk_1.png", "Sprites/enemies/skeleton/skeleton_walk_2.png"],
      "orc": ["Sprites/enemies/orc/orc_walk_1.png", "Sprites/enemies/orc/orc_walk_2.png"],
      "ghost": ["Sprites/enemies/ghost/ghost_float_1.png", "Sprites/enemies/ghost/ghost_float_2.png"],
      "bat": ["Sprites/enemies/bat/bat_fly_1.png", "Sprites/enemies/bat/bat_fly_2.png"],
      "shrimp": ["Sprites/enemies/shrimp/shrimp_walk_1.png", "Sprites/enemies/shrimp/shrimp_walk_2.png"]
    },
    "boss_ent": {
      "idle": ["Sprites/boss_ent/boss_ent_idle1.png", "Sprites/boss_ent/boss_ent_idle2.png"],
      "attack": ["Sprites/boss_ent/boss_ent_attack1.png", "Sprites/boss_ent/boss_ent_attack2.png"],
      "hurt": ["Sprites/boss_ent/boss_ent_hurt.png"],
      "death": ["Sprites/boss_ent/boss_ent_death.png"]
    },
    "boss_necro": {
      "idle": ["Sprites/boss_necro/boss_necro_idle1.png", "Sprites/boss_necro/boss_necro_idle2.png"],
      "attack": ["Sprites/boss_necro/boss_necro_attack1.png", "Sprites/boss_necro/boss_necro_attack2.png"],
      "hurt": ["Sprites/boss_necro/boss_necro_hurt.png"],
      "death": ["Sprites/boss_necro/boss_necro_death.png"]
    },
    "boss_golem": {
      "idle": ["Sprites/boss_golem/boss_golem_idle1.png", "Sprites/boss_golem/boss_golem_idle2.png"],
      "attack": ["Sprites/boss_golem/boss_golem_attack1.png", "Sprites/boss_golem/boss_golem_attack2.png"],
      "hurt": ["Sprites/boss_golem/boss_golem_hurt.png"],
      "death": ["Sprites/boss_golem/boss_golem_death.png"]
    },
    "boss_lich": {
      "idle": ["Sprites/boss_lich/boss_lich_idle1.png", "Sprites/boss_lich/boss_lich_idle2.png"],
      "attack": ["Sprites/boss_lich/boss_lich_attack1.png", "Sprites/boss_lich/boss_lich_attack2.png"],
      "hurt": ["Sprites/boss_lich/boss_lich_hurt.png"],
      "death": ["Sprites/boss_lich/boss_lich_death.png"]
    },
    "boss_demon": {
      "idle": ["Sprites/boss_demon/boss_demon_idle1.png", "Sprites/boss_demon/boss_demon_idle2.png"],
      "attack": ["Sprites/boss_demon/boss_demon_attack1.png", "Sprites/boss_demon/boss_demon_attack2.png"],
      "hurt": ["Sprites/boss_demon/boss_demon_hurt.png"],
      "death": ["Sprites/boss_demon/boss_demon_death.png"]
    }
  };
}

const ITEM_IMAGES = {
  potion_hp:   "assets/items/potion_health.png",
  potion_mana: "assets/items/potion_mana.png",
  portal:      "assets/items/portal.png"
};

function loadImage(src) {
  return new Promise(res => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => res(placeholder("MISS"));
    im.src = src;
  });
}

function uniquePropSrcs() { 
  const s = new Set(); 
  for (const b of BIOMES) { 
    for (const p of (PROPS_DEF[b.key] || [])) 
      s.add(p.src); 
  } 
  return [...s]; 
}

async function preloadAll(atlas, onProgress) {
  const urls = []; 
  for (const g in atlas) 
    for (const a in atlas[g]) 
      urls.push(...atlas[g][a]);
  
  const groundUrls = BIOMES.map(b => b.ground); 
  const propUrls = uniquePropSrcs();
  let done = 0, total = urls.length + groundUrls.length + propUrls.length + Object.keys(ITEM_IMAGES).length; 
  const cache = {};
  
  for (const u of urls) {
    cache[u] = await loadImage(u); 
    onProgress(++done, total);
  }
  
  cache.__grounds = []; 
  for (const g of groundUrls) {
    cache.__grounds.push(await loadImage(g)); 
    onProgress(++done, total);
  }
  
  for (const src of propUrls) {
    cache[src] = await loadImage(src); 
    onProgress(++done, total);
  }
  
  for (const k in ITEM_IMAGES) {
    cache[ITEM_IMAGES[k]] = await loadImage(ITEM_IMAGES[k]); 
    onProgress(++done, total);
  }
  
  return cache;
}

/* ===== Animación simple ===== */
class Animator {
  constructor(frames, fps = 8) {
    this.frames = frames;
    this.fps = fps;
    this.t = 0;
    this.i = 0;
  }
  
  update(dt) {
    const ft = 1000 / this.fps;
    this.t += dt;
    while (this.t >= ft) {
      this.t -= ft;
      this.i = (this.i + 1) % this.frames.length;
    }
  }
  
  get frame() {
    return this.frames[this.i];
  }
}

/* ===== Player ===== */
class Player {
  constructor(cache, atlas, heroKey = 'anomage') {
    this.cache = cache; 
    this.atlas = atlas; 
    this.heroKey = heroKey;
    this.x = 1024; 
    this.y = 1024; 
    this.spd = 0.24; 
    this.hpMax = 100; 
    this.hp = 100; 
    this.manaMax = 50; 
    this.mana = 50;
    this.dir = 'down'; 
    this.moving = false; 
    this.fireCd = 0;
    
    // Sistema de dash
    this.dashCd = 0;
    this.dashSpeed = 1;

    const H = atlas[this.heroKey] || atlas.anomage;
    this.animIdle = new Animator(H.idle.map(p => cache[p]), 4);
    this.anim = {
      up:    new Animator(H.walk_up.map(p => cache[p]),    8),
      down:  new Animator(H.walk_down.map(p => cache[p]),  8),
      left:  new Animator(H.walk_left.map(p => cache[p]),  8),
      right: new Animator(H.walk_right.map(p => cache[p]), 8)
    };
  }
  
  update(dt) {
    let vx = 0, vy = 0;
    if (Input.keys.has('w') || Input.keys.has('arrowup')) vy -= 1;
    if (Input.keys.has('s') || Input.keys.has('arrowdown')) vy += 1;
    if (Input.keys.has('a') || Input.keys.has('arrowleft')) vx -= 1;
    if (Input.keys.has('d') || Input.keys.has('arrowright')) vx += 1;
    
    this.moving = (vx || vy);
    
    // Sistema de dash
    this.dashCd -= dt;
    if (Input.keys.has('shift') && this.dashCd <= 0) {
      this.performDash();
    }
    
    if (this.dashSpeed > 1) {
      this.dashSpeed -= dt * 0.003;
      if (this.dashSpeed < 1) this.dashSpeed = 1;
    }
    
    if (this.moving) {
      const l = Math.hypot(vx, vy); 
      vx /= l; 
      vy /= l;
      const finalSpeed = this.spd * this.dashSpeed;
      this.x += vx * finalSpeed * dt; 
      this.y += vy * finalSpeed * dt;
      
      if (Math.abs(vx) > Math.abs(vy)) 
        this.dir = (vx < 0) ? 'left' : 'right'; 
      else if (vy !== 0) 
        this.dir = (vy < 0) ? 'up' : 'down';
    }
    
    // regen mana
    if (this.mana < this.manaMax) 
      this.mana = Math.min(this.manaMax, this.mana + (MANA_REGEN_PER_SEC/1000) * dt);

    this.animIdle.update(dt); 
    for (const k of ['up', 'down', 'left', 'right']) 
      this.anim[k].update(dt); 
    
    this.fireCd -= dt;
  }
  
  performDash() {
    this.dashCd = 2000; // 2 segundos de cooldown
    this.dashSpeed = 2.5; // Velocidad x2.5
    
    // Efectos visuales
    playSfx('light', 0.4); // Sonido de dash
    toast('¡Dash!');
    
    // Partículas de dash
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.2;
      GAME.particles.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 400,
        maxLife: 400,
        color: '#06b6d4',
        size: 2
      });
    }
  }
  
  draw() {
    const img = this.moving ? this.anim[this.dir].frame : this.animIdle.frame;
    if (!this.moving && this.dir === 'left') {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.scale(-1, 1);
      ctx.drawImage(img, -32, -32, 64, 64);
      ctx.restore();
      return;
    }
    ctx.drawImage(img, this.x - 32, this.y - 32, 64, 64);
  }
}

/* ===== Enemy ===== */
class Enemy {
  constructor(opts) {
    Object.assign(this, opts); // x,y,type,boss,frames,idleFrames,attackFrames,deathFrame
    this.r = this.boss ? 28 : 22;
    this.hpMax = this.boss ? 900 : 50; 
    this.hp = this.hpMax;
    this.spdBase = (this.boss ? 0.08 : 0.11);
    this.dmg = this.boss ? 10 : 3;
    this.vx = 0; 
    this.vy = 0; 
    this.facing = 'left'; 
    this.hitT = 0;
    this.slowT = 0; 
    this.dotT = 0; 
    this.dotDps = 0;
    this.stunT = 0;
    this.idleAnim = new Animator((this.idleFrames || this.frames), this.boss ? 6 : 8);
    this.attackAnim = new Animator((this.attackFrames || this.frames), 10);
    this.deathImg = this.deathFrame || this.frames[0];
    this.state = 'idle'; 
    this.stateT = 0; 
    this.scale = this.boss ? 1.6 : 1; 
    this.atkT = 800; 
    this.dead = false; 
    this.deadShowT = 0;
  }
  
  update(dt, player) {
    if (this.dead) { 
      this.deadShowT -= dt; 
      if (this.deadShowT <= 0) this.remove = true; 
      return; 
    }

    if (this.stunT > 0) { this.stunT -= dt; }
    if (this.slowT > 0) { this.slowT -= dt; }
    if (this.dotT > 0) { 
      const tick = Math.min(this.dotT, dt); 
      this.hp -= (this.dotDps/1000) * tick; 
      this.dotT -= dt; 
      if (this.hp < 0) this.hp = 0; 
    }

    const dx = player.x - this.x, dy = player.y - this.y, d = Math.hypot(dx, dy) || 1; 
    const toX = dx/d, toY = dy/d;
    const slowMul = (this.slowT > 0 ? 0.65 : 1);
    let spd = this.spdBase * slowMul * (this.stunT > 0 ? 0.55 : 1);
    spd = Math.max(spd, 0.06);
    this.vx = toX * spd * dt; 
    this.vy = toY * spd * dt; 
    this.x += this.vx; 
    this.y += this.vy;
    this.facing = (this.vx > 0.06) ? 'right' : (this.vx < -0.06 ? 'left' : this.facing);
    this.hitT -= dt;

    if (!this.dead && dist2(this.x, this.y, player.x, player.y) < (this.r + 18) * (this.r + 18)) {
      const damageMultiplier = this.boss ? 0.03 : 0.008;
      player.hp = Math.max(0, player.hp - dt * damageMultiplier * this.dmg);
    }

    if (this.boss) {
      this.atkT -= dt;
      if (this.atkT <= 0) {
        this.state = 'attack'; 
        this.stateT = 500;
        bossAttackPattern(this, player);
        const cds = [1400, 2200, 1200
