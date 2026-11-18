// Simulation coordinates are world pixels; velocities are pixels per second.
export const WORLD = { width: 3200, height: 2840, beach: 2340, water: 2580 };
export const ROADS = [240, 760, 1280, 1800, 2320, 2840];
export const STREETS = [240, 760, 1280, 1800, 2240];
export const ROAD_WIDTH = 112;
export const SPEED = { walk: 108, run: 176, car: 365, reverse: 130, traffic: 94, police: 238 };
export const PRICES = { respray: 250, taxi: 180, package: 240 };
export const COLORS = {
  asphalt: '#34474b', lane: '#c5c6a2', sidewalk: '#acb6a2',
  grass: '#668877', sand: '#dfc99d', water: '#257f89',
  gold: '#ffcf70', mint: '#86e2c2', coral: '#ef827c', ink: '#102c31',
  cars: ['#d56d69', '#d8cba2', '#65aca9', '#e4b652', '#8499c4', '#b8cfba'],
};
export const CONTROLS = {
  up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
};
export const SAVE_KEY = 'palm-heat-save-v1';
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const angleDifference = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
