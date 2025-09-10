/* =========================================================
   ANOMA SURVIVAL — núcleo del juego
   ========================================================= */

/* ===== Canvas & DOM ===== */
const VIRT_W=960, VIRT_H=540;
const cv=document.getElementById('game');
const ctx=cv.getContext('2d',{alpha:false}); ctx.imageSmoothingEnabled=false;

const progressEl = document.getElementById("progress");
const biomeEl = document.getElementById("biome");
const hpEl = document.getElementById("hp");
const killsEl = document.getElementById("kills");
const bossEl = document.getElementById("boss");
const ptsEl = document.getElementById("pts");
const wnameEl = document.getElementById("wname");
const wlvEl = document.getElementById("wlv");
const toastEl=document.getElementById('toast');

const warn=document.getElementById('warn'); const btnPick=document.getElementById('btn-pick'); const filePick=document.getElementById('file-pick');
const startDiv=document.getElementById('start'); const btnStart=document.getElementById('btnStart');
const chosenNameEl=document.getElementById('chosenName');

/* ===== Selección de personaje ===== */
let SELECTED_HERO_KEY = 'anomage';
let SELECTED_HERO_NAME = 'ANOMAGE';

/* ===== Config ===== */
const CHUNK_SIZE = 2048;
const CAMERA = { x:1024, y:1024, lerp:0.15 };
const WAVE_KILL_TARGET = 50;

/* ===== Mostrar/ocultar HUD pintado en el canvas (el viejo) ===== */
const SHOW_CANVAS_HUD = false;

const BIOMES = [
  { key:"forest",   name:"Bosque",  ground:"assets/maps/ground_forest.png",   bossKey:"boss_ent",   music:"assets/audio/music_forest.mp3" },
  { key:"cemetery", name:"Cement.", ground:"assets/maps/ground_swamp.png",    bossKey:"boss_necro", music:"assets/audio/music_cemetery.mp3" },
  { key:"dungeon",  name:"Mazmorra",ground:"assets/maps/ground_dungeon.png",  bossKey:"boss_golem", music:"assets/audio/music_dungeon.mp3" },
  { key:"desert",   name:"Desierto",ground:"assets/maps/ground_desert.png",   bossKey:"boss_lich",  music:"assets/audio/music_desert.mp3" },
  { key:"volcano",  name:"Volcán",  ground:"assets/maps/ground_volcano.png",  bossKey:"boss_demon", music:"assets/audio/music_volcano.mp3" }
];

const PROPS_DEF = {
  forest: [
    { src:"assets/props/tree_big.png",   w:128,h:128,solid:true,count:26,minDist:140 },
    { src:"assets/props/tree_small.png", w:64, h:64, solid:true,count:22,minDist:110 },
    { src:"assets/props/rock.png",       w:64, h:64, solid:true,count:24,minDist:90  },
    { src:"assets/props/mushroom.png",   w:64, h:64, solid:false,count:14,minDist:80 }
  ],
  cemetery:[ { src:"assets/props/rock.png", w:64,h:64,solid:true,count:32,minDist:90 } ],
  dungeon: [ { src:"assets/props/rock.png", w:64,h:64,solid:true,count:24,minDist:90 } ],
  desert:  [ { src:"assets/props/log.png",  w:96,h:64,solid:true,count:20,minDist:110 } ],
  volcano: [ { src:"assets/props/rock.png", w:64,h:64,solid:true,count:26,minDist:95 } ]
};

/* ===== RPG: mana y pociones ===== */
const MANA_REGEN_PER_SEC = 5;     // mana que regenera por segundo
const SHOT_MANA_COST     = 2;     // coste por disparo
const POTION_HP_AMOUNT   = 35;
const POTION_MANA_AMOUNT = 30;
const DROP_POTION_CHANCE = 0.20;  // 20% de drop de poción si no hay gema

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
let bgm=null; // música actual
function playSfx(name, vol=.8){ const src=SFX[name]; if(!src) return; const a=new Audio(); a.src=src; a.volume=vol; a.play().catch(()=>{}); }
function playMusic(src){ if(!src) return; if(bgm){ bgm.pause(); bgm=null; } bgm=new Audio(src); bgm.loop=true; bgm.volume=0.35; bgm.play().catch(()=>{}); }

/* ===== Estado general ===== */
let BIOME=0, ATLAS=null;
const WORLD={propsImgs:new Map(),chunks:new Map()};
let GAME = {
  cache:null, player:null, enemies:[], projectiles:[], pickups:[], portal:null, particles:[],
  running:false, killed:0, points:0,
  upgrades:{ fire:1, light:1, ice:1, dark:1 },
  weapon:'fire'
};
let CURRENT_BOSS=null;

/* === Exponer estado al objeto window para overlays externos (barra Diablo 2) === */
try{
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
}catch(e){
  // entornos sin window
}

/* ===== Input ===== */
const Input={keys:new Set(),mouse:{x:VIRT_W/2,y:VIRT_H/2,down:false}};
window.addEventListener('keydown',e=>Input.keys.add(e.key.toLowerCase()));
window.addEventListener('keyup',e=>Input.keys.delete(e.key.toLowerCase()));
cv.addEventListener('mousemove',e=>{const r=cv.getBoundingClientRect();Input.mouse.x=(e.clientX-r.left)*(cv.width/r.width);Input.mouse.y=(e.clientY-r.top)*(cv.height/r.height);});
cv.addEventListener('mousedown',()=>Input.mouse.down=true); window.addEventListener('mouseup',()=>Input.mouse.down=false);

/* ===== Utils ===== */
function lerp(a,b,t){return a+(b-a)*t}
function dist2(ax,ay,bx,by){const dx=ax-bx,dy=ay-by;return dx*dx+dy*dy}
function clamp(v,a,b){return v<a?a:(v>b?b:v)}
function toast(msg){ toastEl.textContent=msg; toastEl.classList.add('show'); clearTimeout(toastEl._t); toastEl._t=setTimeout(()=>toastEl.classList.remove('show'),1300); }
function makeRng(seed){let s=seed|0;return ()=>((s^=s<<13,s^=s>>>17,s^=s<<5)>>>0)/4294967296}
function rngRange(r,a,b){return a+r()*(b-a)}
function worldToChunk(x,y){return {cx:Math.floor(x/CHUNK_SIZE),cy:Math.floor(y/CHUNK_SIZE)}}
function placeholder(text="MISS"){const c=document.createElement('canvas');c.width=64;c.height=64;const g=c.getContext('2d');g.imageSmoothingEnabled=false;g.fillStyle="#1d1f27";g.fillRect(0,0,64,64);g.strokeStyle="#4f46e5";g.lineWidth=3;g.strokeRect(3,3,58,58);g.fillStyle="#c7d2fe";g.font="bold 10px monospace";g.fillText(text,10,36);const im=new Image();im.src=c.toDataURL();return im}

