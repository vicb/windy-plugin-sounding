// Linear interpolation
function linearInterpolate(x1, y1, x2, y2, x) {
  if (x1 == x2) {
    return y1;
  }
  const w = (x - x1) / (x2 - x1);
  return y1 * (1 - w) + y2 * w;
}

// Sampling at at targetXs with linear interpolation
// xs and ys must have the same length.
function sampleAt(xs, ys, targetXs) {
  const descOrder = xs[0] > xs[1];
  return targetXs.map(tx => {
    let index = xs.findIndex(x => (descOrder ? x <= tx : x >= tx));
    if (index == -1) {
      index = xs.length - 1;
    } else if (index == 0) {
      index = 1;
    }
    return linearInterpolate(xs[index - 1], ys[index - 1], xs[index], ys[index], tx);
  });
}

// x?s must be sorted in descending order.
// x?s and y?s must have the same length.
// return [x, y] or null when no intersection found.
function firstIntersection(x1s, y1s, x2s, y2s) {
  // Find all the points in the intersection of the 2 x ranges
  const max = Math.min(x1s[0], x2s[0]);
  const min = Math.max(x1s[x1s.length - 1], x2s[x2s.length - 1]);
  const xs = Array.from(new Set([...x1s, ...x2s]))
    .filter(x => x >= min && x <= max)
    .sort((a, b) => (Number(a) > Number(b) ? -1 : 1));
  // Interpolate the lines for all the points of that intersection
  const iy1s = sampleAt(x1s, y1s, xs);
  const iy2s = sampleAt(x2s, y2s, xs);
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

function zip(a, b) {
  return a.map((v, i) => [v, b[i]]);
}

function scaleLinear() {
  let range = [0, 1];
  let domain = [0, 1];
  const scale = v => sampleAt(domain, range, [v])[0];
  scale.invert = v => sampleAt(range, domain, [v])[0];
  scale.range = r => {
    range = r;
    return scale;
  };
  scale.domain = d => {
    domain = d;
    return scale;
  };
  return scale;
}

function scaleLog() {
  let range = [0, 1];
  let domain = [0, 1];
  const scale = v => sampleAt(domain, range, [Math.log(v)])[0];
  scale.invert = v => Math.exp(sampleAt(range, domain, [v])[0]);
  scale.range = r => {
    range = r;
    return scale;
  };
  scale.domain = d => {
    domain = d.map(Math.log);
    return scale;
  };
  return scale;
}

function line() {
  let x = v => v[0];
  let y = v => v[1];
  const line = d => d.reduce((p, v, i) => p + `${i == 0 ? "M" : "L"}${x(v)},${y(v)}`, "");
  line.x = f => {
    x = f;
    return line;
  };
  line.y = f => {
    y = f;
    return line;
  };
  return line;
}

export default {
  firstIntersection,
  sampleAt,
  linearInterpolate,
  zip,
  scaleLinear,
  scaleLog,
  line,
};
