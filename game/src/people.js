import { SPEED, ROADS, STREETS, distance } from './config.js';
import { moveWithCollisions } from './world.js';

export function createPlayer() {
  return { x: 275, y: 803, angle: 0, health: 100, car: null, fireCooldown: 0, step: 0 };
}

export function populatePedestrians(rng) {
  const people = [];
  for (let n = 0; n < 110; n++) {
    const beach = n > 79;
    const horizontal = n % 2 === 0;
    people.push({
      x: beach ? rng.range(100, 3000) : horizontal ? rng.range(160, 3000) : rng.pick(ROADS) + rng.pick([-77, 77]),
      y: beach ? rng.range(2395, 2520) : horizontal ? rng.pick(STREETS) + rng.pick([-77, 77]) : rng.range(180, 2230),
      angle: rng() * Math.PI * 2,
      health: 100, panic: 0, turn: rng.range(1, 4), phase: rng() * 6,
      color: rng.pick(['#d98278', '#ead4a3', '#88bdb6', '#d4a85f', '#a7a4c2', '#e4e2cc']),
    });
  }
  return people;
}

export function updatePlayerOnFoot(game, dt) {
  const player = game.player;
  if (player.car) return;
  let dx = game.input.axis('left', 'right');
  let dy = game.input.axis('up', 'down');
  const length = Math.hypot(dx, dy);
  if (length > 0) {
    dx /= length;
    dy /= length;
    const speed = game.input.down('ShiftLeft') || game.input.down('ShiftRight') ? SPEED.run : SPEED.walk;
    moveWithCollisions(game.world, player, dx * speed * dt, dy * speed * dt, 10);
    player.step += dt * speed * .08;
  }
  const mouse = game.input.mouse;
  const aimX = game.camera.x + (mouse.x - game.width / 2) / game.camera.zoom;
  const aimY = game.camera.y + (mouse.y - game.height / 2) / game.camera.zoom;
  player.angle = Math.atan2(aimY - player.y, aimX - player.x);
}

export function panicPedestrians(game, point, radius = 290) {
  for (const person of game.people) {
    if (distance(person, point) < radius) {
      person.panic = 6;
      person.angle = Math.atan2(person.y - point.y, person.x - point.x);
    }
  }
}

export function updatePedestrians(game, dt) {
  for (const person of game.people) {
    if (person.health <= 0) continue;
    person.panic = Math.max(0, person.panic - dt);
    person.turn -= dt;
    person.phase += dt * (person.panic ? 12 : 4);
    if (person.turn <= 0) {
      person.turn = game.rng.range(1.5, 4);
      if (person.panic) person.angle = Math.atan2(person.y - game.player.y, person.x - game.player.x);
      else person.angle += game.rng.range(-1, 1);
    }
    const speed = person.panic ? 105 : 23;
    if (moveWithCollisions(game.world, person, Math.cos(person.angle) * speed * dt,
      Math.sin(person.angle) * speed * dt, 8)) person.angle += Math.PI * .7;
    if (game.player.car && Math.abs(game.player.car.speed) > 60 && distance(person, game.player) < 29) {
      person.health = 0;
      game.player.car.speed *= .87;
      game.commitCrime(1.15);
      panicPedestrians(game, person);
      game.shake = 4;
    }
    if (!game.player.car && person.panic === 0 && distance(person, game.player) < 23) {
      person.angle += Math.PI / 2;
    }
  }
}
