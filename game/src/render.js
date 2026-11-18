import { WORLD, ROADS, STREETS, ROAD_WIDTH, COLORS, clamp, distance } from './config.js';
import { getDistrict } from './world.js';

export function roundedRect(ctx, x, y, w, h, r, fill, stroke) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
}

export function drawText(ctx, text, x, y, size = 12, color = '#fff0ce', weight = 'normal', align = 'left') {
  ctx.font = `${weight} ${size}px Arial, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(text, x, y);
  ctx.textAlign = 'left';
}

export function updateCamera(game, dt, instant = false) {
  const car = game.player.car;
  const look = car ? car.speed * .33 : 0;
  let x = game.player.x + (car ? Math.cos(car.angle) * look : 0);
  let y = game.player.y + (car ? Math.sin(car.angle) * look : 0);
  const zoom = game.shot === 'title' ? .88 : game.player.car ? 1.02 : 1.15;
  x = clamp(x, game.width / zoom / 2 - 70, WORLD.width - game.width / zoom / 2 + 70);
  y = clamp(y, game.height / zoom / 2 - 70, WORLD.height - game.height / zoom / 2 + 70);
  const factor = instant ? 1 : 1 - Math.exp(-dt * 5);
  game.camera.x += (x - game.camera.x) * factor;
  game.camera.y += (y - game.camera.y) * factor;
  game.camera.zoom += (zoom - game.camera.zoom) * factor;
}

function visible(game, item, padding = 220) {
  const camera = game.camera;
  return Math.abs(item.x - camera.x) < game.width / camera.zoom / 2 + padding &&
    Math.abs(item.y - camera.y) < game.height / camera.zoom / 2 + padding;
}

function drawOcean(ctx, game) {
  ctx.fillStyle = COLORS.water;
  ctx.fillRect(0, WORLD.water, WORLD.width, WORLD.height - WORLD.water + 500);
  ctx.fillStyle = '#509f9f';
  ctx.fillRect(0, WORLD.water, WORLD.width, 28);
  ctx.fillStyle = '#83bcb1';
  ctx.fillRect(0, WORLD.water - 5, WORLD.width, 12);
  ctx.strokeStyle = '#b5d4ba';
  ctx.lineWidth = 3;
  for (let y = WORLD.water + 14; y < WORLD.height + 100; y += 44) {
    ctx.beginPath();
    for (let x = 0; x <= WORLD.width; x += 16) {
      const wave = Math.sin(x / 83 + y / 20 + game.time * .6) * 5;
      if (x === 0) ctx.moveTo(x, y + wave);
      else ctx.lineTo(x, y + wave);
    }
    ctx.globalAlpha = .45 - (y - WORLD.water) / 900;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // Boardwalk planks and the low seawall.
  ctx.fillStyle = '#a69d7c';
  ctx.fillRect(0, 2310, WORLD.width, 39);
  ctx.strokeStyle = '#d5c99f';
  ctx.lineWidth = 1;
  for (let x = 0; x < WORLD.width; x += 15) {
    ctx.beginPath();
    ctx.moveTo(x, 2312);
    ctx.lineTo(x, 2347);
    ctx.stroke();
  }
  ctx.fillStyle = '#e8d5af';
  ctx.fillRect(0, 2346, WORLD.width, 5);
}

function drawRoads(ctx) {
  const half = ROAD_WIDTH / 2;
  ctx.fillStyle = COLORS.sidewalk;
  for (const x of ROADS) ctx.fillRect(x - half - 19, 0, ROAD_WIDTH + 38, 2310);
  for (const y of STREETS) ctx.fillRect(0, y - half - 19, WORLD.width, ROAD_WIDTH + 38);
  ctx.fillStyle = COLORS.asphalt;
  for (const x of ROADS) ctx.fillRect(x - half, 0, ROAD_WIDTH, 2310);
  for (const y of STREETS) ctx.fillRect(0, y - half, WORLD.width, ROAD_WIDTH);
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#c8bb87';
  ctx.setLineDash([24, 24]);
  for (const x of ROADS) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 2300);
    ctx.stroke();
  }
  for (const y of STREETS) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WORLD.width, y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  for (const x of ROADS) {
    for (const y of STREETS) {
      ctx.fillStyle = COLORS.asphalt;
      ctx.fillRect(x - 53, y - 53, 106, 106);
      ctx.fillStyle = '#b4b9a7';
      for (let stripe = -41; stripe < 47; stripe += 13) {
        ctx.fillRect(x + stripe, y - 70, 7, 15);
        ctx.fillRect(x + stripe, y + 55, 7, 15);
        ctx.fillRect(x - 70, y + stripe, 15, 7);
        ctx.fillRect(x + 55, y + stripe, 15, 7);
      }
      ctx.fillStyle = '#e4d4a7';
      for (const offset of [-1, 1]) {
        ctx.fillRect(x + offset * 63 - 3, y - 79, 6, 13);
        ctx.fillRect(x - 79, y + offset * 63 - 3, 13, 6);
      }
    }
  }
  // Parking lines on curb lanes make empty streets feel inhabited.
  ctx.strokeStyle = '#82928b';
  ctx.lineWidth = 1;
  for (const x of ROADS) {
    for (let y = 340; y < 2220; y += 65) {
      if (STREETS.some(v => Math.abs(v - y) < 100)) continue;
      ctx.strokeRect(x + 37, y, 16, 49);
    }
  }
}

function drawBuilding(ctx, building) {
  const { x, y, w, h, color, floors, roof } = building;
  const depth = 9 + floors * 3;
  // Offset shadows provide a readable, sunlit miniature-city silhouette.
  ctx.fillStyle = 'rgba(17,43,43,.23)';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w + depth * 1.5, y + depth);
  ctx.lineTo(x + w + depth * 1.5, y + h + depth);
  ctx.lineTo(x + depth * 1.5, y + h + depth);
  ctx.closePath();
  ctx.fill();
  roundedRect(ctx, x, y, w, h, 3, '#5f7771');
  ctx.fillStyle = color;
  ctx.fillRect(x - 3, y - 7, w, h);
  ctx.strokeStyle = '#e4d9b6';
  ctx.lineWidth = 3;
  ctx.strokeRect(x + 2, y - 2, w - 10, h - 10);
  ctx.fillStyle = 'rgba(25,65,64,.2)';
  ctx.fillRect(x + 10, y + 7, w - 25, 4);
  ctx.fillRect(x + 10, y + 7, 4, h - 28);
  // Rooftop units, vents, pools and solar screens.
  if (roof === 0) {
    roundedRect(ctx, x + 25, y + 25, w - 57, h - 62, 7, '#d7d2b7');
    roundedRect(ctx, x + 31, y + 31, w - 69, h - 74, 5, '#5aabab');
    ctx.fillStyle = '#a5d2c4';
    ctx.fillRect(x + 38, y + 37, w - 83, 3);
  } else if (roof === 1) {
    ctx.fillStyle = '#436873';
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(x + 20 + i * 33, y + 26, 26, 45);
      ctx.strokeStyle = '#7aa2a4';
      ctx.strokeRect(x + 20 + i * 33, y + 26, 26, 45);
    }
  } else {
    for (let i = 0; i < 2; i++) {
      const ux = x + 22 + i * 54;
      roundedRect(ctx, ux + 4, y + 28, 39, 31, 2, '#7e8c80');
      roundedRect(ctx, ux, y + 23, 39, 31, 2, '#d5d1b7', '#86998b');
      ctx.beginPath();
      ctx.arc(ux + 19, y + 38, 10, 0, Math.PI * 2);
      ctx.strokeStyle = '#82958b';
      ctx.stroke();
      ctx.fillStyle = '#82958b';
      ctx.fillRect(ux + 11, y + 36, 16, 3);
    }
  }
  ctx.fillStyle = '#3a6668';
  for (let wx = x + 12; wx < x + w - 12; wx += 23) ctx.fillRect(wx, y + h - 5, 13, 5);
  // Ground-floor awning.
  if (floors < 3) {
    ctx.fillStyle = '#d47b70';
    ctx.fillRect(x + 15, y + h + 3, w - 35, 8);
    ctx.fillStyle = '#f1d2a5';
    for (let ax = x + 18; ax < x + w - 23; ax += 15) ctx.fillRect(ax, y + h + 3, 5, 8);
  }
}

function drawPalm(ctx, palm, time) {
  const { x, y, size, phase } = palm;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);
  ctx.strokeStyle = 'rgba(18,52,43,.23)';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(2, 4);
  ctx.lineTo(36, 29);
  ctx.stroke();
  ctx.strokeStyle = '#8c7955';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(0, 5);
  ctx.quadraticCurveTo(4, -7, -3, -19);
  ctx.stroke();
  ctx.translate(-3, -19);
  const sway = Math.sin(time * .65 + phase) * .08;
  for (let leaf = 0; leaf < 7; leaf++) {
    ctx.save();
    ctx.rotate(leaf * Math.PI * 2 / 7 + phase + sway);
    ctx.fillStyle = leaf % 2 ? '#347d64' : '#438e6d';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(13, -20, 39, -9);
    ctx.quadraticCurveTo(21, -5, 0, 0);
    ctx.fill();
    ctx.strokeStyle = '#79a476';
    ctx.lineWidth = .8;
    ctx.beginPath();
    ctx.moveTo(1, -1);
    ctx.quadraticCurveTo(18, -13, 35, -9);
    ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle = '#c3b270';
  ctx.beginPath();
  ctx.arc(0, 0, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawDecor(ctx, item) {
  if (item.type === 'umbrella') {
    ctx.fillStyle = 'rgba(30,52,45,.15)';
    ctx.beginPath();
    ctx.ellipse(item.x + 12, item.y + 10, 25, 16, .4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f0ddb5';
    ctx.fillRect(item.x + 26, item.y + 4, 12, 30);
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(item.x, item.y);
      ctx.arc(item.x, item.y, 22, i * Math.PI / 4, (i + 1) * Math.PI / 4);
      ctx.closePath();
      ctx.fillStyle = i % 2 ? '#efdab6' : item.color;
      ctx.fill();
    }
  } else {
    roundedRect(ctx, item.x + 7, item.y + 7, 77, 39, 2, 'rgba(20,50,47,.22)');
    roundedRect(ctx, item.x, item.y, 77, 39, 2, item.color, '#4b6b65');
    ctx.strokeStyle = 'rgba(245,230,184,.28)';
    for (let x = 8; x < 72; x += 9) {
      ctx.beginPath();
      ctx.moveTo(item.x + x, item.y + 4);
      ctx.lineTo(item.x + x, item.y + 35);
      ctx.stroke();
    }
  }
}

function drawGarage(ctx, game) {
  const garage = game.world.locations.garage;
  ctx.fillStyle = '#65a99a';
  ctx.fillRect(garage.x - 51, garage.y - 70, 102, 140);
  ctx.strokeStyle = '#b3e5be';
  ctx.lineWidth = 2;
  ctx.setLineDash([9, 7]);
  ctx.strokeRect(garage.x - 48, garage.y - 67, 96, 134);
  ctx.setLineDash([]);
  ctx.save();
  ctx.translate(garage.x, garage.y);
  ctx.rotate(-Math.PI / 2);
  drawText(ctx, 'VOSS RESPRAY', 0, 5, 14, '#e1f0c8', 'bold', 'center');
  ctx.restore();
  roundedRect(ctx, garage.x + 66, garage.y - 26, 139, 48, 3, '#193f3c', '#7bc4ab');
  drawText(ctx, 'VOSS / RESPRAY', garage.x + 135, garage.y - 5, 12, '#b5efd0', 'bold', 'center');
  drawText(ctx, 'CLEAN PLATES  $250', garage.x + 135, garage.y + 12, 9, '#dfd9ad', 'normal', 'center');
}

export function drawCar(ctx, car, time) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  const dead = car.health <= 0;
  roundedRect(ctx, -20, -9, 49, 27, 7, 'rgba(9,30,31,.3)');
  ctx.fillStyle = '#173334';
  ctx.fillRect(-17, -16, 12, 5);
  ctx.fillRect(10, -16, 12, 5);
  ctx.fillRect(-17, 11, 12, 5);
  ctx.fillRect(10, 11, 12, 5);
  roundedRect(ctx, -25, -13, 50, 26, 5, dead ? '#555f55' : car.color, '#273f3d');
  roundedRect(ctx, -10, -11, 25, 22, 3, dead ? '#354746' : '#37636a');
  ctx.fillStyle = dead ? '#758078' : car.police ? '#dce2cc' : car.color;
  ctx.fillRect(-5, -10, 13, 20);
  ctx.fillStyle = '#7db0b0';
  ctx.fillRect(10, -9, 4, 18);
  ctx.fillStyle = '#f5e5af';
  ctx.fillRect(22, -10, 3, 6);
  ctx.fillRect(22, 4, 3, 6);
  ctx.fillStyle = '#e8786f';
  ctx.fillRect(-25, -10, 3, 5);
  ctx.fillRect(-25, 5, 3, 5);
  ctx.strokeStyle = '#cad4bd';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(16, -11);
  ctx.lineTo(16, 11);
  ctx.stroke();
  if (car.marked && !dead) {
    ctx.fillStyle = '#ffe7a0';
    ctx.fillRect(-23, -3, 46, 2);
    ctx.fillRect(-23, 2, 46, 2);
  }
  if (car.police) {
    ctx.fillStyle = '#1b383c';
    ctx.fillRect(-4, -11, 11, 22);
    ctx.fillStyle = Math.sin(time * 15) > 0 ? '#fc8079' : '#663f4c';
    ctx.fillRect(-2, -10, 6, 8);
    ctx.fillStyle = Math.sin(time * 15) < 0 ? '#84d5ff' : '#3e6075';
    ctx.fillRect(-2, 2, 6, 8);
    drawText(ctx, 'CBPD', -15, 3, 5, '#e5dfc2', 'bold', 'center');
  }
  if (car.rival) {
    ctx.fillStyle = '#e0be84';
    ctx.fillRect(-19, -2, 39, 4);
  }
  if (car.health < 50 && !dead) {
    ctx.strokeStyle = '#374c47';
    ctx.beginPath();
    ctx.moveTo(18, -8);
    ctx.lineTo(13, 0);
    ctx.lineTo(22, 6);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawPerson(ctx, person, player = false) {
  ctx.save();
  ctx.translate(person.x, person.y);
  ctx.rotate(person.angle);
  if (person.health <= 0) {
    roundedRect(ctx, -12, -5, 24, 10, 4, '#617c71');
    ctx.restore();
    return;
  }
  ctx.fillStyle = 'rgba(22,46,42,.25)';
  ctx.beginPath();
  ctx.ellipse(5, 5, 10, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  const stride = Math.sin(person.phase || person.step || 0) * 3;
  roundedRect(ctx, -4 + stride, -7, 10, 5, 2, '#2a4a4a');
  roundedRect(ctx, -4 - stride, 2, 10, 5, 2, '#2a4a4a');
  roundedRect(ctx, -5, -9, 11, 18, 5, player ? '#f1ddbb' : person.color);
  ctx.fillStyle = '#b78058';
  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2a3c36';
  ctx.beginPath();
  ctx.arc(-2, 0, 4, Math.PI / 2, Math.PI * 1.5);
  ctx.fill();
  if (player) {
    roundedRect(ctx, 3, 4, 13, 4, 2, '#b78058');
    ctx.fillStyle = '#233d3d';
    ctx.fillRect(12, 3, 10, 3);
    ctx.fillStyle = '#d7786c';
    ctx.fillRect(-4, -8, 3, 16);
  }
  ctx.restore();
}

function drawObjectiveMarker(ctx, game) {
  const point = game.mission.objective;
  if (!point || !visible(game, point)) return;
  const pulse = Math.sin(game.time * 3) * 4;
  ctx.strokeStyle = '#ffd778';
  ctx.lineWidth = 2;
  ctx.fillStyle = 'rgba(255,210,110,.11)';
  ctx.beginPath();
  ctx.arc(point.x, point.y, 36 + pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.save();
  ctx.translate(point.x, point.y - 60 - pulse);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = '#ffd778';
  ctx.fillRect(-7, -7, 14, 14);
  ctx.restore();
  const name = point.name || (point.rival ? 'RIVAL' : 'GOLD COUPE');
  drawText(ctx, name, point.x, point.y - 84 - pulse, 10, '#ffe5a5', 'bold', 'center');
}

function drawEffects(ctx, game) {
  for (const bullet of game.bullets) {
    ctx.strokeStyle = '#fff1b4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bullet.x, bullet.y);
    ctx.lineTo(bullet.x - bullet.vx * .018, bullet.y - bullet.vy * .018);
    ctx.stroke();
  }
  for (const effect of game.effects) {
    const ratio = effect.life / effect.max;
    ctx.globalAlpha = ratio;
    if (effect.kind === 'smoke') {
      ctx.fillStyle = '#c7c5ad';
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, 4 + (1 - ratio) * 20, 0, Math.PI * 2);
      ctx.fill();
    } else if (effect.kind === 'muzzle') {
      ctx.save();
      ctx.translate(effect.x, effect.y);
      ctx.rotate(effect.angle);
      ctx.fillStyle = '#ffe59a';
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(20, 0);
      ctx.lineTo(0, 6);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.strokeStyle = '#ffdb88';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(effect.x, effect.y);
      ctx.lineTo(effect.x - effect.vx * .045, effect.y - effect.vy * .045);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

export function renderWorld(game) {
  const ctx = game.ctx;
  const camera = game.camera;
  ctx.fillStyle = '#315e5e';
  ctx.fillRect(0, 0, game.width, game.height);
  ctx.save();
  const shake = game.reducedMotion ? 0 : game.shake;
  ctx.translate(game.width / 2 + Math.sin(game.time * 93) * shake,
    game.height / 2 + Math.cos(game.time * 81) * shake);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -camera.y);
  ctx.fillStyle = COLORS.grass;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  ctx.fillStyle = COLORS.sand;
  ctx.fillRect(0, WORLD.beach, WORLD.width, WORLD.height - WORLD.beach);
  drawOcean(ctx, game);
  drawRoads(ctx);
  // Faint road names are printed in-world rather than glued to the camera.
  for (const y of STREETS) {
    const names = ['SUNSET AVENUE', 'OCEAN DRIVE', 'VOSS BOULEVARD', 'DOCK STREET', 'PALMS ESPLANADE'];
    drawText(ctx, names[STREETS.indexOf(y)], 950, y - 31, 10, '#82958f', 'bold', 'center');
  }
  drawText(ctx, 'PALMS BEACH', 1120, 2440, 30, '#baad85', 'bold', 'center');
  for (const building of game.world.buildings) if (visible(game, building, 350)) drawBuilding(ctx, building);
  for (const item of game.world.decor) if (visible(game, item)) drawDecor(ctx, item);
  drawGarage(ctx, game);
  for (const skid of game.skids) {
    ctx.save();
    ctx.translate(skid.x, skid.y);
    ctx.rotate(skid.angle);
    ctx.globalAlpha = Math.min(.28, skid.life / 20);
    ctx.fillStyle = '#152e30';
    ctx.fillRect(-16, -13, 22, 3);
    ctx.fillRect(-16, 10, 22, 3);
    ctx.restore();
  }
  for (const person of game.people) if (visible(game, person)) drawPerson(ctx, person);
  for (const car of game.cars) if (visible(game, car)) drawCar(ctx, car, game.time);
  if (!game.player.car) {
    ctx.strokeStyle = 'rgba(255,229,172,.65)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(game.player.x, game.player.y, 17, 0, Math.PI * 2);
    ctx.stroke();
    drawPerson(ctx, game.player, true);
    drawText(ctx, 'RIO', game.player.x, game.player.y - 25, 8, '#fff0c3', 'bold', 'center');
  }
  for (const lamp of game.world.lamps) {
    if (!visible(game, lamp)) continue;
    ctx.strokeStyle = '#4f726b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(lamp.x + 9, lamp.y + 12);
    ctx.lineTo(lamp.x, lamp.y - 12);
    ctx.stroke();
    ctx.fillStyle = '#efe3b3';
    ctx.fillRect(lamp.x - 5, lamp.y - 15, 10, 5);
  }
  for (const palm of game.world.palms) if (visible(game, palm)) drawPalm(ctx, palm, game.time);
  drawObjectiveMarker(ctx, game);
  drawEffects(ctx, game);
  ctx.restore();
  // A complete, slow day cycle gently changes the scene's colour temperature.
  const night = (Math.sin(game.time / 190 - 1.4) + 1) * .055;
  ctx.fillStyle = `rgba(23,35,70,${night})`;
  ctx.fillRect(0, 0, game.width, game.height);
  const vignette = ctx.createRadialGradient(game.width / 2, game.height / 2, game.width * .2,
    game.width / 2, game.height / 2, game.width * .72);
  vignette.addColorStop(0, 'rgba(10,33,37,0)');
  vignette.addColorStop(1, 'rgba(10,33,37,.35)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, game.width, game.height);
}
