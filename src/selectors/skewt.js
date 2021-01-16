import * as math from "../math";

import {
  GRAPH_GAP_PX,
  GRAPH_WINDGRAM_WIDTH_PERCENT,
  altiMetric,
  elevation,
  forecasts,
  formatAltitude,
  formatTemp,
  graphHeight,
  tMetric,
  timestamp,
  width as totalWidth,
  zoom,
} from "./sounding";

import { createSelector } from "reselect";

const windyUtils = W.require("utils");

export const width = (state) =>
  Math.floor(totalWidth(state) * (1 - GRAPH_WINDGRAM_WIDTH_PERCENT / 100) - GRAPH_GAP_PX);
export const pZoomMin = (state) => state.skewt.pMin;
export const pMax = (state) => state.skewt.pMax;

export const pMin = createSelector(pZoomMin, zoom, (pMin, zoom) => (zoom ? pMin : 150));

// Set of parameters at a given timestamp.
// Interpolate from the two nearest times.
export const params = createSelector(forecasts, timestamp, pMin, (forecasts, timestamp, pMin) => {
  if (!forecasts || forecasts.isLoading) {
    return null;
  }
  const { times, values } = forecasts;
  const next = times.findIndex((t) => t >= timestamp);
  if (next == -1) {
    return null;
  }
  const previous = Math.max(0, next - 1);

  let topLevelIndex = forecasts.levels.findIndex((p) => p <= pMin);
  if (topLevelIndex == -1) {
    topLevelIndex = forecasts.levels.length - 1;
  }
  const levels = forecasts.levels.slice(0, topLevelIndex + 1);

  const params = {};

  Object.getOwnPropertyNames(values[previous]).forEach((name) => {
    params[name] = math.linearInterpolate(
      times[previous],
      values[previous][name],
      times[next],
      values[next][name],
      timestamp
    );
    params[name].splice(topLevelIndex + 1);
  });

  params.level = levels;

  const wind = params.wind_u.map((u, index) => {
    const v = params.wind_v[index];
    return windyUtils.wind2obj([u, v]);
  });

  params.windSpeed = wind.map((w) => w.wind);
  params.windDir = wind.map((w) => w.dir);

  return params;
});

export const tMax = createSelector(forecasts, (f) => f.tMax + 8);
export const tMin = createSelector(tMax, (tMax) => tMax - 60);

export const skew = createSelector(
  width,
  graphHeight,
  pMax,
  pMin,
  tMax,
  tMin,
  (width, height, pMax, pMin, tMax, tMin) =>
    (75 * (width / height) * (Math.log10(pMax) - Math.log10(pMin))) / (tMax - tMin)
);

export const tToPx = createSelector(width, tMax, tMin, (width, tMax, tMin) =>
  math.scaleLinear([tMin, tMax], [0, width])
);

export const tAxisToPx = createSelector(
  width,
  tMax,
  tMin,
  formatTemp,
  (width, tMax, tMin, format) => math.scaleLinear([tMin, tMax].map(format), [0, width])
);

export const pToPx = createSelector(graphHeight, pMax, pMin, (height, pMax, pMin) =>
  math.scaleLog([pMax, pMin], [height, 0])
);

export const pToGh = createSelector(params, (p) => math.scaleLog(p.level, p.gh));

export const pAxisToPx = createSelector(
  params,
  pToGh,
  graphHeight,
  pMin,
  formatAltitude,
  (params, pToGh, height, pMin, formatAltitude) =>
    math.scaleLinear([params.gh[0], pToGh(pMin)].map(formatAltitude), [height, 0])
);

export const line = createSelector(tToPx, skew, graphHeight, pToPx, (tToPx, skew, height, pToPx) =>
  math.line(
    (v) => tToPx(v[0]) + skew * (height - pToPx(v[1])),
    (v) => pToPx(v[1])
  )
);

export const pSfc = createSelector(elevation, params, pToGh, (elevation, params, pToGh) => {
  const levels = params.level;
  return Math.min(pToGh.invert(elevation), levels[0]);
});

export const tSfc = createSelector(params, pSfc, (params, sfcPressure) => {
  const levels = params.level;
  const temp = params.temp;
  const pToTemp = math.scaleLog(levels, temp);
  return pToTemp(sfcPressure);
});

export const dewpointSfc = createSelector(params, pSfc, (params, sfcPressure) => {
  const levels = params.level;
  const dewpoint = params.dewpoint;
  const pToDp = math.scaleLog(levels, dewpoint);
  return pToDp(sfcPressure);
});

export const ghAxisStep = createSelector(altiMetric, (m) => (m === "m" ? 1000 : 3000));

export const tAxisStep = createSelector(tMetric, (m) => (m === "°C" ? 10 : 20));
