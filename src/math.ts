export const clamp = (x: number, min: number, max: number) => Math.max(min, Math.min(max, x));
export const approach = (from: number, to: number, rate: number, dt: number) => from + (to - from) * (1 - Math.exp(-rate * dt));
export const STEP = 1 / 60;
export class FixedClock {
  accumulator = 0;
  advance(elapsed: number, tick: () => void) {
    this.accumulator += clamp(elapsed, 0, .1);
    let count = 0;
    while (this.accumulator + 1e-10 >= STEP && count < 6) {
      tick(); this.accumulator -= STEP; count++;
    }
    this.accumulator = Math.max(0, this.accumulator);
    return this.accumulator / STEP;
  }
  reset() { this.accumulator = 0; }
}