/* ===== Sprites.json (carga con fallback local) ===== */
function normalizeAtlasPaths(json){
  const out={}; for(const g in json){ out[g]={}; for(const a in json[g]){ out[g][a]=json[g][a].map(p=>p.startsWith("assets/")?p:("assets/"+p)); } } return out;
}
async function tryFetchSpritesJson(){ const res=await fetch("assets/Sprites.json",{cache:"no-store"}); if(!res.ok) throw new Error("HTTP "+res.status); return await res.json(); }
function defaultAtlasJson(){
  return {
    "anomage":{"idle":["Sprites/image/mage_idle_1.png","Sprites/image/mage_idle_2.png"],
              "walk_down":["Sprites/image/mage_down_1.png","Sprites/image/mage_down_2.png","Sprites/image/mage_down_3.png","Sprites/image/mage_down_4.png"],
              "walk_up":["Sprites/image/mage_up_1.png","Sprites/image/mage_up_2.png","Sprites/image/mage_up_3.png","Sprites/image/mage_up_4.png"],
              "walk_left":["Sprites/image/mage_left_1.png","Sprites/image/mage_left_2.png","Sprites/image/mage_left_3.png","Sprites/image/mage_left_4.png"],
              "walk_right":["Sprites/image/mage_right_1.png","Sprites/image/mage_right_2.png","Sprites/image/mage_right_3.png","Sprites/image/mage_right_4.png"]},
    "shrimp":{"idle":["Sprites/shrimp_player/shrimp_idle_1.png","Sprites/shrimp_player/shrimp_idle_2.png"],
              "walk_down":["Sprites/shrimp_player/shrimp_down_1.png","Sprites/shrimp_player/shrimp_down_2.png","Sprites/shrimp_player/shrimp_down_3.png","Sprites/shrimp_player/shrimp_down_4.png"],
              "walk_up":["Sprites/shrimp_player/shrimp_up_1.png","Sprites/shrimp_player/shrimp_up_2.png","Sprites/shrimp_player/shrimp_up_3.png","Sprites/shrimp_player/shrimp_up_4.png"],
              "walk_left":["Sprites/shrimp_player/shrimp_left_1.png","Sprites/shrimp_player/shrimp_left_2.png","Sprites/shrimp_player/shrimp_left_3.png","Sprites/shrimp_player/shrimp_left_4.png"],
              "walk_right":["Sprites/shrimp_player/shrimp_right_1.png","Sprites/shrimp_player/shrimp_right_2.png","Sprites/shrimp_player/shrimp_right_3.png","Sprites/shrimp_player/shrimp_right_4.png"]},
    "spells":{"fire":["Sprites/image_spells/fireball_1.png","Sprites/image_spells/fireball_2.png","Sprites/image_spells/fireball_3.png","Sprites/image_spells/fireball_4.png"],
              "light":["Sprites/image_spells/lightning_1.png","Sprites/image_spells/lightning_2.png","Sprites/image_spells/lightning_3.png","Sprites/image_spells/lightning_4.png"],
              "ice":["Sprites/image_spells/ice_shard_1.png","Sprites/image_spells/ice_shard_2.png","Sprites/image_spells/ice_shard_3.png","Sprites/image_spells/ice_shard_4.png"],
              "dark":["Sprites/image_spells/dark_blast_1.png","Sprites/image_spells/dark_blast_2.png","Sprites/image_spells/dark_blast_3.png","Sprites/image_spells/dark_blast_4.png"]},
    "enemies":{"skeleton":["Sprites/enemies/skeleton/skeleton_walk_1.png","Sprites/enemies/skeleton/skeleton_walk_2.png"],
               "orc":["Sprites/enemies/orc/orc_walk_1.png","Sprites/enemies/orc/orc_walk_2.png"],
               "ghost":["Sprites/enemies/ghost/ghost_float_1.png","Sprites/enemies/ghost/ghost_float_2.png"],
               "bat":["Sprites/enemies/bat/bat_fly_1.png","Sprites/enemies/bat/bat_fly_2.png"],
               "shrimp":["Sprites/enemies/shrimp/shrimp_walk_1.png","Sprites/enemies/shrimp/shrimp_walk_2.png"]},
    "boss_ent":{"idle":["Sprites/boss_ent/boss_ent_idle1.png","Sprites/boss_ent/boss_ent_idle2.png"],"attack":["Sprites/boss_ent/boss_ent_attack1.png","Sprites/boss_ent/boss_ent_attack2.png"],"hurt":["Sprites/boss_ent/boss_ent_hurt.png"],"death":["Sprites/boss_ent/boss_ent_death.png"]},
    "boss_necro":{"idle":["Sprites/boss_necro/boss_necro_idle1.png","Sprites/boss_necro/boss_necro_idle2.png"],"attack":["Sprites/boss_necro/boss_necro_attack1.png","Sprites/boss_necro/boss_necro_attack2.png"],"hurt":["Sprites/boss_necro/boss_necro_hurt.png"],"death":["Sprites/boss_necro/boss_necro_death.png"]},
    "boss_golem":{"idle":["Sprites/boss_golem/boss_golem_idle1.png","Sprites/boss_golem/boss_golem_idle2.png"],"attack":["Sprites/boss_golem/boss_golem_attack1.png","Sprites/boss_golem/boss_golem_attack2.png"],"hurt":["Sprites/boss_golem/boss_golem_hurt.png"],"death":["Sprites/boss_golem/boss_golem_death.png"]},
    "boss_lich":{"idle":["Sprites/boss_lich/boss_lich_idle1.png","Sprites/boss_lich/boss_lich_idle2.png"],"attack":["Sprites/boss_lich/boss_lich_attack1.png","Sprites/boss_lich/boss_lich_attack2.png"],"hurt":["Sprites/boss_lich/boss_lich_hurt.png"],"death":["Sprites/boss_lich/boss_lich_death.png"]},
    "boss_demon":{"idle":["Sprites/boss_demon/boss_demon_idle1.png","Sprites/boss_demon/boss_demon_idle2.png"],"attack":["Sprites/boss_demon/boss_demon_attack1.png","Sprites/boss_demon/boss_demon_attack2.png"],"hurt":["Sprites/boss_demon/boss_demon_hurt.png"],"death":["Sprites/boss_demon/boss_demon_death.png"]}
  };
}
const ITEM_IMAGES = {
  potion_hp:   "assets/items/potion_health.png",
  potion_mana: "assets/items/potion_mana.png",
  portal:      "assets/items/portal.png"
};
function loadImage(src){return new Promise(res=>{const im=new Image();im.onload=()=>res(im);im.onerror=()=>res(placeholder("MISS"));im.src=src;});}
function uniquePropSrcs(){ const s=new Set(); for(const b of BIOMES){ for(const p of (PROPS_DEF[b.key]||[])) s.add(p.src); } return [...s]; }
async function preloadAll(atlas,onProgress){
  const urls=[]; for(const g in atlas) for(const a in atlas[g]) urls.push(...atlas[g][a]);
  const groundUrls=BIOMES.map(b=>b.ground); const propUrls=uniquePropSrcs();
  let done=0,total=urls.length+groundUrls.length+propUrls.length+Object.keys(ITEM_IMAGES).length; const cache={};
  for(const u of urls){cache[u]=await loadImage(u); onProgress(++done,total);}
  cache.__grounds=[]; for(const g of groundUrls){cache.__grounds.push(await loadImage(g)); onProgress(++done,total);}
  for(const src of propUrls){cache[src]=await loadImage(src); onProgress(++done,total);}
  for(const k in ITEM_IMAGES){cache[ITEM_IMAGES[k]]=await loadImage(ITEM_IMAGES[k]); onProgress(++done,total);}
  return cache;
}

