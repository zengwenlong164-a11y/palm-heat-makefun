import { distance } from './config.js';
import { collidesWithBuilding } from './world.js';
import { damageCar } from './vehicles.js';
import { panicPedestrians } from './people.js';

export function firePistol(game) {
  const player = game.player;
  if (player.fireCooldown > 0) return;
  const mouse = game.input.mouse;
  const x = game.camera.x + (mouse.x - game.width / 2) / game.camera.zoom;
  const y = game.camera.y + (mouse.y - game.height / 2) / game.camera.zoom;
  const angle = Math.atan2(y - player.y, x - player.x);
  player.angle = angle;
  player.fireCooldown = .24;
  const origin = { x: player.x + Math.cos(angle) * 25, y: player.y + Math.sin(angle) * 25 };
  game.bullets.push({ ...origin, angle, life: .7, vx: Math.cos(angle) * 1000, vy: Math.sin(angle) * 1000 });
  game.effects.push({ ...origin, angle, kind: 'muzzle', life: .08, max: .08, vx: 0, vy: 0 });
  game.audio.gunshot();
  game.shake = 2;
  game.commitCrime(.18);
  panicPedestrians(game, player);
}

function hitSpark(game, x, y) {
  for (let n = 0; n < 5; n++) {
    game.effects.push({ x, y, kind: 'spark', life: .25, max: .25,
      vx: game.rng.range(-120, 120), vy: game.rng.range(-120, 120) });
  }
}

export function updateCombat(game, dt) {
  game.player.fireCooldown = Math.max(0, game.player.fireCooldown - dt);
  if (game.input.mouse.down) firePistol(game);
  for (const bullet of game.bullets) {
    bullet.life -= dt;
    // Substeps keep fast bullets from tunnelling through narrow targets.
    for (let step = 0; step < 3 && bullet.life > 0; step++) {
      bullet.x += bullet.vx * dt / 3;
      bullet.y += bullet.vy * dt / 3;
      if (collidesWithBuilding(game.world, bullet.x, bullet.y, 1)) {
        hitSpark(game, bullet.x, bullet.y);
        bullet.life = 0;
        break;
      }
      const car = game.cars.find(c => c !== game.player.car && c.health > 0 && distance(c, bullet) < 25);
      if (car) {
        damageCar(game, car, 25);
        if (car.police) game.commitCrime(.7);
        bullet.life = 0;
        hitSpark(game, bullet.x, bullet.y);
        break;
      }
      const person = game.people.find(p => p.health > 0 && distance(p, bullet) < 11);
      if (person) {
        person.health = Math.max(0, person.health - 50);
        person.panic = 10;
        game.commitCrime(.6);
        bullet.life = 0;
        hitSpark(game, bullet.x, bullet.y);
      }
    }
  }
  game.bullets = game.bullets.filter(bullet => bullet.life > 0);
  for (const effect of game.effects) {
    effect.life -= dt;
    effect.x += effect.vx * dt;
    effect.y += effect.vy * dt;
  }
  game.effects = game.effects.filter(effect => effect.life > 0);
  for (const skid of game.skids) skid.life -= dt;
  game.skids = game.skids.filter(skid => skid.life > 0).slice(-300);
}
