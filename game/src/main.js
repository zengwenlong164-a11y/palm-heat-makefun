import { SAVE_KEY, clamp } from './config.js';
import { createRng } from './rng.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { generateCity, collidesWithBuilding } from './world.js';
import { populateVehicles, updateVehicles, tryEnterOrLeaveCar } from './vehicles.js';
import { createPlayer, populatePedestrians, updatePlayerOnFoot, updatePedestrians } from './people.js';
import { createPoliceState, addWantedHeat, updatePolice } from './police.js';
import { updateCombat } from './combat.js';
import { createMissionState, beginMission, updateMissions } from './missions.js';
import { renderWorld, updateCamera } from './render.js';
import { renderHud } from './hud.js';
import { prepareScreenshotScene } from './shots.js';

const canvas = document.querySelector('#game');
const menu = document.querySelector('#menu');
const heading = document.querySelector('#heading');
const story = document.querySelector('#story');
const newButton = document.querySelector('#new');
const continueButton = document.querySelector('#continue');
const controls = document.querySelector('#controls');
const edition = document.querySelector('#edition');
const status = document.querySelector('#status');
const titleStory = story.innerHTML;
const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed')) || 7;
const input = createInput(canvas);
const audio = createAudio();

export const game = {
  canvas, ctx: canvas.getContext('2d'), input, audio,
  width: innerWidth, height: innerHeight,
  camera: { x: 700, y: 760, zoom: 1 },
  screen: 'title', time: 0, cash: 400,
  effects: [], bullets: [], skids: [], shake: 0,
  notice: '', noticeTimer: 0, completeTimer: 0,
  frozen: false, shot: '', saveTimer: 0,
  reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
  notify(message, duration = 5) {
    this.notice = message;
    this.noticeTimer = duration;
    status.textContent = message;
  },
  commitCrime(severity) { addWantedHeat(this, severity); },
  save() { saveProgress(); },
  endRun(screen) {
    if (this.screen !== 'playing') return;
    this.screen = screen;
    this.cash = Math.max(0, this.cash - 200);
    this.save();
    updateMenu();
  },
  step(dt, screenshot = false) { simulateStep(dt, screenshot); },
};

export function resetGame(saved = null) {
  game.rng = createRng(seed);
  game.world = generateCity(game.rng);
  game.cars = populateVehicles(game.world, game.rng);
  game.people = populatePedestrians(game.rng);
  game.player = createPlayer();
  game.police = createPoliceState();
  game.mission = createMissionState(saved?.mission || 0);
  game.cash = saved?.cash ?? 400;
  game.effects = [];
  game.bullets = [];
  game.skids = [];
  game.time = 0;
  game.shake = 0;
  game.completeTimer = 0;
  game.noticeTimer = 0;
  game.saveTimer = 0;
  game.frozen = false;
  game.shot = '';
  if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y) &&
    !collidesWithBuilding(game.world, saved.x, saved.y, 12)) {
    game.player.x = saved.x;
    game.player.y = saved.y;
  }
  updateCamera(game, 1, true);
}

function readSave() {
  try {
    const save = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (save?.version !== 1 || !Number.isFinite(save.cash) || !Number.isInteger(save.mission)) return null;
    return { ...save, cash: clamp(save.cash, 0, 99999999), mission: clamp(save.mission, 0, 5) };
  } catch { return null; }
}

function saveProgress() {
  if (game.shot) return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      version: 1, cash: game.cash, mission: game.mission.index,
      x: game.player.x, y: game.player.y,
    }));
  } catch {
    game.notify('Storage unavailable. This session still plays normally.');
  }
}

function startGame(saved = null) {
  audio.unlock();
  resetGame(saved);
  game.screen = 'playing';
  beginMission(game);
  updateMenu();
  saveProgress();
}

function respawnPlayer() {
  const saved = { cash: game.cash, mission: game.mission.index, x: 760, y: 1090 };
  startGame(saved);
  game.notify('DELIA VOSS: Patched you up. That cost $200. Try again, Rio.', 7);
}