/* ===== Animación simple ===== */
class Animator{constructor(frames,fps=8){this.frames=frames;this.fps=fps;this.t=0;this.i=0}update(dt){const ft=1000/this.fps;this.t+=dt;while(this.t>=ft){this.t-=ft;this.i=(this.i+1)%this.frames.length}}get frame(){return this.frames[this.i]}}

/* ===== Player ===== */
class Player{
  constructor(cache, atlas, heroKey='anomage'){
    this.cache=cache; this.atlas=atlas; this.heroKey=heroKey;
    this.x=1024; this.y=1024; this.spd=0.24; this.hpMax=100; this.hp=100; this.manaMax=50; this.mana=50;
    this.dir='down'; this.moving=false; this.fireCd=0;

    const H = atlas[this.heroKey] || atlas.anomage;
    this.animIdle = new Animator(H.idle.map(p=>cache[p]), 4);
    this.anim = {
      up:    new Animator(H.walk_up.map(p=>cache[p]),    8),
      down:  new Animator(H.walk_down.map(p=>cache[p]),  8),
      left:  new Animator(H.walk_left.map(p=>cache[p]),  8),
      right: new Animator(H.walk_right.map(p=>cache[p]), 8)
    };
  }
  update(dt){
    let vx=0,vy=0;
    if(Input.keys.has('w')||Input.keys.has('arrowup'))vy-=1;
    if(Input.keys.has('s')||Input.keys.has('arrowdown'))vy+=1;
    if(Input.keys.has('a')||Input.keys.has('arrowleft'))vx-=1;
    if(Input.keys.has('d')||Input.keys.has('arrowright'))vx+=1;
    this.moving=(vx||vy);
    if(this.moving){
      const l=Math.hypot(vx,vy); vx/=l; vy/=l;
      this.x+=vx*this.spd*dt; this.y+=vy*this.spd*dt;
      if(Math.abs(vx)>Math.abs(vy))this.dir=(vx<0)?'left':'right'; else if(vy!==0)this.dir=(vy<0)?'up':'down';
    }
    // regen mana
    if (this.mana < this.manaMax) this.mana = Math.min(this.manaMax, this.mana + (MANA_REGEN_PER_SEC/1000)*dt);

    this.animIdle.update(dt); for(const k of ['up','down','left','right'])this.anim[k].update(dt); this.fireCd-=dt;
  }
  draw(){
    const img=this.moving?this.anim[this.dir].frame:this.animIdle.frame;
    if(!this.moving&&this.dir==='left'){ctx.save();ctx.translate(this.x,this.y);ctx.scale(-1,1);ctx.drawImage(img,-32,-32,64,64);ctx.restore();return;}
    ctx.drawImage(img,this.x-32,this.y-32,64,64);
  }
}

/* ===== Enemy ===== */
class Enemy{
  constructor(opts){
    Object.assign(this,opts); // x,y,type,boss,frames,idleFrames,attackFrames,deathFrame
    this.r = this.boss?28:22;
    this.hpMax = this.boss?900:50; this.hp=this.hpMax;
    this.spdBase = (this.boss?0.08:0.11);
    this.dmg = this.boss?10:3;
    this.vx=0; this.vy=0; this.facing='left'; this.hitT=0;
    this.slowT=0; this.dotT=0; this.dotDps=0;
    this.stunT=0;
    this.idleAnim  = new Animator((this.idleFrames||this.frames), this.boss?6:8);
    this.attackAnim= new Animator((this.attackFrames||this.frames), 10);
    this.deathImg  = this.deathFrame || this.frames[0];
    this.state='idle'; this.stateT=0; this.scale=this.boss?1.6:1; this.atkT=800; this.dead=false; this.deadShowT=0;
  }
  update(dt,player){
    if(this.dead){ this.deadShowT-=dt; if(this.deadShowT<=0) this.remove=true; return; }

    if(this.stunT>0){ this.stunT-=dt; }
    if(this.slowT>0){ this.slowT-=dt; }
    if(this.dotT>0){ const tick = Math.min(this.dotT,dt); this.hp -= (this.dotDps/1000)*tick; this.dotT-=dt; if(this.hp<0)this.hp=0; }

    const dx=player.x-this.x, dy=player.y-this.y, d=Math.hypot(dx,dy)||1; const toX=dx/d,toY=dy/d;
    const slowMul = (this.slowT>0 ? 0.65 : 1);
    let spd = this.spdBase * slowMul * (this.stunT>0 ? 0.55 : 1);
    spd = Math.max(spd, 0.06);
    this.vx = toX*spd*dt; this.vy=toY*spd*dt; this.x+=this.vx; this.y+=this.vy;
    this.facing = (this.vx>0.06)?'right':(this.vx<-0.06?'left':this.facing);
    this.hitT-=dt;

    if(!this.dead && dist2(this.x,this.y,player.x,player.y) < (this.r+18)*(this.r+18)) {
    const damageMultiplier = this.boss ? 0.03 : 0.008;
    player.hp=Math.max(0,player.hp - dt*damageMultiplier*this.dmg);
    }

    if(this.boss){
      this.atkT-=dt;
      if(this.atkT<=0){
        this.state='attack'; this.stateT=500;
        bossAttackPattern(this, player);
        const cds=[1400,2200,1200,1000,1100]; this.atkT = cds[BIOME];
      }
      if(this.state==='attack'){ this.stateT-=dt; if(this.stateT<=0)this.state='idle'; this.attackAnim.update(dt); }
      else this.idleAnim.update(dt);
    }else{
      this.idleAnim.update(dt);
    }

    if(this.hp<=0 && !this.dead){
      this.dead=true; this.deadShowT=900; this.r=0; this.vx=0; this.vy=0; this.stunT=this.slowT=this.dotT=0;
      if(this.boss) onBossDefeated(this); else maybeDrop(this.x,this.y);
    }
  }
  draw(){
    const w=64*this.scale,h=64*this.scale; ctx.save(); ctx.translate(this.x,this.y); if(this.facing==='right')ctx.scale(-1,1);
    if(this.dead){ const t=Math.max(0,(this.deadShowT||0)/900); ctx.globalAlpha=0.85*t; ctx.drawImage(this.deathImg,-w/2,-h/2,w,h); ctx.restore(); return; }
    const img=(this.state==='attack')?this.attackAnim.frame:this.idleAnim.frame;
    if(this.hitT>0){ctx.globalAlpha=.7;ctx.drawImage(img,-w/2,-h/2,w,h);ctx.globalAlpha=1;} else ctx.drawImage(img,-w/2,-h/2,w,h);
    ctx.restore();
  }
}

