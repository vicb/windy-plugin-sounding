// Linear interpolation
// The values (y1 and y2) can be arrays

export function linearInterpolate<T extends number | number[]>(
  x1: number,
  y1: T,
  x2: number,
  y2: T,
  x: number
) {
  const w = (x - x1) / (x2 - x1);
  return (x1 == x2)
    ? y1
    : (Array.isArray(y1))
      ? y1.map((_val, i) => y1[i] * (1 - w) + y2[i] * w)
      : (y1 as number) * (1 - w) + (y2 as number) * w;
}

// Sampling at at targetXs with linear interpolation
// xs and ys must have the same length.
export function sampleAt(xs: number[], ys: number[], targetXs: number[]) {
  const descOrder = xs[0] > xs[1];
  return targetXs.map((tx) => {
    let index = xs.findIndex((x) => (descOrder ? x <= tx : x >= tx));
    if (index == -1) {
      index = xs.length - 1;
    } else if (index == 0) {
      index = 1;
    }
    return linearInterpolate(xs[index - 1], ys[index - 1], xs[index], ys[index], tx) as number;
  });
}

// x?s must be sorted in ascending order.
// x?s and y?s must have the same length.
// return [x, y] or null when no intersection found.
export function firstIntersection<T extends number[]>(x1s: T, y1s: T, x2s: T, y2s: T) {
  // Find all the points in the intersection of the 2 x ranges
  const min = Math.max(x1s[0], x2s[0]);
  const max = Math.min(x1s.at(-1), x2s.at(-1));
  const xs = Array.from(new Set([...x1s, ...x2s]))
    .filter((x) => x >= min && x <= max)
    .sort((a, b) => (Number(a) > Number(b) ? 1 : -1));
  // Interpolate the lines for all the points of that intersection
  const iy1s = sampleAt(x1s, y1s, xs) as number[];
  const iy2s = sampleAt(x2s, y2s, xs) as number[];
  // Check if each segment intersect
  for (let index = 0; index < xs.length - 1; index++) {
    const y11 = iy1s[index];
    const y21 = iy2s[index];
    const x1 = xs[index];
    if (y11 == y21) {
      return [x1, y11];
    }
    const y12 = iy1s[index + 1];
    const y22 = iy2s[index + 1];
    if (Math.sign(y21 - y11) != Math.sign(y22 - y12)) {
      const x2 = xs[index + 1];
      const width = x2 - x1;
      const slope1 = (y12 - y11) / width;
      const slope2 = (y22 - y21) / width;
      const dx = (y21 - y11) / (slope1 - slope2);
      const dy = dx * slope1;
      return [x1 + dx, y11 + dy];
    }
  }
  return null;
}

export function zip(a: number[], b: number[]) {
  return a.map((v, i) => [v, b[i]]);
}

export function scaleLinear(from: number[], to: number[]) {
  const scale = (v: number) => sampleAt(from, to, [v])[0];
  scale.invert = (v: number) => sampleAt(to, from, [v])[0];
  return scale;
}

export function scaleLog(from: number[], to: number[]) {
  from = from.map(Math.log);
  const scale = (v: number) => sampleAt(from, to, [Math.log(v)])[0];
  scale.invert = (v: number) => Math.exp(sampleAt(to, from, [v])[0] as number);
  return scale;
}

export function line(x: (T: number[]) => number, y: (T: number[]) => number) {
  return (d: number[][]) => {
    const points = d.map((v) => x(v).toFixed(1) + "," + y(v).toFixed(1));
    return "M" + points.join("L");
  };
}

export function lerp(v0: number, v1: number, weight: number) {
  return v0 + weight * (v1 - v0);
}
