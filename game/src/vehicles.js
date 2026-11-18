import { SPEED, COLORS, ROADS, STREETS, WORLD, clamp, distance, angleDifference } from './config.js';
import { moveWithCollisions, collidesWithBuilding } from './world.js';

export function createCar(x, y, angle, color, kind = 'traffic') {
  return {
    x, y, angle, color, kind,
    speed: 0, health: 100, maxHealth: 100,
    width: 25, length: 48, stolen: false,
    turnCooldown: 0, collisionCooldown: 0, smokeTimer: 0,
    route: null, routeIndex: 0, occupied: kind === 'traffic',
  };
}

export function populateVehicles(world, rng) {
  const cars = [];
  for (let n = 0; n < 52; n++) {
    const horizontal = n % 2 === 0;
    const forward = rng() > .5;
    const x = horizontal ? rng.range(130, 3000) : rng.pick(ROADS) + (forward ? 25 : -25);
    const y = horizontal ? rng.pick(STREETS) + (forward ? 25 : -25) : rng.range(130, 2230);
    const angle = horizontal ? (forward ? 0 : Math.PI) : (forward ? Math.PI / 2 : -Math.PI / 2);
    const car = createCar(x, y, angle, rng.pick(COLORS.cars));
    car.speed = SPEED.traffic * rng.range(.65, 1.2);
    cars.push(car);
  }
  for (let n = 0; n < 23; n++) {
    const x = rng.pick(ROADS) + 47;
    const y = 370 + Math.floor(n / 6) * 520 + rng.range(0, 100);
    cars.push(createCar(x, y, -Math.PI / 2, rng.pick(COLORS.cars), 'parked'));
  }
  const coupe = createCar(world.locations.coupe.x, world.locations.coupe.y, 0, '#f2ba57', 'coupe');
  coupe.marked = true;
  cars.push(coupe);
  return cars;
}

export function tryEnterOrLeaveCar(game) {
  const player = game.player;
  if (player.car) {
    const car = player.car;
    if (Math.abs(car.speed) > 65) {
      game.notify('Slow down before getting out.');
      return false;
    }
    // Try both doors, then the rear, so a wall never traps Rio.
    const offsets = [Math.PI / 2, -Math.PI / 2, Math.PI];
    for (const offset of offsets) {
      const x = car.x + Math.cos(car.angle + offset) * 42;
      const y = car.y + Math.sin(car.angle + offset) * 42;
      if (collidesWithBuilding(game.world, x, y, 11)) continue;
      player.x = x;
      player.y = y;
      player.car = null;
      car.speed *= .3;
      car.kind = car.police ? 'police' : car.rival ? 'rival' : 'parked';
      game.audio.ui();
      return true;
    }
    game.notify('The doors are blocked. Move the car.');
    return false;
  }
  const candidates = game.cars.filter(car => car.health > 0 && !car.police && distance(player, car) < 68);
  candidates.sort((a, b) => distance(player, a) - distance(player, b));
  const car = candidates[0];
  if (!car) {
    game.notify('Get closer to a car. E to take the wheel.');
    return false;
  }
  if (!car.stolen) {
    car.stolen = true;
    game.commitCrime(car.occupied ? 1 : .65);
    game.notify(car.marked ? 'Nice choice. Delia wants it at the garage.' : 'Vehicle acquired. Someone noticed.');
    if (car.occupied) {
      game.people.push({ x: car.x + 30, y: car.y + 30, angle: 1, health: 100, panic: 8, color: '#dfb887', phase: 0, turn: 1 });
    }
  }
  car.occupied = false;
  car.kind = 'player';
  player.car = car;
  player.x = car.x;
  player.y = car.y;
  game.audio.ui();
  return true;
}

export function drivePlayerCar(game, dt) {
  const car = game.player.car;
  if (!car) return;
  const input = game.input;
  const throttle = -input.axis('up', 'down');
  const steer = input.axis('left', 'right');
  const handbrake = input.down('Space');
  car.speed += throttle * (throttle * car.speed < 0 ? 510 : 210) * dt;
  car.speed *= Math.exp(-(handbrake ? 3.2 : throttle ? .2 : .8) * dt);
  car.speed = clamp(car.speed, -SPEED.reverse, SPEED.car * (car.health < 25 ? .65 : 1));
  const steering = clamp(Math.abs(car.speed) / 75, 0, 1);
  car.angle += steer * steering * (handbrake ? 3.25 : 2.1) * Math.sign(car.speed || 1) * dt;
  const impact = Math.abs(car.speed);
  const hit = moveWithCollisions(game.world, car, Math.cos(car.angle) * car.speed * dt,
    Math.sin(car.angle) * car.speed * dt, 19);
  if (hit) {
    car.speed *= -.27;
    if (impact > 60 && car.collisionCooldown <= 0) {
      damageCar(game, car, impact * .055);
      game.player.health -= impact * .008;
      car.collisionCooldown = .55;
      game.audio.crash();
    }
  }
  if (handbrake && impact > 110) {
    car.smokeTimer -= dt;
    if (car.smokeTimer <= 0) {
      game.effects.push({ x: car.x - Math.cos(car.angle) * 21, y: car.y - Math.sin(car.angle) * 21,
        kind: 'smoke', life: .8, max: .8, vx: 0, vy: -12 });
      game.skids.push({ x: car.x, y: car.y, angle: car.angle, life: 12 });
      car.smokeTimer = .055;
    }
  }
  game.player.x = car.x;
  game.player.y = car.y;
}