// === Proyectil animado (4 frames) ===
function projFps(kind){
  // FPS por elemento (ajusta si quieres)
  return ({ fire:12, light:18, ice:10, dark:8 }[kind] || 12);
}

class Proj{
  constructor(frames,x,y,vx,vy,opts={}){
    // frames: array de 4 imágenes del hechizo
    this.frames = (frames && frames.length) ? frames : [placeholder("PRJ")];
    this.anim = new Animator(this.frames, projFps(opts.kind)); // ← animación

    this.x=x; this.y=y;
    const spd=opts.spd||0.75;
    this.vx=vx*spd; this.vy=vy*spd;

    this.life=opts.life||900;
    this.baseDmg=opts.dmg||18;
    this.r=opts.r||12;
    this.pierce=opts.pierce||1;
    this.aoe=opts.aoe||0;
    this.effect=opts.effect||null;
    this.kind=opts.kind||'fire';
    this.scale=opts.scale||1;
    this.owner=opts.owner||'player';
  }

  get dmg(){
    const lv=GAME.upgrades[this.kind]||1;
    return Math.round(this.baseDmg * (1 + 0.28*(lv-1)));
  }

  update(dt){
    this.x += this.vx*dt;
    this.y += this.vy*dt;
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
    this.anim.update(dt); // ← avanza animación
  }

  draw(){
    const img = this.anim.frame; // ← frame animado
    if (!img) return;

    // tamaño escala con el nivel
    const s = 32 * (1 + 0.22 * ((GAME.upgrades[this.kind]||1) - 1));

    // orientar hacia la dirección de movimiento
    const ang = Math.atan2(this.vy, this.vx);
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(ang);
    ctx.drawImage(img, -s/2, -s/2, s, s);
    ctx.restore();
  }
}

class Pickup{
  // kind: "fire"|"light"|"ice"|"dark"|"potion_hp"|"potion_mana"
  constructor(x,y,kind){
    this.x=x; this.y=y; this.kind=kind; this.r=16; this.bounce=0;
    if (kind==="potion_hp")      { this.img=GAME.cache[ITEM_IMAGES.potion_hp]||null; this.size=28; }
    else if (kind==="potion_mana"){ this.img=GAME.cache[ITEM_IMAGES.potion_mana]||null; this.size=28; }
    else { const frames=framesSpell(kind); this.img=frames&&frames[0]; this.size=28; }
  }
  update(dt){ this.bounce+=dt*0.005; }
  draw(){ const bob=Math.sin(this.bounce)*4, s=this.size||28; ctx.save(); ctx.translate(this.x,this.y-bob);
    if(this.img){ ctx.drawImage(this.img,-s/2,-s/2,s,s); } else { ctx.fillStyle=(this.kind==="potion_hp")?"#ff5c5c":(this.kind==="potion_mana")?"#4da3ff":"#ddd"; ctx.fillRect(-10,-10,20,20); ctx.strokeStyle="#000"; ctx.strokeRect(-10,-10,20,20); }
    ctx.restore();
  }
}
class Portal{ 
  constructor(x,y){ 
    this.x=x; 
    this.y=y; 
    this.r=28; 
    this.t=0; 
    this.bounce=0;
    // Cargar imagen del portal
    this.img = GAME.cache[ITEM_IMAGES.portal] || null;
  } 
  
  update(dt){ 
    this.t+=dt; 
    this.bounce+=dt*0.003; // Animación de rebote
  } 
  
  draw(){ 
    const bob = Math.sin(this.bounce) * 1; // Efecto de flotación
    const pulse = 1 + Math.sin(this.t * 0.008) * 0.1; // Efecto de pulsación
    
    ctx.save(); 
    ctx.translate(this.x, this.y - bob);
    ctx.scale(pulse, pulse);
    
    if(this.img) {
      // Dibujar la imagen del portal
      const size = 128;
      ctx.drawImage(this.img, -size/2, -size/2, size, size);
    } else {
      // Fallback: círculos animados (código original)
      const t=this.t*0.005; 
      for(let i=0;i<3;i++){ 
        ctx.beginPath(); 
        ctx.arc(0,0,this.r+i*8+Math.sin(t+i)*2,0,Math.PI*2); 
        ctx.strokeStyle=i===0?"#5df5ff":(i===1?"#78ffc6":"#d9a6ff"); 
        ctx.lineWidth=3; 
        ctx.stroke(); 
      }
    }
    
    ctx.restore(); 
  } 
}
/* ===== Cache spells ===== */
function framesSpell(kind){ const g=ATLAS.spells[kind]||ATLAS.spells.fire; return g.map(u=>GAME.cache[u]); }

