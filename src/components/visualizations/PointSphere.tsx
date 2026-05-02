'use client';

import { Suspense, useCallback, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

import { buildIcvPcaPoints, type IcvPcaPoint } from '@/lib/icvPca';
import { distance, METRIC_LABELS, type DistanceMetric } from '@/kernel/similarity';
import { findByForte } from '@/kernel/pcSetDb';
import type { IntervalVector } from '@/kernel/icv';

function cardinalityGray(n: number): string {
  const t = (n - 1) / 11;
  const l = 34 + t * 38;
  return `hsl(0, 0%, ${l}%)`;
}

type SceneProps = {
  points: IcvPcaPoint[];
  metric: DistanceMetric;
  referenceIcv: IntervalVector | null;
  selectedForte: string | null;
  onSelectForte: (forte: string) => void;
  onTooltip: (text: string | null) => void;
};

function PointMesh({
  p,
  r,
  selected,
  tooltipExtra,
  onSelect,
  onHover,
}: {
  p: IcvPcaPoint;
  r: number;
  selected: boolean;
  tooltipExtra: string;
  onSelect: () => void;
  onHover: (v: string | null) => void;
}) {
  const color = cardinalityGray(p.cardinality);
  return (
    <mesh
      position={[p.x * 2.2, p.y * 2.2, p.z * 2.2]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(
          `${p.forte}  |${p.icv.join(',')}|  n=${p.cardinality}  mag=${p.magnitude.toFixed(0)}${tooltipExtra ? `  ${tooltipExtra}` : ''}`,
        );
      }}
      onPointerOut={() => onHover(null)}
    >
      <sphereGeometry args={[r, 14, 14]} />
      <meshStandardMaterial
        color={selected ? '#ff4444' : '#e8e8e8'}
        emissive={selected ? '#cc0000' : '#000000'}
        emissiveIntensity={selected ? 0.6 : 0}
        metalness={0.15}
        roughness={0.55}
      />
    </mesh>
  );
}

function Scene({ points, metric, referenceIcv, selectedForte, onSelectForte, onTooltip }: SceneProps) {
  const ref = useMemo(() => {
    if (!referenceIcv) return null;
    const target = findByForte(selectedForte ?? '');
    return target?.icv ?? referenceIcv;
  }, [referenceIcv, selectedForte]);

  const radii = useMemo(() => {
    const mags = points.map((p) => p.magnitude);
    const maxM = Math.max(...mags, 1);
    return points.map((p) => 0.04 + (p.magnitude / maxM) * 0.07);
  }, [points]);

  const tooltipExtras = useMemo(() => {
    if (!ref) return points.map(() => '');
    return points.map((p) => {
      const d = distance(ref, p.icv, metric);
      return `d(${METRIC_LABELS[metric]})=${d.toFixed(2)} · PCA layout`;
    });
  }, [points, ref, metric]);

  return (
    <>
      <color attach="background" args={['#121212']} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 6, 3]} intensity={0.85} />
      <group>
        {points.map((p, i) => (
          <PointMesh
            key={p.forte}
            p={p}
            r={radii[i]}
            selected={selectedForte === p.forte}
            tooltipExtra={tooltipExtras[i]}
            onSelect={() => onSelectForte(p.forte)}
            onHover={onTooltip}
          />
        ))}
      </group>
      <OrbitControls enableDamping dampingFactor={0.08} minDistance={2} maxDistance={14} />
    </>
  );
}

export type PointSphereProps = {
  metric: DistanceMetric;
  selectedForte: string | null;
  referenceIcv: IntervalVector | null;
  onSelectForte: (forte: string) => void;
};

export function PointSphere({ metric, selectedForte, referenceIcv, onSelectForte }: PointSphereProps) {
  const points = useMemo(() => buildIcvPcaPoints(), []);
  const [tip, setTip] = useState<string | null>(null);

  const stableSelect = useCallback(
    (f: string) => {
      onSelectForte(f);
    },
    [onSelectForte],
  );

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <p className="font-[family-name:var(--font-space-grotesk)] text-[9px] text-[var(--outline)] px-0.5">
        3D layout = PCA of 6-D ICVs (Euclidean in score space, not your selected metric) · hover shows d via active metric
      </p>
      <div className="relative w-full h-[min(420px,55vh)] min-h-[320px] rounded border border-[var(--outline-variant)] bg-[var(--surface-container-lowest)] overflow-hidden blueprint-grid">
      {tip && (
        <div
          className="absolute bottom-2 right-2 z-20 max-w-[min(320px,90%)] px-3 py-2 rounded border border-[var(--outline-variant)] bg-[var(--surface-container-lowest)]/95 backdrop-blur-sm shadow-lg pointer-events-none font-[family-name:var(--font-space-grotesk)] text-[10px] tracking-[0.04em] text-[var(--on-surface)] whitespace-pre-wrap"
          title={tip}
        >
          {tip}
        </div>
      )}
      <Canvas
        camera={{ position: [3.2, 2.4, 3.2], fov: 50 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          <Scene
            points={points}
            metric={metric}
            referenceIcv={referenceIcv}
            selectedForte={selectedForte}
            onSelectForte={stableSelect}
            onTooltip={setTip}
          />
        </Suspense>
      </Canvas>
      </div>
    </div>
  );
}
