// Bilinear interpolation between two data arrays
function interpolateArray(data1, data2, w) {
  const data = [];
  data1.forEach((d1, i) => {
    const pressure1 = d1.pressure;
    const d2 = i == 0 ? data2[0] : data2.find(d2 => d2.pressure == pressure1);
    if (d2) {
      data.push(interpolatePoint(d1, d2, w));
    }
  });
  return data;
}

// Bilinear interpolation between two data points
function interpolatePoint(point1, point2, w) {
  const interp = {};
  const keys = Object.getOwnPropertyNames(point1);
  keys.forEach(key => {
    interp[key] = (1 - w) * point1[key] + w * point2[key];
  });

  return interp;
}

export default { interpolateArray, interpolatePoint };