/* ===== HUD ===== */
function drawPlayerHPBar(p){
  const ratio = Math.max(0, p.hp / p.hpMax);
  const W = 48, H = 6;
  const x = p.x - W/2; const y = p.y - 42;
  ctx.fillStyle = "#0a0b0f"; ctx.fillRect(x-1, y-1, W+2, H+2);
  ctx.fillStyle = "#222a35"; ctx.fillRect(x, y, W, H);
  ctx.fillStyle = ratio > 0.5 ? "#5CFF6C" : (ratio > 0.25 ? "#FFD15C" : "#FF5C5C"); ctx.fillRect(x, y, W*ratio, H);
  ctx.strokeStyle="#000"; ctx.strokeRect(x, y, W, H);
}
function drawHUD(player){
  const hpRatio = Math.max(0, player.hp / player.hpMax);
  const manaRatio = Math.max(0, player.mana / player.manaMax);
  const barWidth = 260, barHeight = 20; const x = 20, y = 20;

  ctx.fillStyle = "#000"; ctx.fillRect(x-2, y-2, barWidth+4, barHeight+4);
  ctx.fillStyle = "#333"; ctx.fillRect(x, y, barWidth, barHeight);
  ctx.fillStyle = hpRatio > 0.5 ? "#4CAF50" : (hpRatio > 0.25 ? "#FFC107" : "#F44336");
  ctx.fillRect(x, y, barWidth * hpRatio, barHeight);
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.strokeRect(x, y, barWidth, barHeight);
  ctx.fillStyle = "#fff"; ctx.font = "14px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(`HP: ${Math.round(player.hp)} / ${player.hpMax}`, x + barWidth/2, y + barHeight/2);

  const manaY = y + barHeight + 10;
  ctx.fillStyle = "#000"; ctx.fillRect(x-2, manaY-2, barWidth+4, barHeight+4);
  ctx.fillStyle = "#333"; ctx.fillRect(x, manaY, barWidth, barHeight);
  ctx.fillStyle = "#2196F3"; ctx.fillRect(x, manaY, barWidth * manaRatio, barHeight);
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.strokeRect(x, manaY, barWidth, barHeight);
  ctx.fillStyle = "#fff"; ctx.fillText(`Mana: ${Math.round(player.mana)} / ${player.manaMax}`, x + barWidth/2, manaY + barHeight/2);
}

/* ===== Mundo / props / chunks ===== */
function ensureChunk(cx,cy){
  const key=cx+","+cy; if(WORLD.chunks.has(key)) return WORLD.chunks.get(key);
  const biomeKey = BIOMES[BIOME].key;
  const defs=PROPS_DEF[biomeKey]||[]; const baseX=cx*CHUNK_SIZE, baseY=cy*CHUNK_SIZE;
  const rng=makeRng((cx*73856093)^(cy*19349663)^(BIOME*83492791));
  const placed=[];
  for(const d of defs){
    let tries=d.count*12, n=0;
    while(n<d.count && tries-- >0){
      const x=rngRange(rng,baseX+40,baseX+CHUNK_SIZE-40), y=rngRange(rng,baseY+40,baseY+CHUNK_SIZE-40);
      let ok=true; for(const p of placed){const md=Math.max(d.minDist||80,60); if(Math.hypot(x-p.x,y-p.y)<md){ok=false;break}}
      if(!ok) continue;
      placed.push({src:d.src,img:WORLD.propsImgs.get(d.src),x,y,w:d.w,h:d.h,solid:!!d.solid});
      n++;
    }
  }
  const data={props:placed}; WORLD.chunks.set(key,data); return data;
}
function ensureChunksAround(x,y){ const {cx,cy}=worldToChunk(x,y); for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++) ensureChunk(cx+i,cy+j); }
function resolvePlayerVsProps(player){
  const {cx,cy}=worldToChunk(player.x,player.y);
  for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){
    const c=WORLD.chunks.get((cx+i)+","+(cy+j)); if(!c) continue;
    for(const pr of c.props){ if(!pr.solid) continue;
      const halfW=pr.w*0.42, halfH=pr.h*0.42; const dx=player.x-pr.x, dy=player.y-pr.y;
      if(Math.abs(dx)<=halfW && Math.abs(dy)<=halfH){
        const px=halfW-Math.abs(dx), py=halfH-Math.abs(dy);
        if(px<py) player.x += (dx>0?px:-px); else player.y += (dy>0?py:-py);
      }
    }
  }
}
function drawGround(){ const ground=GAME.cache.__grounds[BIOME]; if(!ground) return; const {cx,cy}=worldToChunk(CAMERA.x,CAMERA.y); for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){ const gx=(cx+i)*CHUNK_SIZE, gy=(cy+j)*CHUNK_SIZE; ctx.drawImage(ground,gx,gy,CHUNK_SIZE,CHUNK_SIZE); } }
function drawProps(){ const {cx,cy}=worldToChunk(CAMERA.x,CAMERA.y); const list=[]; for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){ const c=ensureChunk(cx+i,cy+j); if(c) list.push(...c.props); } list.sort((a,b)=>(a.y+a.h*0.5)-(b.y+b.h*0.5)); for(const p of list){const im=p.img||GAME.cache[p.src]; if(im) ctx.drawImage(im,p.x-p.w/2,p.y-p.h/2,p.w,p.h);} }
function regenerateBiome(){ WORLD.chunks.clear(); ensureChunksAround(GAME.player.x,GAME.player.y); playMusic(BIOMES[BIOME].music); }

