export function createRng(seed: number) {
  let s = seed;
  function next(): number {
    s = (s * 1664525 + 1013904223) | 0;
    return (s >>> 0) / 4294967296;
  }
  function nextInt(min: number, max: number): number {
    return Math.floor(next() * (max - min)) + min;
  }
  function shuffle<T>(arr: T[]): T[] {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = nextInt(0, i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  function pick<T>(arr: T[]): T {
    return arr[nextInt(0, arr.length)];
  }
  function chance(p: number): boolean {
    return next() < p;
  }
  function gaussian(): number {
    const u1 = next();
    const u2 = next();
    return Math.sqrt(-2 * Math.log(u1 || 0.0001)) * Math.cos(2 * Math.PI * u2);
  }
  return { next, nextInt, shuffle, pick, chance, gaussian };
}