function updateMenu() {
  menu.hidden = game.screen === 'playing';
  edition.hidden = game.screen !== 'title';
  controls.hidden = game.screen !== 'title' && game.screen !== 'paused';
  if (game.screen === 'title') {
    heading.innerHTML = '<span>PALM</span><span>HEAT</span>';
    story.innerHTML = titleStory;
    newButton.textContent = 'NEW GAME';
    continueButton.textContent = 'CONTINUE';
    continueButton.hidden = Boolean(game.shot) || !readSave();
  } else if (game.screen === 'paused') {
    heading.innerHTML = '<span>TAKE</span><span>A BREATH</span>';
    story.textContent = 'The city can wait. Progress saved. P to resume.';
    newButton.textContent = 'RESUME';
    continueButton.textContent = 'TITLE';
    continueButton.hidden = false;
  } else if (game.screen === 'busted' || game.screen === 'wasted') {
    heading.textContent = game.screen.toUpperCase();
    story.textContent = game.screen === 'busted' ? 'Coral Bay PD took their cut. −$200. Delia can get you out.' : 'The city hit back. −$200 for a second chance. Delia still needs her wheelman.';
    newButton.textContent = 'TRY AGAIN';
    continueButton.textContent = 'TITLE';
    continueButton.hidden = false;
  }
}

newButton.addEventListener('click', () => {
  if (game.screen === 'title') startGame();
  else if (game.screen === 'paused') {
    audio.unlock();
    game.screen = 'playing';
    updateMenu();
  } else respawnPlayer();
});

continueButton.addEventListener('click', () => {
  if (game.screen === 'title') startGame(readSave());
  else {
    saveProgress();
    game.screen = 'title';
    updateMenu();
  }
});

export function simulateStep(dt, screenshot = false) {
  game.time += dt;
  game.noticeTimer = Math.max(0, game.noticeTimer - dt);
  game.completeTimer = Math.max(0, game.completeTimer - dt);
  game.shake *= Math.exp(-dt * 8);
  updatePlayerOnFoot(game, dt);
  updateVehicles(game, dt);
  updatePedestrians(game, dt);
  updateCombat(game, dt);
  // Deliveries settle before garage service charges and police arrest checks.
  updateMissions(game, dt);
  updatePolice(game, dt);
  game.player.health = clamp(game.player.health, 0, 100);
  if (game.player.health <= 0) game.endRun('wasted');
  updateCamera(game, dt);
  if (!screenshot) {
    game.saveTimer += dt;
    if (game.saveTimer > 4) {
      saveProgress();
      game.saveTimer = 0;
    }
  }
}

function resizeCanvas() {
  game.width = innerWidth;
  game.height = innerHeight;
  const ratio = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(game.width * ratio);
  canvas.height = Math.round(game.height * ratio);
  game.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  if (game.player) updateCamera(game, 1, true);
}

window.addEventListener('resize', resizeCanvas);
window.addEventListener('pagehide', saveProgress);
document.addEventListener('visibilitychange', () => {
  input.held.clear();
  input.mouse.down = false;
  if (document.hidden && game.screen === 'playing' && !game.shot) {
    saveProgress();
    game.screen = 'paused';
    updateMenu();
  }
});

let previous = 0;
let accumulator = 0;
function frame(now) {
  const elapsed = Math.min((now - previous) / 1000 || 0, .08);
  previous = now;
  if (input.tap('KeyM')) audio.mute();
  if (input.tap('KeyP') && !game.shot) {
    if (game.screen === 'playing') {
      saveProgress();
      game.screen = 'paused';
    } else if (game.screen === 'paused') game.screen = 'playing';
    updateMenu();
  }
  if (game.screen === 'playing' && !game.frozen) {
    if (input.tap('KeyE')) tryEnterOrLeaveCar(game);
    accumulator += elapsed;
    while (accumulator >= 1 / 60) {
      simulateStep(1 / 60);
      accumulator -= 1 / 60;
      if (game.screen !== 'playing') { accumulator = 0; break; }
    }
  } else accumulator = 0;
  input.clear();
  audio.update(game.player.car?.speed ?? null, game.police.stars, game.time, game.screen === 'playing' && !game.frozen);
  renderWorld(game);
  if (game.screen !== 'title') renderHud(game);
  requestAnimationFrame(frame);
}

resizeCanvas();
resetGame();
const shot = params.get('shot');
if (['title', 'cover', 'chase', 'foot'].includes(shot)) prepareScreenshotScene(game, shot);
else {
  game.player.x = 1040;
  game.player.y = 2240;
  updateCamera(game, 1, true);
}
updateMenu();
// Exposed state supports reproducible browser checks without hidden cheat keys.
window.palmHeat = { game, startGame, readSave };
requestAnimationFrame(frame);
