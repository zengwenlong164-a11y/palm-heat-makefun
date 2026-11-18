import { WORLD, ROADS, STREETS, distance, clamp } from './config.js';
import { getDistrict } from './world.js';
import { drawText, roundedRect } from './render.js';

function drawStars(ctx, x, y, wanted, time) {
  for (let n = 0; n < 5; n++) {
    ctx.beginPath();
    for (let tip = 0; tip < 10; tip++) {
      const angle = tip * Math.PI / 5 - Math.PI / 2;
      const radius = tip % 2 ? 5 : 11;
      const px = x + n * 29 + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      if (tip === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = n < wanted ? '#ffd17a' : '#395251';
    ctx.fill();
  }
}

export function drawMinimap(game) {
  const ctx = game.ctx;
  const radius = 99;
  const x = 137;
  const y = game.height - 161;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.3)';
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.arc(x, y, radius + 8, 0, Math.PI * 2);
  ctx.fillStyle = '#153537';
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = '#678b78';
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  const scale = .103;
  const px = game.player.x;
  const py = game.player.y;
  const sx = value => x + (value - px) * scale;
  const sy = value => y + (value - py) * scale;
  ctx.fillStyle = '#c7bc8e';
  ctx.fillRect(sx(0), sy(WORLD.beach), WORLD.width * scale, 200);
  ctx.fillStyle = '#377f84';
  ctx.fillRect(sx(0), sy(WORLD.water), WORLD.width * scale, 200);
  ctx.strokeStyle = '#b9c2a3';
  ctx.lineWidth = 7;
  for (const road of ROADS) {
    ctx.beginPath();
    ctx.moveTo(sx(road), sy(0));
    ctx.lineTo(sx(road), sy(2310));
    ctx.stroke();
  }
  for (const road of STREETS) {
    ctx.beginPath();
    ctx.moveTo(sx(0), sy(road));
    ctx.lineTo(sx(WORLD.width), sy(road));
    ctx.stroke();
  }
  ctx.fillStyle = '#3e675f';
  for (const building of game.world.buildings) ctx.fillRect(sx(building.x), sy(building.y), building.w * scale, building.h * scale);
  const garage = game.world.locations.garage;
  roundedRect(ctx, sx(garage.x) - 4, sy(garage.y) - 4, 8, 8, 1, '#82edc8');
  for (const car of game.cars) {
    if (!car.police || car.health <= 0) continue;
    ctx.fillStyle = Math.sin(game.time * 7) > 0 ? '#ff8c86' : '#8acfff';
    ctx.beginPath();
    ctx.arc(sx(car.x), sy(car.y), 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  const objective = game.mission.objective;
  if (objective) {
    const dx = (objective.x - px) * scale;
    const dy = (objective.y - py) * scale;
    const d = Math.hypot(dx, dy);
    const factor = Math.min(1, (radius - 12) / d);
    ctx.save();
    ctx.translate(x + dx * factor, y + dy * factor);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#ffdb82';
    ctx.fillRect(-4, -4, 8, 8);
    ctx.restore();
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((game.player.car?.angle ?? game.player.angle) + Math.PI / 2);
  ctx.fillStyle = '#fff5cc';
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(6, 6);
  ctx.lineTo(0, 3);
  ctx.lineTo(-6, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.restore();
  ctx.strokeStyle = '#a1bda6';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
  drawText(ctx, 'N', x, y - radius + 15, 10, '#f2e5bf', 'bold', 'center');
  drawText(ctx, 'CORAL BAY', x, y + radius + 29, 10, '#c5d9c7', 'bold', 'center');
}

function drawWaypointArrow(game) {
  const point = game.mission.objective;
  if (!point) return;
  const ctx = game.ctx;
  const dx = (point.x - game.camera.x) * game.camera.zoom;
  const dy = (point.y - game.camera.y) * game.camera.zoom;
  if (Math.abs(dx) < game.width / 2 - 90 && Math.abs(dy) < game.height / 2 - 160) return;
  const angle = Math.atan2(dy, dx);
  const rangeX = game.width / 2 - 65;
  const rangeY = game.height / 2 - 165;
  const factor = Math.min(rangeX / Math.max(1, Math.abs(dx)), rangeY / Math.max(1, Math.abs(dy)));
  const x = game.width / 2 + dx * factor;
  const y = game.height / 2 + dy * factor;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = '#ffd27a';
  ctx.beginPath();
  ctx.moveTo(16, 0);
  ctx.lineTo(-8, -10);
  ctx.lineTo(-3, 0);
  ctx.lineTo(-8, 10);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  drawText(ctx, `${Math.round(distance(game.player, point))} m`, x, y + 30, 11, '#ffe1a1', 'bold', 'center');
}

export function renderHud(game) {
  const ctx = game.ctx;
  const w = game.width;
  const h = game.height;
  const mission = game.mission;
  roundedRect(ctx, 28, 25, 225, 68, 4, 'rgba(13,40,44,.92)');
  drawText(ctx, 'PALM HEAT', 44, 51, 21, '#ffddb0', '900');
  drawText(ctx, getDistrict(game.player.x, game.player.y).toUpperCase(), 44, 75, 10, '#84cbb8', 'bold');
  roundedRect(ctx, w - 246, 25, 218, 111, 4, 'rgba(13,40,44,.92)');
  drawText(ctx, `$${game.cash.toLocaleString('en-US')}`, w - 44, 58, 26, '#dcebc6', 'bold', 'right');
  drawStars(ctx, w - 195, 83, game.police.stars, game.time);
  ctx.fillStyle = '#3a5550';
  ctx.fillRect(w - 224, 109, 174, 5);
  ctx.fillStyle = game.player.health > 30 ? '#85d0ad' : '#f18b7c';
  ctx.fillRect(w - 224, 109, 174 * clamp(game.player.health / 100, 0, 1), 5);
  drawText(ctx, 'RIO', w - 224, 127, 8, '#95b3a7', 'bold');
  drawText(ctx, `${Math.ceil(game.player.health)} HP`, w - 50, 127, 8, '#95b3a7', 'bold', 'right');
  if (game.police.stars > 0) {
    const searching = game.police.unseen > 1;
    drawText(ctx, searching ? 'SEARCHING / KEEP YOUR DISTANCE' : 'WANTED / BREAK LINE OF SIGHT', w - 29, 156, 10,
      searching ? '#8cd8bb' : '#ffb18e', 'bold', 'right');
    if (game.police.bust > .02) {
      roundedRect(ctx, w / 2 - 140, 34, 280, 43, 3, '#15373a');
      drawText(ctx, 'BUSTING — MOVE!', w / 2, 51, 11, '#ffb18e', 'bold', 'center');
      ctx.fillStyle = '#d78172';
      ctx.fillRect(w / 2 - 126, 62, 252 * game.police.bust, 5);
    }
  }
  drawMinimap(game);
  drawWaypointArrow(game);
  const left = 272;
  const boxWidth = Math.min(690, w - left - 28);
  roundedRect(ctx, left, h - 125, boxWidth, 87, 4, 'rgba(13,40,44,.94)');
  ctx.fillStyle = '#f2c473';
  ctx.fillRect(left, h - 125, 3, 87);
  drawText(ctx, mission.index < 5 ? `DELIA VOSS / ${String(Math.min(5, mission.index + 1)).padStart(2, '0')}` : 'CORAL BAY / FREE ROAM', left + 19, h - 104, 9, '#8ab4a6', 'bold');
  drawText(ctx, mission.title.toUpperCase(), left + 19, h - 79, 19, '#ffdfaa', 'bold');
  drawText(ctx, mission.active ? mission.text : 'Job paid. Waiting for the next call…', left + 19, h - 57, 11, '#d2ddc6');
  if (mission.timer > 0) {
    drawText(ctx, `${Math.ceil(mission.timer)}s`, left + boxWidth - 19, h - 81, 22, mission.timer < 20 ? '#ff9780' : '#f5d089', 'bold', 'right');
  }
  const car = game.player.car;
  if (car) {
    drawText(ctx, `${Math.round(Math.abs(car.speed) * .32)}`, w - 43, h - 69, 43, '#f9dfae', 'bold', 'right');
    drawText(ctx, 'KM/H', w - 44, h - 49, 10, '#b6ccb8', 'bold', 'right');
    drawText(ctx, `ENGINE ${Math.ceil(car.health)}%`, w - 44, h - 28, 9, car.health < 30 ? '#fa9a83' : '#91b9aa', 'bold', 'right');
  }
  drawText(ctx, `E ${car ? 'EXIT' : 'ENTER CAR'}   ·   P PAUSE   ·   M ${game.audio.muted ? 'UNMUTE' : 'MUTE'}`, 28, h - 17, 9, '#b0c5b4', 'bold');
  if (game.noticeTimer > 0 && game.notice) {
    const maxWidth = Math.min(740, w - 90);
    roundedRect(ctx, w / 2 - maxWidth / 2, 183, maxWidth, 63, 4, 'rgba(15,43,44,.93)');
    const words = game.notice.split(' ');
    let line = '';
    const lines = [];
    ctx.font = '12px Arial';
    for (const word of words) {
      if (ctx.measureText(`${line} ${word}`).width > maxWidth - 38) {
        lines.push(line);
        line = word;
      } else line = line ? `${line} ${word}` : word;
    }
    lines.push(line);
    lines.slice(0, 3).forEach((text, index) => drawText(ctx, text, w / 2, 208 + index * 18, 12, '#eadbbb', 'normal', 'center'));
  }
  if (game.completeTimer > 0) {
    roundedRect(ctx, w / 2 - 225, h / 2 - 55, 450, 110, 4, 'rgba(18,52,49,.96)', '#95caa3');
    drawText(ctx, 'JOB COMPLETE', w / 2, h / 2 - 17, 12, '#99d3ad', 'bold', 'center');
    drawText(ctx, game.completeTitle.toUpperCase(), w / 2, h / 2 + 12, 23, '#ffe3ab', 'bold', 'center');
    drawText(ctx, `+$${game.completeReward} / PROGRESS SAVED`, w / 2, h / 2 + 36, 11, '#b4d3b3', 'bold', 'center');
  }
  if (!car) {
    const nearby = game.cars.find(item => item.health > 0 && !item.police && distance(item, game.player) < 68);
    if (nearby) {
      roundedRect(ctx, w / 2 - 90, h / 2 + 44, 180, 31, 3, 'rgba(12,40,42,.92)');
      drawText(ctx, 'E  TAKE THE WHEEL', w / 2, h / 2 + 64, 10, '#ffdd98', 'bold', 'center');
    }
    const mouse = game.input.mouse;
    ctx.strokeStyle = '#ffe5ac';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(mouse.x, mouse.y, 8, 0, Math.PI * 2);
    ctx.moveTo(mouse.x - 13, mouse.y);
    ctx.lineTo(mouse.x - 4, mouse.y);
    ctx.moveTo(mouse.x + 4, mouse.y);
    ctx.lineTo(mouse.x + 13, mouse.y);
    ctx.moveTo(mouse.x, mouse.y - 13);
    ctx.lineTo(mouse.x, mouse.y - 4);
    ctx.moveTo(mouse.x, mouse.y + 4);
    ctx.lineTo(mouse.x, mouse.y + 13);
    ctx.stroke();
  }
}
