// Deterministic randomness for the whole game. Never use Math.random: call rand().
// The studio reseeds this from reset(seed) so the same seed gives the same race.
let state = 1;
export function seedRng(seed) {
  state = (seed >>> 0) || 1;
}
export function rand() {
  state = (state + 0x6d2b79f5) >>> 0;
  let t = state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
