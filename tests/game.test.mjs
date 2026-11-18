import test from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../game/src/rng.js';
import { generateCity, collidesWithBuilding, moveWithCollisions } from '../game/src/world.js';
import { createPlayer, populatePedestrians, updatePlayerOnFoot } from '../game/src/people.js';
import { createCar, populateVehicles, tryEnterOrLeaveCar, updateVehicles, damageCar } from '../game/src/vehicles.js';
import { createPoliceState, addWantedHeat, setWantedStars, updatePolice, spawnPoliceCar } from '../game/src/police.js';
import { createMissionState, beginMission, updateMissions } from '../game/src/missions.js';
import { firePistol, updateCombat } from '../game/src/combat.js';

function fixture(seed = 7) {
  const rng = createRng(seed);
  const world = generateCity(rng);
  const held = new Set();
  const game = {
    rng, world, held,
    player: createPlayer(),
    cars: populateVehicles(world, rng),
    people: populatePedestrians(rng),
    police: createPoliceState(),
    mission: createMissionState(),
    time: 0, cash: 400, shake: 0,
    camera: { x: 275, y: 803, zoom: 1 }, width: 1280, height: 800,
    effects: [], bullets: [], skids: [],
    notices: [], saves: 0, ended: null,
    input: {
      held, mouse: { x: 1000, y: 400, down: false },
      down: code => held.has(code),
      axis(a, b) {
        const keys = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD' };
        return Number(held.has(keys[b])) - Number(held.has(keys[a]));
      },
    },
    audio: { ui() {}, pickup() {}, crash() {}, gunshot() {} },
    notify(message) { this.notices.push(message); },
    save() { this.saves++; },
    commitCrime(severity) { addWantedHeat(this, severity); },
    endRun(screen) { this.ended = screen; },
  };
  return game;
}

test('seed reconstructs identical city, cars and pedestrians', () => {
  const a = fixture();
  const b = fixture();
  assert.deepEqual(a.world, b.world);
  assert.deepEqual(a.cars, b.cars);
  assert.deepEqual(a.people, b.people);
  assert.notDeepEqual(a.world, fixture(8).world);
});

test('city locations and all score stops remain accessible', () => {
  const game = fixture();
  const places = Object.values(game.world.locations).flat();
  for (const place of places) {
    assert.equal(collidesWithBuilding(game.world, place.x, place.y, 19), false, place.name);
  }
});

test('on-foot motion is normalized and walls prevent penetration', () => {
  const game = fixture();
  game.player.x = 760;
  game.player.y = 760;
  game.held.add('KeyW');
  game.held.add('KeyD');
  const start = { ...game.player };
  updatePlayerOnFoot(game, .25);
  assert.ok(Math.abs(Math.hypot(game.player.x - start.x, game.player.y - start.y) - 27) < .01);
  const b = game.world.buildings[0];
  const entity = { x: b.x - 15, y: b.y + 50 };
  assert.equal(moveWithCollisions(game.world, entity, 20, 0, 10), true);
  assert.equal(entity.x, b.x - 15);
});

test('steal, drive and safely leave a marked coupe', () => {
  const game = fixture();
  const coupe = game.cars.find(car => car.marked);
  game.player.x = coupe.x;
  game.player.y = coupe.y + 35;
  assert.equal(tryEnterOrLeaveCar(game), true);
  assert.equal(game.player.car, coupe);
  assert.ok(game.police.stars >= 1);
  game.held.add('KeyW');
  for (let n = 0; n < 45; n++) updateVehicles(game, 1 / 60);
  assert.ok(coupe.x > 350);
  assert.equal(tryEnterOrLeaveCar(game), false, 'cannot leave at high speed');
  coupe.speed = 0;
  assert.equal(tryEnterOrLeaveCar(game), true);
  assert.equal(game.player.car, null);
});

test('police pursue, bust a stationary suspect and decay when escaped', () => {
  const game = fixture();
  game.player.x = 760;
  game.player.y = 900;
  setWantedStars(game, 3);
  const cop = spawnPoliceCar(game, { x: 760, y: 1050 });
  const previous = cop.y;
  updatePolice(game, .1);
  assert.ok(cop.y < previous);
  cop.x = game.player.x;
  cop.y = game.player.y + 30;
  for (let n = 0; n < 50; n++) {
    cop.x = game.player.x;
    cop.y = game.player.y + 30;
    updatePolice(game, .1);
  }
  assert.equal(game.ended, 'busted');
  game.cars = [];
  game.police.spawnTimer = 1000;
  game.police.bust = 0;
  game.time = 100;
  for (let n = 0; n < 230; n++) updatePolice(game, .1);
  assert.equal(game.police.stars, 0);
});

test('garage consumes cash once, clears stars and repairs car', () => {
  const game = fixture();
  const car = game.cars.find(item => item.marked);
  Object.assign(car, game.world.locations.garage, { speed: 0, health: 40 });
  Object.assign(game.player, { x: car.x, y: car.y, car });
  setWantedStars(game, 4);
  updatePolice(game, .01);
  assert.equal(game.cash, 150);
  assert.equal(game.police.stars, 0);
  assert.equal(car.health, 100);
  updatePolice(game, .01);
  assert.equal(game.cash, 150);
});

