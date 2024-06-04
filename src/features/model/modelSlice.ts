import windyUtils from "@windy/utils";
import windySubscription from "@windy/subscription";
import windyProducts from "@windy/products";
import {
  DataHash,
  MeteogramDataPayload,
  WeatherDataPayload,
  LatLon
} from "@windy/interfaces";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import * as atm from "src/util/atmosphere";
import { maybeFetchParams } from "src/features";
import { AppDispatch, AppThunk, RootState } from "src/util/store";

export const SUPPORTED_MODEL_PREFIXES = [
  "ecmwf",
  "gfs",
  "nam",
  "icon",
  "hrrr",
  "ukv",
  "aromeReunion",
  "aromeAntilles"
];

export type FetchParamsPayload = Omit<ModelState, "airData" | "forecast">;
export type ReceiveParamsPayload = ModelState;

export type FetchParamsAction = PayloadAction<FetchParamsPayload>;
export type ReceiveParamsAction = PayloadAction<ReceiveParamsPayload>;
export type ModelNameAction = PayloadAction<ModelState["modelName"]>;

export type ModelState = {
  lat?: LatLon["lat"];
  lon?: LatLon["lon"];
  modelName: typeof SUPPORTED_MODEL_PREFIXES[number];
  airData?: MeteogramDataPayload;
  forecast?: WeatherDataPayload<DataHash>;
};

const initialState: ModelState = { modelName: "ecmwf" };

const modelSlice = createSlice({
  name: "model",
  initialState,
  reducers: {
    updateModelName: (state, action: ModelNameAction) => {
      state.modelName = action.payload;
    },
    fetchParams: (state, action: FetchParamsAction) => {
      const { modelName, lat, lon } = action.payload;
      const model = state[modelName] || {};
      const key = windyUtils.latLon2str({ lat, lon });
      const newValue = { ...model[key], isLoading: true };

      state[modelName] = {
        ...model,
        [key]: newValue,
      };
    },

    receiveParams: (state, action: ReceiveParamsAction) => {
      const { modelName, airData, forecast, lat, lon } = action.payload;
      const model = state[modelName] || {};
      const key = windyUtils.latLon2str({ lat, lon });
      const newValue = {
        ...model[key],
        ...computeForecasts(modelName, airData, forecast),
        isLoading: false,
        loaded: Date.now()
      };

      state[modelName] = {
        ...model,
        [key]: newValue,
      };
    }
  },
});

// Thunks
export const setModelName = (potentialModelName: ModelState["modelName"]): AppThunk => (dispatch: AppDispatch, getState: () => RootState) => {
  const newModelName = SUPPORTED_MODEL_PREFIXES.some((prefix) => potentialModelName.startsWith(prefix))
    ? potentialModelName
    : initialState.modelName;

  dispatch(modelSlice.actions.updateModelName(newModelName));
  maybeFetchParams(dispatch, getState);
};

// Utility functions
function extractAirDataParam(airData, param, levels, tsIndex) {
  return levels.map((level) => {
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

  for (const name in airData.data) {
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

  const interval = windySubscription.hasAny()
    ? windyProducts[modelName].intervalPremium ||
    windyProducts[modelName].interval
    : windyProducts[modelName].interval;
  const nextUpdate = forecast.header.updateTs + (interval + 60) * 60 * 1000;

  return {
    airData,
    forecast,
    times,
    values,
    levels,
    tMax,
    tMin,
    pMax: levels.at(-1),
    pMin: levels[0],
    nextUpdate,
  };
}

export const { fetchParams, receiveParams } = modelSlice.actions;
export default modelSlice.reducer;
