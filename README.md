# PALM HEAT

An original, offline, top-down crime game set in Coral Bay. Rio drives for
fixer Delia Voss through five jobs, then keeps working taxi fares and package
runs. All visuals are Canvas 2D drawing commands. All sound is synthesized
with WebAudio oscillators. There are no external assets, dependencies, builds,
or runtime network calls beyond loading the local ES modules.

## Play

Run `node serve.ts`, then open http://localhost:8080.

| Control | Action |
| --- | --- |
| WASD / arrows | Walk; throttle, reverse and steer while driving |
| Shift | Run on foot |
| E | Enter / steal the nearest working car, or leave a slow car |
| Space | Handbrake |
| Mouse / left click | Aim / fire pistol, including from a vehicle |
| P | Pause, save and resume |
| M | Mute / unmute synthesized sound |

The gold diamond and edge arrow identify the current objective. The circular
radar shows nearby streets, the objective, police and the respray garage.
Stars decay when every patrol is more than 370 world pixels away for seven
seconds per star. Slow down inside Voss Respray to repair the car and clear
the heat for $250. Standing nearly still beside police fills the bust meter.

New Game starts a fresh story with $400. The marked gold coupe is just
northeast of Rio. E takes the wheel. Drive east along Ocean Drive, turn south
onto the next avenue, and slow down inside the green Voss Respray bay. The
first delivery clears its own heat and pays $650. You keep the car.

The second job's timer begins at pickup. The harbor briefcase must be taken
on foot. Rival cars can be rammed or shot; five pistol hits disable a rival.
The final job has three collection stops and a four-star escape. Completed
jobs restore some health. Busted or wasted costs $200 and retries the current
job. Expired deliveries restart without losing story progress.

Cash, completed story jobs and position save every four seconds, on pause,
on job completion and on leaving the page. Continue resumes on foot, with a
fresh city population and the current job restarted. Saves use localStorage;
denying storage does not prevent play.

## Source map

Each module has one responsibility, listed in its filename. `main.js` wires
the systems together at a fixed 60 Hz. `shots.js` supplies seeded scene initial
conditions and advances the same simulation for 150 ticks, then freezes it
for reproducible capture. The chase snapshot explicitly preserves the requested
three-star editorial state after warmup. Screenshot mode never writes saves.

`render.js` draws the world and camera; `hud.js` draws screen-space information.
The title, pause and recovery actions are native HTML buttons, with a live
status region announcing mission messages. Backgrounding the tab pauses play.

## Verification

Run `node --test tests/game.test.mjs` for deterministic rule tests covering
city reconstruction and accessibility, walking and collision, stealing and
driving, police pursuit and arrest, escape decay, respray payment, gunfire,
the entire five-job chain, delivery failure, fractional heat and both kinds
of repeatable side work.

Open the four queries in `shots.json` at 1280×800 for screenshot scenes.
The JPEGs in `screenshots/` were captured from those pages using Playwright.

Package the entry with:

```
mkdir -p out
MAKEFUN_OUTPUT_DIR=out node main.ts
```

The kit's library creates the dossier. `vendor/makefun-game.ts` is untouched;
the sole authored change to the root `main.ts` is the title log line.

MIT licensed. No Rockstar names, artwork, audio or other assets are used.
