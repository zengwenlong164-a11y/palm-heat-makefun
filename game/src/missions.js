import { distance, PRICES } from './config.js';
import { createCar } from './vehicles.js';
import { setWantedStars } from './police.js';

export const STORY = [
  {
    title: 'First Wheels', reward: 650,
    briefing: 'DELIA VOSS: Rio. Gold coupe, Ocean Drive. Take it to my garage. Try to bring all four wheels.',
  },
  {
    title: 'Hot Package', reward: 1100,
    briefing: 'DELIA VOSS: A parcel is waiting uptown. The receiver has a short fuse. So do the cops. You have 95 seconds after pickup.',
  },
  {
    title: 'Harbor Run', reward: 1500,
    briefing: 'DELIA VOSS: Harbor locker. Walk in, take the case, disappear. No car fits through that deal.',
  },
  {
    title: 'Payback', reward: 2100,
    briefing: 'DELIA VOSS: Three red cars are circling Downtown. Disable them. A bumper or a pistol — your call.',
  },
  {
    title: 'The Big Score', reward: 5000,
    briefing: 'DELIA VOSS: Three stops. One last haul. Pick up the cash, then shake every badge in Coral Bay. After this, we are even.',
  },
];

export function createMissionState(index = 0) {
  return { index, stage: 0, timer: 0, active: false, delay: 0, objective: null,
    title: '', text: '', briefing: '', briefingTimer: 0, side: null, rivalCars: [] };
}

export function beginMission(game) {
  const mission = game.mission;
  mission.active = true;
  mission.stage = 0;
  mission.timer = 0;
  mission.side = null;
  mission.rivalCars = [];
  if (mission.index < STORY.length) {
    const entry = STORY[mission.index];
    mission.title = entry.title;
    mission.briefing = entry.briefing;
    mission.briefingTimer = 10;
    game.notify(entry.briefing, 10);
    if (mission.index === 0) {
      let coupe = game.cars.find(car => car.marked && car.health > 0);
      if (!coupe) {
        const point = game.world.locations.coupe;
        coupe = createCar(point.x, point.y, 0, '#f2ba57', 'coupe');
        coupe.marked = true;
        game.cars.push(coupe);
      }
    }
    if (mission.index === 3) spawnRivalCars(game);
  } else beginSideJob(game);
  updateObjective(game);
}

function spawnRivalCars(game) {
  for (const old of game.cars) if (old.rival) old.health = 0;
  const route = [
    { x: 265, y: 785 }, { x: 1305, y: 785 },
    { x: 1305, y: 1305 }, { x: 265, y: 1305 },
  ];
  for (let i = 0; i < 3; i++) {
    const start = route[i];
    const next = route[(i + 1) % route.length];
    const car = createCar(start.x, start.y, Math.atan2(next.y - start.y, next.x - start.x), '#bd4852', 'rival');
    car.rival = true;
    car.route = route;
    car.routeIndex = (i + 1) % route.length;
    car.health = 100;
    game.cars.push(car);
    game.mission.rivalCars.push(car);
  }
}

function beginSideJob(game) {
  const mission = game.mission;
  const taxi = game.rng() < .5;
  const locations = game.world.locations;
  const stops = [locations.package, locations.delivery, locations.harbor, ...locations.score];
  const pickup = game.rng.pick(stops);
  const destinations = stops.filter(point => distance(point, pickup) > 600);
  mission.side = { taxi, pickup, destination: game.rng.pick(destinations) };
  mission.title = taxi ? 'Night Shift / Taxi Fare' : 'Loose Ends / Package Run';
  mission.briefing = taxi ? 'DISPATCH: A fare needs a discreet driver. Any working car will do.' : 'DELIA VOSS: Small parcel. Quiet streets. Easy money if you keep moving.';
  mission.briefingTimer = 8;
  game.notify(mission.briefing, 8);
}

export function updateObjective(game) {
  const mission = game.mission;
  const locations = game.world.locations;
  if (!mission.active) {
    mission.objective = null;
    return;
  }
  const assign = (point, text) => {
    mission.objective = point;
    mission.text = text;
  };
  switch (mission.index) {
    case 0: {
      const coupe = game.cars.find(car => car.marked && car.health > 0);
      if (mission.stage === 0) assign(coupe || locations.coupe, 'Steal the gold coupe · E near the driver door');
      else assign(locations.garage, 'Deliver the marked coupe to Voss Respray · slow down in the ring');
      break;
    }
    case 1:
      if (mission.stage === 0) assign(locations.package, 'Collect the package at the gold marker');
      else assign(locations.delivery, 'Deliver the hot package before the timer runs out');
      break;
    case 2:
      if (mission.stage === 0) assign(locations.harbor, 'Take the harbor briefcase ON FOOT · E to leave your car');
      else assign(null, 'Lose all wanted stars · drive fast or use Voss Respray ($250)');
      break;
    case 3: {
      const alive = mission.rivalCars.filter(car => car.health > 0);
      alive.sort((a, b) => distance(a, game.player) - distance(b, game.player));
      assign(alive[0] || null, `Disable the rival cars Downtown · ${3 - alive.length} / 3`);
      break;
    }
    case 4:
      if (mission.stage < 3) assign(locations.score[mission.stage], `Collect the score · stop ${mission.stage + 1} / 3`);
      else assign(null, 'The money is yours. Lose FOUR stars to finish the score.');
      break;
    default: {
      const side = mission.side;
      if (!side) break;
      assign(mission.stage === 0 ? side.pickup : side.destination,
        mission.stage === 0 ? side.taxi ? 'Pick up the fare in a car' : 'Collect the parcel' : side.taxi ? 'Drive the fare to the destination' : 'Deliver the parcel');
    }
  }
}

