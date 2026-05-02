import { PCA } from 'ml-pca';

import { type IntervalVector } from '@/kernel/icv';
import { getAllSets, type PcSetEntry } from '@/kernel/pcSetDb';

export type IcvPcaPoint = {
  forte: string;
  x: number;
  y: number;
  z: number;
  cardinality: number;
  magnitude: number;
  icv: IntervalVector;
};

/** Project 6-D interval vectors to 3-D via PCA for the point-sphere view. */
export function buildIcvPcaPoints(sets?: PcSetEntry[]): IcvPcaPoint[] {
  const list = sets ?? getAllSets();
  if (list.length === 0) return [];

  const rows = list.map((s) => [...s.icv] as number[]);
  const pca = new PCA(rows, { scale: true, center: true });
  const proj = pca.predict(rows, { nComponents: 3 });

  const raw: { x: number; y: number; z: number; i: number }[] = [];
  for (let i = 0; i < proj.rows; i++) {
    raw.push({
      i,
      x: proj.get(i, 0),
      y: proj.get(i, 1),
      z: proj.get(i, 2),
    });
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const p of raw) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
    minZ = Math.min(minZ, p.z);
    maxZ = Math.max(maxZ, p.z);
  }

  const span = (lo: number, hi: number) => Math.max(hi - lo, 1e-6);

  return raw.map((p) => {
    const e = list[p.i];
    const mag = e.icv.reduce((a, b) => a + b, 0);
    return {
      forte: e.forte,
      x: ((p.x - minX) / span(minX, maxX)) * 2 - 1,
      y: ((p.y - minY) / span(minY, maxY)) * 2 - 1,
      z: ((p.z - minZ) / span(minZ, maxZ)) * 2 - 1,
      cardinality: e.cardinality,
      magnitude: mag,
      icv: e.icv,
    };
  });
}