export function damageCar(game, car, amount) {
  if (car.health <= 0) return;
  car.health = Math.max(0, car.health - amount);
  game.shake = Math.min(12, game.shake + amount * .2);
  for (let n = 0; n < 7; n++) {
    game.effects.push({ x: car.x, y: car.y, kind: 'spark', life: .35, max: .35,
      vx: game.rng.range(-150, 150), vy: game.rng.range(-150, 150) });
  }
  if (car.health === 0) {
    car.speed = 0;
    if (game.player.car === car) {
      game.player.car = null;
      game.player.x = car.x + 42;
      game.player.y = car.y;
      game.player.health -= 18;
      game.notify('Engine gone. Find another ride.');
    }
    if (car.rival) game.notify('Rival disabled. Keep moving.');
    game.audio.crash();
  }
}

function updateTrafficCar(game, car, dt) {
  if (car.route) {
    const target = car.route[car.routeIndex];
    const aim = Math.atan2(target.y - car.y, target.x - car.x);
    car.angle += clamp(angleDifference(aim, car.angle), -2 * dt, 2 * dt);
    if (distance(car, target) < 38) car.routeIndex = (car.routeIndex + 1) % car.route.length;
  } else {
    const horizontal = Math.abs(Math.cos(car.angle)) > .8;
    const crossing = horizontal ? ROADS : STREETS;
    const coordinate = horizontal ? car.x : car.y;
    const intersection = crossing.find(v => Math.abs(v - coordinate) < 5);
    if (intersection !== undefined && car.turnCooldown <= 0 && game.rng() < .32) {
      car.angle += game.rng() < .5 ? Math.PI / 2 : -Math.PI / 2;
      car.turnCooldown = 3;
      if (horizontal) car.x = intersection + (Math.sin(car.angle) > 0 ? 25 : -25);
      else car.y = intersection + (Math.cos(car.angle) > 0 ? 25 : -25);
    }
  }
  const blocked = game.cars.some(other => other !== car && other.health > 0 &&
    distance(car, other) < 55 &&
    Math.abs(angleDifference(Math.atan2(other.y - car.y, other.x - car.x), car.angle)) < .6);
  const targetSpeed = blocked ? 0 : car.rival ? 110 : SPEED.traffic;
  car.speed += (targetSpeed - car.speed) * Math.min(1, dt * 2);
  const hit = moveWithCollisions(game.world, car, Math.cos(car.angle) * car.speed * dt,
    Math.sin(car.angle) * car.speed * dt, 18);
  if (hit) {
    car.angle += Math.PI;
    car.speed = 10;
    car.turnCooldown = 2;
  }
  if (car.x < 95 || car.x > WORLD.width - 95 || car.y < 95 || car.y > 2295) {
    car.angle += Math.PI;
    car.x = clamp(car.x, 100, WORLD.width - 100);
    car.y = clamp(car.y, 100, 2290);
  }
}

export function updateVehicles(game, dt) {
  drivePlayerCar(game, dt);
  for (const car of game.cars) {
    car.collisionCooldown = Math.max(0, car.collisionCooldown - dt);
    car.turnCooldown = Math.max(0, car.turnCooldown - dt);
    if (car.health <= 0) {
      if (game.rng() < dt * 5) game.effects.push({ x: car.x, y: car.y,
        kind: 'smoke', life: 1.5, max: 1.5, vx: 8, vy: -20 });
      continue;
    }
    if (car === game.player.car || car.police) continue;
    if (car.kind === 'traffic' || car.rival) updateTrafficCar(game, car, dt);
    else car.speed *= Math.exp(-dt * 4);
  }
  const playerCar = game.player.car;
  if (!playerCar) return;
  for (const other of game.cars) {
    if (other === playerCar || other.health <= 0 || distance(playerCar, other) > 39) continue;
    const dx = other.x - playerCar.x;
    const dy = other.y - playerCar.y;
    const d = Math.hypot(dx, dy) || 1;
    const overlap = 40 - d;
    moveWithCollisions(game.world, other, dx / d * overlap * .6, dy / d * overlap * .6, 18);
    moveWithCollisions(game.world, playerCar, -dx / d * overlap * .4, -dy / d * overlap * .4, 18);
    if (playerCar.collisionCooldown > 0) continue;
    const force = Math.abs(playerCar.speed - other.speed) + Math.abs(playerCar.speed) * .4;
    if (force > 55) {
      damageCar(game, other, force * (other.rival ? .38 : .11));
      damageCar(game, playerCar, force * .035);
      playerCar.speed *= .55;
      playerCar.collisionCooldown = .55;
      game.commitCrime(other.police ? 1 : .3);
      game.audio.crash();
    }
  }
}
