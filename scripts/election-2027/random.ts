/** Seeded random source, so a forecast run is reproducible. */
export interface Random {
  uniform: () => number;
  normal: () => number;
  /** Student-t draw rescaled to a standard deviation of 1. */
  studentT: () => number;
  /** Index drawn with probability proportional to `cumulativeWeights[index] - cumulativeWeights[index - 1]`. */
  pick: (cumulativeWeights: Float64Array) => number;
}

/** Mulberry32: tiny, fast, good enough for Monte Carlo at this scale. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRandom(seed: number, degreesOfFreedom = 5): Random {
  const uniform = mulberry32(seed);
  let spareNormal: number | undefined;

  // Box-Muller yields two independent normals per pair of uniforms; keep the second for the next call.
  const normal = () => {
    if (spareNormal !== undefined) {
      const value = spareNormal;
      spareNormal = undefined;
      return value;
    }
    const radius = Math.sqrt(-2 * Math.log(1 - uniform()));
    const angle = 2 * Math.PI * uniform();
    spareNormal = radius * Math.sin(angle);
    return radius * Math.cos(angle);
  };

  // t = Z / sqrt(chi-squared / df), and a t variable has variance df / (df - 2).
  const unitScale = Math.sqrt((degreesOfFreedom - 2) / degreesOfFreedom);
  const studentT = () => {
    let chiSquared = 0;
    for (let index = 0; index < degreesOfFreedom; index += 1) chiSquared += normal() ** 2;
    return (normal() / Math.sqrt(chiSquared / degreesOfFreedom)) * unitScale;
  };

  const pick = (cumulativeWeights: Float64Array) => {
    const target = uniform() * (cumulativeWeights.at(-1) ?? 0);
    let low = 0;
    let high = cumulativeWeights.length - 1;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if ((cumulativeWeights[middle] ?? 0) > target) high = middle;
      else low = middle + 1;
    }
    return low;
  };

  return { uniform, normal, studentT, pick };
}
