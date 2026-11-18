import { createCar } from './vehicles.js';
import { spawnPoliceCar, setWantedStars } from './police.js';
import { beginMission, updateObjective } from './missions.js';
import { updateCamera } from './render.js';

// Scenes are authored initial conditions, then advanced through the real loop.
// Frozen at a fixed tick, they never depend on browser speed or capture timing.
export function prepareScreenshotScene(game, name) {
  game.shot = name;
  game.screen = 'playing';
  game.cash = 2840;
  game.mission.index = name === 'chase' ? 1 : 0;
  beginMission(game);
  game.noticeTimer = 0;
  game.police.spawnTimer = 100;
  if (name === 'foot') {
    game.player.x = 1470;
    game.player.y = 2430;
    game.player.angle = -.5;
    game.mission.index = 2;
    beginMission(game);
    game.noticeTimer = 0;
    game.input.mouse.x = 815;
    game.input.mouse.y = 370;
    for (let n = 0; n < 16; n++) {
      game.people.push({ x: 1150 + n * 42, y: 2400 + n % 4 * 33, angle: n * .9,
        health: 100, panic: 0, turn: 8, phase: n, color: ['#d98278', '#ead4a3', '#88bdb6'][n % 3] });
    }
    const parked = createCar(1400, 2278, 0, '#e7bd67', 'parked');
    game.cars.push(parked);
  } else {
    const car = game.cars.find(item => item.marked);
    car.x = name === 'title' ? 1280 : name === 'chase' ? 1030 : 650;
    car.y = name === 'title' ? 2120 : 784;
    car.angle = name === 'title' ? Math.PI / 2 : -.035;
    car.speed = name === 'title' ? 0 : 145;
    car.stolen = true;
    car.kind = 'player';
    game.player.car = car;
    game.player.x = car.x;
    game.player.y = car.y;
    game.input.held.add('KeyW');
    if (name === 'title') game.input.held.clear();
    if (name === 'chase') {
      // Leave a pursuit corridor, rather than turning the staged chase into
      // unrelated traffic crimes during its fixed simulation warmup.
      game.cars = game.cars.filter(item => item === car || Math.abs(item.y - 784) > 85 || item.x < 800 || item.x > 2200);
      game.people = game.people.filter(person => Math.abs(person.y - 784) > 85 || person.x < 800 || person.x > 2200);
      game.mission.stage = 1;
      game.mission.timer = 77;
      setWantedStars(game, 3);
      spawnPoliceCar(game, { x: 850, y: 787 });
      spawnPoliceCar(game, { x: 760, y: 900 });
      spawnPoliceCar(game, { x: 1280, y: 1080 });
      game.player.car.health = 83;
    }
    if (name === 'cover') {
      game.mission.stage = 1;
      game.cars.push(createCar(950, 734, Math.PI, '#88b4aa'));
      game.cars.push(createCar(1170, 784, 0, '#d77570'));
      game.cars.push(createCar(785, 1030, -Math.PI / 2, '#aabbd0'));
    }
  }
  updateObjective(game);
  updateCamera(game, 1, true);
  for (let tick = 0; tick < 150; tick++) game.step(1 / 60, true);
  game.input.held.clear();
  game.noticeTimer = 0;
  game.completeTimer = 0;
  // The editorial snapshot is specifically a three-star pursuit, even if
  // an incidental traffic collision occurred during the warmup.
  if (name === 'chase') setWantedStars(game, 3);
  if (name === 'title') game.screen = 'title';
  updateCamera(game, 1, true);
  game.frozen = true;
}
