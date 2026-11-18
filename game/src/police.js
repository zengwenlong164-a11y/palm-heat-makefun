import { SPEED, PRICES, COLORS, distance, clamp, angleDifference } from './config.js';
import { createCar } from './vehicles.js';
import { nearestRoadPoint, moveWithCollisions } from './world.js';

export function createPoliceState() {
  return { stars: 0, heat: 0, unseen: 0, bust: 0, spawnTimer: 0, crimeTime: -100, resprayCooldown: 0 };
}

export function addWantedHeat(game, severity) {
  const police = game.police;
  police.heat = Math.min(5, police.heat + severity);
  police.stars = clamp(Math.ceil(police.heat), 1, 5);
  police.unseen = 0;
  police.crimeTime = game.time;
}

export function setWantedStars(game, stars) {
  game.police.stars = stars;
  game.police.heat = stars;
  game.police.unseen = 0;
  game.police.crimeTime = game.time;
}

export function spawnPoliceCar(game, position) {
  const player = game.player;
  const angle = game.rng() * Math.PI * 2;
  const point = position || nearestRoadPoint(player.x + Math.cos(angle) * 630, player.y + Math.sin(angle) * 630);
  const car = createCar(point.x, point.y, Math.atan2(player.y - point.y, player.x - point.x), '#d2ded3', 'police');
  car.police = true;
  car.health = 145;
  car.maxHealth = 145;
  car.speed = 90;
  car.routeAxis = game.rng() < .5;
  game.cars.push(car);
  return car;
}

export function updatePolice(game, dt) {
  const state = game.police;
  const player = game.player;
  state.spawnTimer -= dt;
  state.resprayCooldown = Math.max(0, state.resprayCooldown - dt);
  const cops = game.cars.filter(car => car.police && car.health > 0);
  let nearest = Infinity;
  for (const car of cops) {
    const d = distance(car, player);
    nearest = Math.min(nearest, d);
    if (state.stars === 0) {
      car.speed *= Math.exp(-dt * 2);
      continue;
    }
    // Road-aligned pursuit chooses an intersection before crossing city blocks.
    const target = { x: player.x, y: player.y };
    if (Math.abs(car.x - player.x) > 120 && Math.abs(car.y - player.y) > 120) {
      const road = nearestRoadPoint(car.x, car.y);
      if (Math.abs(road.x - car.x) < 30) target.x = road.x;
      else target.y = road.y;
    }
    const aim = Math.atan2(target.y - car.y, target.x - car.x);
    const turn = angleDifference(aim, car.angle);
    car.angle += clamp(turn, -2.5 * dt, 2.5 * dt);
    const desired = (SPEED.police + state.stars * 13) * (Math.abs(turn) > 1 ? .5 : 1);
    car.speed += (desired - car.speed) * Math.min(1, dt * 1.3);
    const hit = moveWithCollisions(game.world, car, Math.cos(car.angle) * car.speed * dt,
      Math.sin(car.angle) * car.speed * dt, 18);
    if (hit) {
      car.speed *= .3;
      car.angle += (car.routeAxis ? 1 : -1) * dt * 3;
      car.turnCooldown -= dt;
      if (car.turnCooldown < -1.3) {
        car.routeAxis = !car.routeAxis;
        car.turnCooldown = 0;
      }
    }
    if (d < 34 && !player.car) {
      moveWithCollisions(game.world, player, Math.cos(car.angle) * dt * 25, Math.sin(car.angle) * dt * 25, 10);
    }
    // Police can only damage Rio at close range; distant stars are escapable.
    if (d < 145 && state.stars >= 3 && game.time - state.crimeTime > 3 && game.rng() < dt * .8) {
      player.health -= 3;
      game.effects.push({ x: player.x, y: player.y, kind: 'spark', life: .2, max: .2, vx: 30, vy: -30 });
    }
  }
  if (state.stars > 0) {
    if (state.spawnTimer <= 0 && cops.length < state.stars + 1) {
      spawnPoliceCar(game);
      state.spawnTimer = 4;
    }
    const slow = !player.car || Math.abs(player.car.speed) < 32;
    state.bust = clamp(state.bust + (nearest < 76 && slow ? dt * .23 : -dt * .2), 0, 1);
    if (state.bust >= 1) game.endRun('busted');
    if (nearest > 370 && game.time - state.crimeTime > 3) state.unseen += dt;
    else state.unseen = Math.max(0, state.unseen - dt * .5);
    if (state.unseen > 7) {
      state.stars--;
      state.heat = state.stars;
      state.unseen = 0;
      if (state.stars === 0) game.notify('Heat lost. The city looks the other way.');
    }
  } else state.bust = Math.max(0, state.bust - dt);
  const garage = game.world.locations.garage;
  if (player.car && distance(player, garage) < 75 && Math.abs(player.car.speed) < 48 &&
    state.resprayCooldown <= 0 && (state.stars > 0 || player.car.health < 80)) {
    if (game.cash >= PRICES.respray) {
      game.cash -= PRICES.respray;
      setWantedStars(game, 0);
      player.car.health = 100;
      player.car.color = game.rng.pick(COLORS.cars);
      state.resprayCooldown = 5;
      game.notify('Fresh paint, clean plates. −$250');
      game.audio.pickup();
      game.save();
    } else {
      state.resprayCooldown = 4;
      game.notify('Respray costs $250. Lose them on the streets.');
    }
  }
  // Remove only abandoned distant patrols, keeping the simulation bounded.
  game.cars = game.cars.filter(car => !car.police || distance(car, player) < 1500);
}
