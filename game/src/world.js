import { WORLD, ROADS, STREETS, ROAD_WIDTH, clamp } from './config.js';

export function generateCity(rng) {
  const buildings = [];
  const palms = [];
  const lamps = [];
  const decor = [];
  const palette = ['#b8bca5', '#d7bea0', '#94b7ab', '#c49488', '#d6ccad', '#91a6a6'];
  for (let row = 0; row < STREETS.length - 1; row++) {
    for (let col = 0; col < ROADS.length - 1; col++) {
      const left = ROADS[col] + 85;
      const top = STREETS[row] + 85;
      const width = ROADS[col + 1] - left - 85;
      const height = STREETS[row + 1] - top - 85;
      for (let q = 0; q < 4; q++) {
        const x = left + (q % 2) * (width / 2 + 5);
        const y = top + Math.floor(q / 2) * (height / 2 + 5);
        buildings.push({
          x: x + 8, y: y + 8,
          w: width / 2 - rng.range(18, 35),
          h: height / 2 - rng.range(20, 40),
          color: rng.pick(palette), floors: rng.int(1, 5),
          roof: rng.int(0, 3),
        });
      }
      for (let n = 0; n < 5; n++) {
        palms.push({ x: left - 15 + n * 74, y: top - 18, size: rng.range(.8, 1.3), phase: rng() * 6 });
      }
    }
  }
  for (const x of ROADS) {
    for (let y = 110; y < 2250; y += 170) {
      lamps.push({ x: x - 68, y });
      if (rng() > .4) palms.push({ x: x + 74, y: y + 48, size: 1, phase: rng() * 6 });
    }
  }
  for (let x = 100; x < WORLD.width; x += 115) {
    palms.push({ x, y: 2383 + rng.range(-12, 12), size: rng.range(1, 1.5), phase: rng() * 6 });
    decor.push({ x: x + 20, y: 2490 + rng.range(-30, 30), type: 'umbrella', color: rng.pick(['#d96f71', '#5ca89f', '#e2b568']) });
  }
  for (let n = 0; n < 14; n++) {
    decor.push({ x: 2000 + n % 7 * 92, y: 1970 + Math.floor(n / 7) * 90, type: 'container', color: rng.pick(['#b96c56', '#5f9590', '#b69e60']) });
  }
  const locations = {
    garage: { x: 760, y: 990, name: 'VOSS / RESPRAY', radius: 78 },
    coupe: { x: 325, y: 760, name: 'MARKED COUPE' },
    package: { x: 1280, y: 550, name: 'DEAD DROP' },
    delivery: { x: 2320, y: 1670, name: 'THE EXCHANGE' },
    harbor: { x: 2840, y: 2130, name: 'HARBOR LOCKER' },
    score: [
      { x: 1800, y: 430, name: 'HEIGHTS VAULT' },
      { x: 2840, y: 1410, name: 'HARBOR CASH' },
      { x: 1280, y: 2240, name: 'BEACH EXCHANGE' },
    ],
  };
  return { buildings, palms, lamps, decor, locations };
}

export function collidesWithBuilding(world, x, y, radius = 12) {
  if (x < radius || y < radius || x > WORLD.width - radius || y > WORLD.water - radius) return true;
  return world.buildings.some(b => x + radius > b.x && x - radius < b.x + b.w &&
    y + radius > b.y && y - radius < b.y + b.h);
}

export function moveWithCollisions(world, entity, dx, dy, radius) {
  let hit = false;
  if (!collidesWithBuilding(world, entity.x + dx, entity.y, radius)) entity.x += dx;
  else hit = true;
  if (!collidesWithBuilding(world, entity.x, entity.y + dy, radius)) entity.y += dy;
  else hit = true;
  entity.x = clamp(entity.x, radius, WORLD.width - radius);
  entity.y = clamp(entity.y, radius, WORLD.water - radius);
  return hit;
}

export function getDistrict(x, y) {
  if (y > 2300) return 'Palms Beach';
  if (y > 1720 && x > 1600) return 'Harbor District';
  return x > 1600 ? 'Coral Heights' : 'Downtown';
}

export function nearestRoadPoint(x, y) {
  const rx = ROADS.reduce((a, b) => Math.abs(a - x) < Math.abs(b - x) ? a : b);
  const ry = STREETS.reduce((a, b) => Math.abs(a - y) < Math.abs(b - y) ? a : b);
  return Math.abs(rx - x) < Math.abs(ry - y) ? { x: rx, y: clamp(y, 140, 2240) } : { x: clamp(x, 140, 2900), y: ry };
}

export function isIntersection(x, y, tolerance = ROAD_WIDTH * .45) {
  return ROADS.some(v => Math.abs(v - x) < tolerance) && STREETS.some(v => Math.abs(v - y) < tolerance);
}