/* ===== Spawner / IA jefes ===== */
function enemyFrames(type){ const arr=ATLAS.enemies[type]||[]; const frames=arr.map(u=>GAME.cache[u]).filter(Boolean); return frames.length?frames:[placeholder(type),placeholder(type)]; }
function bossData(){ const b=BIOMES[BIOME]; const g=ATLAS[b.bossKey]||{}; const idle=(g.idle||[]).map(u=>GAME.cache[u]); const atk=(g.attack||idle).map(u=>GAME.cache[u]); const death=(g.death||[])[0]; return {idleFrames:idle.length?idle:[placeholder("BOSS")], attackFrames:atk.length?atk:idle, deathFrame: death ? GAME.cache[death] : placeholder("DEAD")}; }
function spawnMinionNear(x,y){ 
  const enemyByBiome = ["skeleton", "ghost", "orc", "bat", "shrimp"];
  const t = enemyByBiome[BIOME] || "skeleton"; 
  const frames = enemyFrames(t); 
  const ang = Math.random()*Math.PI*2; 
  const R = 220; 
  const ex = x+Math.cos(ang)*R, ey = y+Math.sin(ang)*R; 
  GAME.enemies.push(new Enemy({frames, idleFrames:frames, x:ex,y:ey,boss:false,type:t})); 
}
function spawnMinion(){ const R=420; const a=Math.random()*Math.PI*2; const x=CAMERA.x+Math.cos(a)*R, y=CAMERA.y+Math.sin(a)*R; spawnMinionNear(x,y); }
function spawnBoss(){ const bd=bossData(); const e=new Enemy({frames:bd.idleFrames,idleFrames:bd.idleFrames,attackFrames:bd.attackFrames,deathFrame:bd.deathFrame,x:CAMERA.x,y:CAMERA.y-160,boss:true,type:"boss"}); GAME.enemies.push(e); CURRENT_BOSS=e; bossEl.textContent="Vivo"; }
function resetWave(){ GAME.killed=0; killsEl.textContent=0; GAME.enemies.length=0; GAME.pickups.length=0; GAME.projectiles.length=0; CURRENT_BOSS=null; GAME.portal=null; bossEl.textContent="—"; let toSpawn=WAVE_KILL_TARGET; const t=setInterval(()=>{ if(toSpawn<=0){clearInterval(t);return;} spawnMinion(); toSpawn--; }, 330); }

/* ===== Disparos jugador ===== */
function framesSpellCached(kind){ return framesSpell(kind); }
function makeProj(kind, x,y, vx,vy, extra={}){
  const lv = GAME.upgrades[kind]||1;
  const base = { fire:{dmg:26,aoe:54+12*(lv-1),pierce:1+Math.floor((lv-1)/3),spd:0.70},
                 light:{dmg:18,aoe:0,pierce:4+Math.floor((lv-1)/2),spd:1.02},
                 ice:{dmg:16,aoe:22+6*(lv-1),pierce:1,spd:0.78,effect:(e)=>{ e.slowT = Math.max(e.slowT, 600 + 100*(lv-1)); e.stunT = Math.max(e.stunT, 20); }},
                 dark:{dmg:20,aoe:38+8*(lv-1),pierce:1,spd:0.74,effect:(e)=>{ e.dotT=Math.max(e.dotT,1000+150*(lv-1)); e.dotDps=20+5*(lv-1); }} }[kind] || {};
  return new Proj(framesSpellCached(kind), x,y, vx,vy, Object.assign(base,{kind},extra));
}
function shootPlayer(){
  if(GAME.player.fireCd>0) return;
  if (GAME.player.mana < SHOT_MANA_COST) { toast("Sin maná"); return; }
  GAME.player.mana = Math.max(0, GAME.player.mana - SHOT_MANA_COST);
  GAME.player.fireCd=140;

  const a=Math.atan2( (Input.mouse.y - VIRT_H/2) + CAMERA.y - GAME.player.y, (Input.mouse.x - VIRT_W/2) + CAMERA.x - GAME.player.x );
  const vx=Math.cos(a), vy=Math.sin(a); const ox=GAME.player.x+vx*26, oy=GAME.player.y+vy*26;
  const p=makeProj(GAME.weapon,ox,oy,vx,vy,{owner:'player'}); GAME.projectiles.push(p);
   
  let weaponVolume = 0.8; // Volumen por defecto
  if (GAME.weapon === 'light') {
  weaponVolume = 0.2; // Puedes ajustar este valor, por ejemplo a 0.4
  }
  
  playSfx(GAME.weapon, weaponVolume);

  }

/* ===== IA ataques de jefes ===== */
function bossAttackPattern(boss,player){
  const shootAimed=(kind,spread=0,count=1,spd=0.8,dmg=8)=>{ const baseA=Math.atan2(player.y-boss.y,player.x-boss.x); for(let i=0;i<count;i++){ const a=baseA + spread*(i-(count-1)/2); const vx=Math.cos(a),vy=Math.sin(a); const p=makeProj(kind,boss.x+vx*28,boss.y+vy*28,vx,vy,{owner:'enemy'}); p.baseDmg=dmg; GAME.projectiles.push(p);} playSfx(kind, .6); };
  const shootRing=(kind,n=10,spd=0.55,dmg=8)=>{ for(let i=0;i<n;i++){ const a=i/n*Math.PI*2; const vx=Math.cos(a),vy=Math.sin(a); const p=makeProj(kind,boss.x+vx*24,boss.y+vy*24,vx,vy,{owner:'enemy'}); p.baseDmg=dmg; GAME.projectiles.push(p);} playSfx(kind, .6); };

  switch(BIOME){
    case 0: // Ent: lanza troncos
      for(let i=0;i<3;i++){
        const baseA=Math.atan2(player.y-boss.y,player.x-boss.x)+ (i-1)*0.18;
        const vx=Math.cos(baseA),vy=Math.sin(baseA);
        const frames=[ GAME.cache["assets/props/log.png"] ];
        const p=new Proj(frames, boss.x+vx*30, boss.y+vy*30, vx,vy, {owner:'enemy',dmg:10,spd:0.7,r:18,life:1600,kind:'dark'});
        p.draw=function(){ const im=this.frames[0]; ctx.drawImage(im,this.x-24,this.y-16,48,32); };
        GAME.projectiles.push(p);
      }
      break;
    case 1: // Nécromante: invoca esqueletos + oscuro triple
      for(let i=0;i<2;i++) spawnMinionNear(boss.x,boss.y);
      shootAimed("dark",0.20,3,0.75,8)
      break;
    case 2: // Golem: slam piedras radial
      for(let i=0;i<12;i++){
        const a=i/12*Math.PI*2; const vx=Math.cos(a),vy=Math.sin(a);
        const frames=[ GAME.cache["assets/props/rock.png"] ];
        const p=new Proj(frames, boss.x, boss.y, vx,vy, {owner:'enemy',dmg:10,spd:0.65,r:16,life:1800,kind:'ice'});
        p.draw=function(){ const im=this.frames[0]; ctx.drawImage(im,this.x-18,this.y-18,36,36); };
        GAME.projectiles.push(p);
      }
      playSfx("hit");
      break;
    case 3: // Lich: ráfaga rayos
      shootAimed("light",0.14,5,0.95,8)
      break;
    case 4: // Demon: fuego abanico + anillo
      shootAimed("fire",0.10,4,0.82,8); 
       setTimeout(()=>shootRing("fire",8,0.55,8),180);
      break;
  }
}

