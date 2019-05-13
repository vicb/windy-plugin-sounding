import { combineReducers } from "redux";
import {
  SET_LOCATION,
  SET_MODELNAME,
  SET_TIME,
  FETCH_PARAMS,
  RECEIVE_PARAMS,
  ADD_SUBSCRIPTION,
  DELETE_SUBSCRIPTION,
  SET_ACTIVE,
  MOVE_MARKER,
  REMOVE_MARKER,
  SET_WIDTH,
  SET_HEIGHT,
  SET_METRIC_TEMP,
  SET_METRIC_ALTITUDE,
  SET_METRIC_SPEED,
  SET_METEOGRAM,
  ADD_FAVORITE,
} from "../actions/sounding";
import { skewt } from "./skewt";
import { windgram } from "./wind";
import * as atm from "../atmosphere";

const windyUtils = W.require("utils");
const windyMap = W.require("map");
const windyProducts = W.require("products");

function metrics(state = {}, action) {
  switch (action.type) {
    case SET_METRIC_TEMP: {
      const { metric } = action.payload;
      return { ...state, temp: metric };
    }
    case SET_METRIC_ALTITUDE: {
      const { metric } = action.payload;
      return { ...state, altitude: metric };
    }
    case SET_METRIC_SPEED: {
      const { metric } = action.payload;
      return { ...state, speed: metric };
    }
    default:
      return state;
  }
}

// plugin

function plugin(state = { subscriptions: [], favorites: [] }, action) {
  switch (action.type) {
    case SET_LOCATION:
      const { lat, lon } = action.payload;
      return { ...state, lat, lon };
    case SET_MODELNAME:
      const { modelName } = action.payload;
      return { ...state, modelName };
    case SET_TIME:
      const { timestamp } = action.payload;
      return { ...state, timestamp };
    case ADD_SUBSCRIPTION: {
      const { cb } = action.payload;
      return { ...state, subscriptions: state.subscriptions.concat(cb) };
    }
    case DELETE_SUBSCRIPTION: {
      const { cb } = action.payload;
      return { ...state, subscriptions: state.subscriptions.filter(fn => fn != cb) };
    }
    case SET_ACTIVE:
      const { active } = action.payload;
      return { ...state, active };
    case MOVE_MARKER: {
      let { marker } = state;
      const { lon: lng, lat } = action.payload;
      if (!marker) {
        marker = L.marker(
          { lat, lng },
          {
            icon: windyMap.myMarkers.pulsatingIcon,
            zIndexOffset: -300,
          }
        ).addTo(windyMap);
        return { ...state, marker };
      }
      marker.setLatLng({ lat, lng });
      return state;
    }
    case REMOVE_MARKER:
      const { marker } = state;
      if (marker) {
        windyMap.removeLayer(marker);
      }
      return { ...state, marker: null };
    case SET_WIDTH:
      const { width } = action.payload;
      return { ...state, width };
    case SET_HEIGHT:
      const { height } = action.payload;
      return { ...state, height };
    case SET_METEOGRAM:
      const { meteogram } = action.payload;
      return { ...state, meteogram };
    case ADD_FAVORITE: {
      const { favorite } = action.payload;
      return { ...state, favorites: [...state.favorites, favorite] };
    }
    default:
      return state;
  }
}

// params
function extractAirDataParam(airData, param, levels, tsIndex) {
  return levels.map(level => {
    const valueByTs = airData.data[`${param}-${level}h`];
    const value = Array.isArray(valueByTs) ? valueByTs[tsIndex] : null;
    if (param === "gh" && value == null) {
      // Approximate gh when not provided by the model
      return Math.round(atm.getElevation(level));
    }
    return value;
  });
}

function extractLevels(airData) {
  const levels = [];

  for (let name in airData.data) {
    const m = name.match(/temp-(\d+)h$/);
    if (m) {
      levels.push(Number(m[1]));
    }
  }

  return levels.sort((a, b) => (Number(a) < Number(b) ? 1 : -1));
}

function computeForecasts(modelName, airData, forecast) {
  const times = airData.data.hours;
  const levels = extractLevels(airData);

  const values = [];
  let tMax = Number.MIN_VALUE;
  let tMin = Number.MAX_VALUE;
  for (let i = 0; i < times.length; i++) {
    const temp = extractAirDataParam(airData, "temp", levels, i);
    tMax = Math.max(tMax, ...temp);
    tMin = Math.min(tMin, ...temp);
    values.push({
      temp,
      dewpoint: extractAirDataParam(airData, "dewpoint", levels, i),
      gh: extractAirDataParam(airData, "gh", levels, i),
      wind_u: extractAirDataParam(airData, "wind_u", levels, i),
      wind_v: extractAirDataParam(airData, "wind_v", levels, i),
    });
  }

  const { interval } = windyProducts[modelName];
  const nextUpdate = forecast.header.updateTs + (interval + 60) * 60 * 1000;

  return {
    airData,
    forecast,
    times,
    values,
    levels,
    tMax,
    tMin,
    pMax: levels[levels.length - 1],
    pMin: levels[0],
    nextUpdate,
  };
}

function forecasts(state = { isLoading: false }, action, modelName) {
  switch (action.type) {
    case FETCH_PARAMS:
      return { ...state, isLoading: true };
    case RECEIVE_PARAMS:
      const { airData, forecast } = action.payload;
      const forecasts = computeForecasts(modelName, airData, forecast);
      return { ...state, ...forecasts, isLoading: false, loaded: Date.now() };
    default:
      return state;
  }
}

function models(state = {}, action) {
  switch (action.type) {
    case FETCH_PARAMS:
    case RECEIVE_PARAMS:
      const { modelName } = action.payload;
      const model = state[modelName] || {};
      const key = windyUtils.latLon2str(action.payload);
      return {
        ...state,
        [modelName]: { ...model, [key]: forecasts(model[key], action, modelName) },
      };
    default:
      return state;
  }
}

export const rootReducer = combineReducers({ plugin, models, metrics, skewt, windgram });