export function completeMission(game) {
  const mission = game.mission;
  const reward = mission.index < STORY.length ? STORY[mission.index].reward :
    mission.side.taxi ? PRICES.taxi : PRICES.package;
  game.cash += reward;
  mission.active = false;
  mission.objective = null;
  mission.delay = 4;
  game.completeTitle = mission.title;
  game.completeReward = reward;
  game.completeTimer = 4;
  if (mission.index < STORY.length) mission.index++;
  game.player.health = Math.min(100, game.player.health + 25);
  game.audio.pickup();
  game.notify(mission.index === 5 ? 'DELIA VOSS: We are even, Rio. Coral Bay is yours. Dispatch has more work.' : 'Job paid. Delia will call shortly.', 6);
  game.save();
}

export function restartCurrentMission(game, reason) {
  game.notify(reason, 6);
  game.mission.active = false;
  game.mission.objective = null;
  game.mission.delay = 5;
  game.mission.stage = 0;
}

export function updateMissions(game, dt) {
  const mission = game.mission;
  mission.briefingTimer = Math.max(0, mission.briefingTimer - dt);
  if (!mission.active) {
    mission.delay -= dt;
    if (mission.delay <= 0) beginMission(game);
    return;
  }
  const player = game.player;
  const locations = game.world.locations;
  const near = (point, radius = 47) => distance(player, point) < radius;
  switch (mission.index) {
    case 0: {
      const coupe = game.cars.find(car => car.marked && car.health > 0);
      if (!coupe) {
        restartCurrentMission(game, 'The coupe is wrecked. Delia will arrange another.');
        return;
      }
      if (player.car === coupe) mission.stage = 1;
      if (mission.stage === 1 && player.car === coupe && near(locations.garage, 77) && Math.abs(coupe.speed) < 75) {
        setWantedStars(game, 0);
        coupe.health = 100;
        completeMission(game);
      }
      break;
    }
    case 1:
      if (mission.stage === 0 && near(locations.package)) {
        mission.stage = 1;
        mission.timer = 95;
        setWantedStars(game, 2);
        game.audio.pickup();
        game.notify('Package secured. Two stars. Clock is running.');
      } else if (mission.stage === 1) {
        mission.timer -= dt;
        if (near(locations.delivery)) completeMission(game);
        else if (mission.timer <= 0) restartCurrentMission(game, 'Receiver left. Return for a fresh package.');
      }
      break;
    case 2:
      if (mission.stage === 0 && !player.car && near(locations.harbor, 40)) {
        mission.stage = 1;
        setWantedStars(game, 3);
        game.audio.pickup();
        game.notify('Briefcase secured. Get out of the harbor and lose the heat.');
      } else if (mission.stage === 1 && game.police.stars === 0) completeMission(game);
      break;
    case 3:
      if (mission.rivalCars.length === 3 && mission.rivalCars.every(car => car.health <= 0)) completeMission(game);
      break;
    case 4:
      if (mission.stage < 3 && near(locations.score[mission.stage])) {
        mission.stage++;
        setWantedStars(game, Math.min(4, mission.stage + 1));
        game.audio.pickup();
        game.notify(mission.stage < 3 ? 'Cash loaded. Next stop. Keep your engine running.' : 'All bags loaded. Four stars. Make them disappear.');
      } else if (mission.stage === 3 && game.police.stars === 0) completeMission(game);
      break;
    default:
      if (mission.stage === 0 && near(mission.side.pickup) && (!mission.side.taxi || player.car)) {
        mission.stage = 1;
        mission.timer = 110;
        game.audio.pickup();
        game.notify(mission.side.taxi ? 'Passenger aboard. Follow the gold waypoint.' : 'Parcel collected. Follow the waypoint.');
      } else if (mission.stage === 1) {
        mission.timer -= dt;
        if (near(mission.side.destination) && (!mission.side.taxi || player.car)) completeMission(game);
        else if (mission.timer <= 0) restartCurrentMission(game, 'Job expired. Dispatch is finding another.');
      }
  }
  updateObjective(game);
}