test('pistol bullets damage cars using swept substeps', () => {
  const game = fixture();
  game.cars = [createCar(430, 760, 0, '#fff', 'parked')];
  game.people = [];
  game.player.x = 300;
  game.player.y = 760;
  game.camera.x = 300;
  game.camera.y = 760;
  firePistol(game);
  for (let n = 0; n < 12; n++) updateCombat(game, 1 / 60);
  assert.equal(game.cars[0].health, 75);
  assert.ok(game.police.stars > 0);
  assert.equal(game.bullets.length, 0);
});

test('all five story jobs settle rewards and advance into endless work', () => {
  const game = fixture();
  beginMission(game);
  const coupe = game.cars.find(car => car.marked);
  game.player.car = coupe;
  updateMissions(game, .01);
  assert.equal(game.mission.stage, 1);
  Object.assign(game.player, game.world.locations.garage);
  coupe.speed = 0;
  updateMissions(game, .01);
  assert.equal(game.mission.index, 1);
  assert.equal(game.cash, 1050);
  assert.equal(game.saves, 1);

  beginMission(game);
  Object.assign(game.player, game.world.locations.package);
  updateMissions(game, .01);
  assert.equal(game.police.stars, 2);
  assert.ok(game.mission.timer > 90);
  Object.assign(game.player, game.world.locations.delivery);
  updateMissions(game, .01);
  assert.equal(game.mission.index, 2);

  beginMission(game);
  Object.assign(game.player, game.world.locations.harbor);
  updateMissions(game, .01);
  assert.equal(game.mission.stage, 0, 'harbor case requires Rio on foot');
  game.player.car = null;
  updateMissions(game, .01);
  assert.equal(game.police.stars, 3);
  setWantedStars(game, 0);
  updateMissions(game, .01);
  assert.equal(game.mission.index, 3);

  beginMission(game);
  assert.equal(game.mission.rivalCars.length, 3);
  for (const rival of game.mission.rivalCars) damageCar(game, rival, 100);
  updateMissions(game, .01);
  assert.equal(game.mission.index, 4);

  beginMission(game);
  for (const stop of game.world.locations.score) {
    Object.assign(game.player, stop);
    updateMissions(game, .01);
  }
  assert.equal(game.mission.stage, 3);
  assert.equal(game.police.stars, 4);
  setWantedStars(game, 0);
  updateMissions(game, .01);
  assert.equal(game.mission.index, 5);
  assert.equal(game.cash, 10750);
  assert.equal(game.saves, 5);

  beginMission(game);
  assert.ok(game.mission.side);
  game.player.car = coupe;
  Object.assign(game.player, game.mission.side.pickup);
  updateMissions(game, .01);
  assert.equal(game.mission.stage, 1);
  Object.assign(game.player, game.mission.side.destination);
  updateMissions(game, .01);
  assert.equal(game.mission.active, false);
  assert.ok(game.cash > 10750);
});

test('expired package restarts without advancing story', () => {
  const game = fixture();
  game.mission.index = 1;
  beginMission(game);
  Object.assign(game.player, game.world.locations.package);
  updateMissions(game, .01);
  game.mission.timer = .1;
  updateMissions(game, 1);
  assert.equal(game.mission.active, false);
  assert.equal(game.mission.index, 1);
  updateMissions(game, 6);
  assert.equal(game.mission.active, true);
  assert.equal(game.mission.stage, 0);
});

test('minor crimes accumulate fractional heat instead of rounding each crime up', () => {
  const game = fixture();
  addWantedHeat(game, .18);
  addWantedHeat(game, .18);
  addWantedHeat(game, .18);
  assert.equal(game.police.stars, 1);
  assert.ok(Math.abs(game.police.heat - .54) < .0001);
  for (let n = 0; n < 50; n++) addWantedHeat(game, 1);
  assert.equal(game.police.stars, 5);
});

test('both taxi fares and package runs are repeatable after the story', () => {
  for (const taxi of [true, false]) {
    const game = fixture();
    game.mission.index = 5;
    beginMission(game);
    game.mission.side.taxi = taxi;
    const cashBefore = game.cash;
    Object.assign(game.player, game.mission.side.pickup);
    updateMissions(game, .01);
    assert.equal(game.mission.stage, taxi ? 0 : 1);
    if (taxi) {
      game.player.car = game.cars[0];
      updateMissions(game, .01);
      assert.equal(game.mission.stage, 1);
    }
    Object.assign(game.player, game.mission.side.destination);
    updateMissions(game, .01);
    assert.equal(game.cash - cashBefore, taxi ? 180 : 240);
    updateMissions(game, 5);
    assert.equal(game.mission.active, true);
    assert.equal(game.mission.stage, 0);
    assert.equal(game.mission.index, 5);
  }
});
