// Mulberry32 reconstructs the city and all screenshot scenes from one seed.
export function createRng(seed = 7) {
  let state = seed >>> 0;
  function random() {
    state += 0x6D2B79F5;
    let t = state;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
  random.range = (a, b) => a + random() * (b - a);
  random.int = (a, b) => Math.floor(random.range(a, b + 1));
  random.pick = list => list[Math.floor(random() * list.length)];
  return random;
}