/* ===== Drops & portal ===== */
function maybeDrop(x,y){
  if(Math.random()<0.35){ const kinds=["fire","light","ice","dark"]; const k=kinds[(Math.random()*kinds.length)|0]; GAME.pickups.push(new Pickup(x,y,k)); return; }
  if(Math.random()<DROP_POTION_CHANCE){ const k=(Math.random()<0.5)?"potion_hp":"potion_mana"; GAME.pickups.push(new Pickup(x,y,k)); }
}
function openPortal(x,y){ GAME.portal=new Portal(x,y); playSfx('portal',.7); toast("Portal open! Enter to move on to the next screen."); }
function handlePickups(){
  const p=GAME.player;
  GAME.pickups = GAME.pickups.filter(it=>{
    if (dist2(it.x,it.y,p.x,p.y) <= (it.r+18)*(it.r+18)) {
      if (it.kind==="potion_hp") { const before=p.hp; p.hp=Math.min(p.hpMax,p.hp+POTION_HP_AMOUNT); if(p.hp>before) toast(`+${p.hp-before} HP`); playSfx('pickup',.8); return false; }
      if (it.kind==="potion_mana") { const before=p.mana; p.mana=Math.min(p.manaMax,p.mana+POTION_MANA_AMOUNT); if(p.mana>before) toast(`+${Math.round(p.mana-before)} Mana`); playSfx('pickup',.8); return false; }
      GAME.upgrades[it.kind] = (GAME.upgrades[it.kind]||1)+1; GAME.points+=1; toast(`+1 nivel ${it.kind} (Lv ${GAME.upgrades[it.kind]})`); playSfx('pickup',.8); return false;
    }
    return true;
  });
}

/* ===== Colisiones ===== */
function handleShooting(){ if(Input.mouse.down){ shootPlayer(); Input.mouse.down=false; } }
function projectileHits(){
  for(const pr of GAME.projectiles){
    if(pr.dead) continue;
    if(pr.owner==='player'){
      for(const e of GAME.enemies){
        if(e.dead) continue;
        if(dist2(e.x,e.y,pr.x,pr.y) < (e.r+pr.r)*(e.r+pr.r)){
          e.hp -= pr.dmg; e.hitT=100; if(pr.effect) pr.effect(e); playSfx("hit", .3);
          if(pr.aoe>0){ const rr=pr.aoe, rr2=rr*rr; for(const f of GAME.enemies){ if(f.dead||f===e) continue; if(dist2(f.x,f.y,pr.x,pr.y)<=rr2){ f.hp -= Math.round(pr.dmg*0.6); f.hitT=100; if(pr.effect) pr.effect(f); } } }
          if(e.hp<=0 && !e.dead){ e.dead=true; e.deadShowT=900; e.r=0; e.vx=0; e.vy=0; e.slowT=e.dotT=e.stunT=0; if(e.boss) onBossDefeated(e); else maybeDrop(e.x,e.y); }
          pr.pierce--; if(pr.pierce<=0){ pr.dead=true; break; }
        }
      }
    }else if(pr.owner==='enemy'){
      const p=GAME.player; if(dist2(p.x,p.y,pr.x,pr.y) < (18+pr.r)*(18+pr.r)){ p.hp = Math.max(0, p.hp - pr.dmg*0.55); pr.dead=true; }
    }
  }
  GAME.projectiles = GAME.projectiles.filter(p=>!p.dead);
}

/* ===== Separación de multitudes ===== */
function separateEnemies(dt){
  const cell=72; const buckets=new Map();
  function key(x,y){return ((x/cell)|0)+"," + ((y/cell)|0);}
  for(const e of GAME.enemies){ if(e.dead) continue; const k=key(e.x,e.y); (buckets.get(k)||buckets.set(k,[]).get(k)).push(e); }
  const neigh=[ [0,0],[1,0],[0,1],[1,1],[-1,0],[0,-1],[-1,-1],[1,-1],[-1,1] ];
  for(const [k,list] of buckets){
    const [cx,cy]=k.split(',').map(Number);
    const pool=[]; for(const [dx,dy] of neigh){ const v=buckets.get((cx+dx)+","+(cy+dy)); if(v) pool.push(...v); }
    for(let i=0;i<list.length;i++){
      const a=list[i];
      for(let j=i+1;j<pool.length;j++){
        const b=pool[j]; if(a===b)continue;
        const min=(a.r+b.r)*0.86; const dx=a.x-b.x,dy=a.y-b.y; const d=Math.hypot(dx,dy); if(d>0 && d<min){
          const push=(min-d)*0.5 * (dt/16); const ux=dx/d,uy=dy/d; a.x+=ux*push; a.y+=uy*push; b.x-=ux*push; b.y-=uy*push;
        }
      }
      a.x += (Math.random()-0.5)*0.04*dt;
      a.y += (Math.random()-0.5)*0.04*dt;
    }
  }
}

/* ===== Overlay / flujo ===== */
function onBossDefeated(boss){
  bossEl.textContent="Muerto";
  GAME.points += 10; toast("+10 esencia"); playSfx('bossdeath', .8);
  maybeDrop(boss.x+26,boss.y); maybeDrop(boss.x-26,boss.y);
  openPortal(boss.x, boss.y-20);
}
function nextBiome(){ BIOME=(BIOME+1)%BIOMES.length; biomeEl.textContent=BIOME+1; regenerateBiome(); resetWave(); GAME.running=true; GAME.portal=null; }
function endOverlay(title,sub){ GAME.running=false; document.getElementById('overlay-text').textContent=title; document.getElementById('overlay-sub').textContent=sub; document.getElementById('overlay').classList.add('show'); }
document.getElementById('overlay-btn').addEventListener('click',()=>{ document.getElementById('overlay').classList.remove('show'); if(GAME.player.hp<=0){ GAME.player.hp=GAME.player.hpMax; GAME.player.mana=GAME.player.manaMax; } resetWave(); GAME.running=true; });

