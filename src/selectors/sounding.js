import * as math from "../math";

import { computeClouds, hrAlt } from "../clouds";

import { createSelector } from "reselect";

const windyMetrics = W.require("metrics");
const windyUtils = W.require("utils");
const windyMap = W.require("map");
const windyStore = W.require("store");

export const lat = (state) => state.plugin.lat;
export const lon = (state) => state.plugin.lon;
export const modelName = (state) => state.plugin.modelName;
export const timestamp = (state) => state.plugin.timestamp;
export const tMetric = (state) => state.metrics.temp;
export const pMetric = (state) => state.metrics.pressure;
export const altiMetric = (state) => state.metrics.altitude;
export const speedMetric = (state) => state.metrics.speed;
export const favorites = (state) => state.plugin.favorites;
export const width = (state) => state.plugin.width;
export const height = (state) => state.plugin.height;
export const zoom = (state) => state.plugin.zoom;

// Format parameters

export const formatTemp = createSelector(tMetric, (metric) => (v) =>
  Math.round(windyMetrics.temp.conv[metric].conversion(v))
);

export const formatPressure = createSelector(pMetric, (metric) => (v) =>
  Math.round(windyMetrics.pressure.conv[metric].conversion(v))
);

export const formatAltitude = createSelector(altiMetric, (metric) => (v) =>
  Math.round(windyMetrics.altitude.conv[metric].conversion(v) / 100) * 100
);

export const formatSpeed = createSelector(speedMetric, (metric) => (v) =>
  Math.round(windyMetrics.wind.conv[metric].conversion(v))
);

export const locationKey = createSelector(lat, lon, (lat, lon) =>
  windyUtils.latLon2str({ lat, lon })
);

// Forecasts
const models = (state) => state.models;

export const forecasts = createSelector(
  locationKey,
  models,
  modelName,
  (key, models, modelName) => {
    return (models[modelName] || {})[key];
  }
);

const clouds = createSelector(forecasts, (forecasts) => computeClouds(forecasts.airData.data));

const cloudSlice = createSelector(
  clouds,
  timestamp,
  forecasts,
  (cloudsData, timestamp, forecasts) => {
    const { clouds, width, height } = cloudsData;
    const times = forecasts.times;
    const next = times.findIndex((t) => t >= timestamp);
    if (next == -1) {
      return null;
    }
    const prev = Math.max(0, next - 1);
    const stepX = width / times.length;
    const nextX = stepX / 2 + next * stepX;
    const prevX = stepX / 2 + prev * stepX;
    const x = Math.round(math.linearInterpolate(times[prev], prevX, times[next], nextX, timestamp));
    const cover = [];
    for (let y = 0; y < height; y++) {
      cover.push(clouds[x + y * width]);
    }
    return cover;
  }
);

export const cloudCover = createSelector(cloudSlice, (slice) => {
  const length = slice.length;
  const levels = [1000, 950, 925, 900, 850, 800, 700, 600, 500, 400, 300, 200, 150, 100];
  // lower indexes correspond to lower pressures
  const indexes = hrAlt.map((p) => (length - 1) * (1 - p / 100));
  const pToIndex = math.scaleLinear(levels, indexes);
  return (pFrom, pTo) => {
    const idxFrom = Math.round(pToIndex(pFrom));
    if (pTo == null) {
      return slice[idxFrom];
    }
    const idxTo = Math.round(pToIndex(pTo));
    const covers = slice.slice(idxTo, idxFrom).filter((v) => v > 0);
    return covers.length > 0 ? Math.min(...covers) : 0;
  };
});

export const isLoading = createSelector(forecasts, (f) => !f || f.isLoading === true);

export const tMax = createSelector(forecasts, (f) => f.tMax);

export const tMin = createSelector(forecasts, (f) => f.tMin);
export const pMin = createSelector(forecasts, (f) => f.pMax);
export const pMax = createSelector(forecasts, (f) => f.pMin);

export const elevation = createSelector(forecasts, ({ forecast, airData }) => {
  let elevation = forecast.header.elevation == null ? 0 : forecast.header.elevation;
  if (airData.header.elevation != null) {
    elevation = airData.header.elevation;
  }
  if (airData.header.modelElevation != null) {
    elevation = airData.header.modelElevation;
  }

  return elevation;
});

export const modelUpdated = createSelector(forecasts, (f) => f.forecast.header.updateTs);

export const modelNextUpdate = createSelector(forecasts, (f) => f.nextUpdate);

const tzOffset = createSelector(forecasts, (f) => f.forecast.celestial.TZoffset);

const sunrise = createSelector(forecasts, (f) => f.forecast.celestial.sunriseTs);

const sunset = createSelector(forecasts, (f) => f.forecast.celestial.sunsetTs);

export const isThermalHours = createSelector(
  sunrise,
  sunset,
  timestamp,
  (sunrise, sunset, timestamp) => {
    const start = sunrise + 2 * 3600000;
    const stop = sunset - 2 * 3600000;
    const duration = stop - start;
    if (timestamp < start || (timestamp - start) % (24 * 3600000) > duration) {
      return false;
    }
    return true;
  }
);

export const centerMap = createSelector(width, (width) => (lat, lon) => {
  const bounds = windyMap.getBounds();
  const deltaLng = bounds.getEast() - bounds.getWest();
  const centerLon = lon - ((deltaLng / windyMap.getSize().x) * width) / 2;
  windyMap.panTo({ lng: centerLon, lat });
});

let nextWheelMove = Date.now();
export const wheelHandler = createSelector(tzOffset, (tzOffset) => (e) => {
  if (Date.now() > nextWheelMove) {
    let ts = windyStore.get("timestamp");
    let next = 100;
    const direction = Math.sign(event.deltaY);
    if (e.shiftKey || e.ctrlKey) {
      next = 1000;
      const d = new Date(ts);
      const h = d.getUTCHours();
      d.setUTCMinutes(0);
      ts = d.getTime();
      const refTime = (13 - tzOffset + 24) % 24;
      const dh = (refTime - h) * direction;
      if (dh <= 0) {
        ts += direction * (24 + dh) * 3600 * 1000;
      } else {
        ts += direction * dh * 3600 * 1000;
      }
    } else {
      ts += direction * 3600 * 1000;
    }

    windyStore.set("timestamp", ts);
    nextWheelMove = Date.now() + next;
  }
  e.stopPropagation();
  e.preventDefault();
});
