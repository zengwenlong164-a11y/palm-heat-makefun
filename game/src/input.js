import { CONTROLS } from './config.js';

export function createInput(canvas) {
  const held = new Set();
  const pressed = new Set();
  const mouse = { x: innerWidth * .65, y: innerHeight * .5, down: false };
  const blocked = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  window.addEventListener('keydown', event => {
    if (blocked.includes(event.code)) event.preventDefault();
    if (!held.has(event.code)) pressed.add(event.code);
    held.add(event.code);
  });
  window.addEventListener('keyup', event => held.delete(event.code));
  window.addEventListener('blur', () => {
    held.clear();
    mouse.down = false;
  });
  canvas.addEventListener('pointermove', event => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
  });
  canvas.addEventListener('pointerdown', event => {
    if (event.button === 0) mouse.down = true;
  });
  window.addEventListener('pointerup', () => { mouse.down = false; });
  canvas.addEventListener('contextmenu', event => event.preventDefault());
  return {
    held, pressed, mouse,
    down: code => held.has(code),
    tap: code => pressed.has(code),
    axis(negative, positive) {
      return Number(CONTROLS[positive].some(k => held.has(k))) -
        Number(CONTROLS[negative].some(k => held.has(k)));
    },
    clear() { pressed.clear(); },
  };
}
