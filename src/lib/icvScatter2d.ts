import { getAllSets } from '@/kernel/pcSetDb';
import { distance, type DistanceMetric } from '@/kernel/similarity';
import type { IntervalVector } from '@/kernel/icv';

export type IcvScatterPoint = {
  forte: string;
  x: number;
  y: number;
  icv: IntervalVector;
  cardinality: number;
  distRaw: number;
  mag: number;
};

/** 2-D scatter: x = distance from reference ICV (selected metric), y = total interval content (‖ICV‖₁). */
export function buildIcvScatter2d(
  referenceIcv: IntervalVector | null,
  metric: DistanceMetric,
): IcvScatterPoint[] {
  const sets = getAllSets().filter((s) => s.cardinality >= 1);
  const ref = referenceIcv ?? [0, 0, 0, 0, 0, 0];
  const raw = sets.map((s) => {
    const mag = s.icv.reduce((a, b) => a + b, 0);
    const distRaw = distance(ref, s.icv, metric);
    return {
      forte: s.forte,
      x: distRaw,
      y: mag,
      icv: s.icv,
      cardinality: s.cardinality,
      distRaw,
      mag,
    };
  });
  const xs = raw.map((r) => r.x);
  const ys = raw.map((r) => r.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs, minX + 1e-9);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys, minY + 1e-9);
  return raw.map((r) => {
    let h = 0;
    for (let i = 0; i < r.forte.length; i++) h = (h * 31 + r.forte.charCodeAt(i)) >>> 0;
    const jx = ((h % 997) / 997 - 0.5) * 0.012;
    const jy = (((h >>> 8) % 997) / 997 - 0.5) * 0.012;
    return {
      ...r,
      x: (r.x - minX) / (maxX - minX) + jx,
      y: (r.y - minY) / (maxY - minY) + jy,
    };
  });
}