/* ===== Loop ===== */
function update(dt){
  const p=GAME.player; p.update(dt); resolvePlayerVsProps(p); hpEl.textContent=Math.round(p.hp);
  // teclas arma
  if(Input.keys.has('1')){GAME.weapon='fire';}
  if(Input.keys.has('2')){GAME.weapon='light';}
  if(Input.keys.has('3')){GAME.weapon='ice';}
  if(Input.keys.has('4')){GAME.weapon='dark';}
  wnameEl.textContent={fire:"Fire",light:"Light",ice:"Ice",dark:"Dark"}[GAME.weapon]; wlvEl.textContent=GAME.upgrades[GAME.weapon]||1; ptsEl.textContent=GAME.points;

  handleShooting();
  for(const pr of GAME.projectiles) pr.update(dt);
  for(const e of GAME.enemies) e.update(dt,p);
  separateEnemies(dt);
  projectileHits();
  handlePickups();

  // portal
  if(GAME.portal){ const po=GAME.portal; po.update(dt); if(dist2(p.x,p.y,po.x,po.y) < (po.r+18)*(po.r+18)) nextBiome(); }

  let killedThisFrame=0;
  GAME.enemies = GAME.enemies.filter(e=>{
    if(e.remove) return false;
    if(e.hp<=0 && !e.boss && !e._counted){ e._counted=true; killedThisFrame++; GAME.points += 1; }
    return true;
  });
  if(killedThisFrame){ GAME.killed += killedThisFrame; killsEl.textContent=Math.min(GAME.killed,WAVE_KILL_TARGET); }

  if(GAME.killed>=WAVE_KILL_TARGET && !CURRENT_BOSS) spawnBoss();
  if(GAME.player.hp<=0){ endOverlay("You are dead","Click continue to try again."); return; }

  CAMERA.x=lerp(CAMERA.x,p.x,CAMERA.lerp); CAMERA.y=lerp(CAMERA.y,p.y,CAMERA.lerp);
  ensureChunksAround(p.x,p.y);
}
function draw(){
  ctx.save();
  ctx.translate(Math.floor(cv.width/2 - CAMERA.x), Math.floor(cv.height/2 - CAMERA.y));
  drawGround(); drawProps();

  const bucket=[];
  bucket.push(...GAME.enemies.map(e=>({y:e.y, draw:()=>e.draw()})));
  bucket.push(...GAME.pickups.map(it=>({y:it.y, draw:()=>it.draw()})));
  if(GAME.portal) bucket.push({y:GAME.portal.y, draw:()=>GAME.portal.draw()});
  bucket.sort((a,b)=>a.y-b.y); for(const b of bucket) b.draw();

  for(const pr of GAME.projectiles) pr.draw();
  GAME.player.draw();
  drawPlayerHPBar(GAME.player);

  if(CURRENT_BOSS && !CURRENT_BOSS.dead){
    const p=Math.max(0, CURRENT_BOSS.hp/CURRENT_BOSS.hpMax);
    const W=320,H=10,x=CAMERA.x-W/2,y=CAMERA.y-cv.height/2+22;
    ctx.fillStyle="#2d3340"; ctx.fillRect(x,y,W,H); ctx.fillStyle="#ff4d4d"; ctx.fillRect(x,y,W*p,H); ctx.strokeStyle="#000"; ctx.strokeRect(x,y,W,H);
  }
  ctx.restore();

  if (SHOW_CANVAS_HUD) drawHUD(GAME.player); // HUD superior vida/mana (opcional)
}

/* ===== Boot + responsive + start ===== */
btnPick.addEventListener('click',()=>filePick.click());
filePick.addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;try{const j=JSON.parse(await f.text());ATLAS=normalizeAtlasPaths(j);warn.classList.remove('show');boot(true);}catch(err){alert("Sprites.json inválido: "+err.message);}});

function fitCanvas(){ const vw=innerWidth, vh=innerHeight, ar=VIRT_W/VIRT_H; let cw=vw, ch=vw/ar; if(ch>vh){ ch=vh; cw=vh*ar; } cv.style.width=cw+"px"; cv.style.height=ch+"px"; }
window.addEventListener('resize',fitCanvas);

function drawHeroPreview(canvasId, atlasKey){
  const c=document.getElementById(canvasId); if(!c||!ATLAS||!GAME||!GAME.cache) return;
  const g=ATLAS[atlasKey]?.idle || ATLAS.anomage?.idle; const src=g && g[0]; if(!src) return;
  const img=GAME.cache[src]; const g2=c.getContext('2d'); g2.imageSmoothingEnabled=false; g2.clearRect(0,0,c.width,c.height); if(img) g2.drawImage(img, 0,0,64,64);
}
function hookCharacterSelection(){
  const buttons=document.querySelectorAll('#charSelect .char');
  buttons.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      SELECTED_HERO_KEY = btn.dataset.hero;
      SELECTED_HERO_NAME = (SELECTED_HERO_KEY==='shrimp') ? 'SHRIMP' : 'ANOMAGE';
      chosenNameEl.textContent = SELECTED_HERO_NAME;
    });
  });
}

async function boot(reuse=false){
  try{
    if(!reuse){ try{ ATLAS=normalizeAtlasPaths(await tryFetchSpritesJson()); document.getElementById('spritesState').innerHTML='Sprites <span class="ok">✔</span>'; } catch{ ATLAS=normalizeAtlasPaths(defaultAtlasJson()); warn.classList.add('show'); } }
    progressEl.textContent="cargando…";
    GAME.cache = await preloadAll(ATLAS,(n,t)=>progressEl.innerHTML=`<span class="ok">(${n}/${t})</span> ✔`);

    for(const p of uniquePropSrcs()) WORLD.propsImgs.set(p, GAME.cache[p]);

    GAME.player = new Player(GAME.cache, ATLAS, SELECTED_HERO_KEY);
    CAMERA.x=GAME.player.x; CAMERA.y=GAME.player.y; biomeEl.textContent=BIOME+1;
    regenerateBiome(); resetWave(); GAME.running=false;

    fitCanvas();
    drawHeroPreview('prev-anomage','anomage');
    drawHeroPreview('prev-shrimp','shrimp');
    hookCharacterSelection();

    let last=performance.now();
    (function loop(now){const dt=now-last; last=now; if(GAME.running){ update(dt); draw(); } else { draw(); } requestAnimationFrame(loop);})(last);
  }catch(err){ progressEl.textContent="Error: "+err.message; console.error(err); }
}

document.getElementById('btnStart').addEventListener('click',async ()=>{
  startDiv.classList.remove('show');
  try{ if(document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen(); }catch{}
  playMusic(BIOMES[BIOME].music);
  // recrea el player con el héroe elegido
  GAME.player = new Player(GAME.cache, ATLAS, SELECTED_HERO_KEY);
  GAME.running=true;
});
cv.addEventListener('mousedown',()=>{ if(GAME.running) shootPlayer(); });

// inicia
boot();



