import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { map as windyMap, markers } from "@windy/map";
import { SavedFav, LatLon } from "@windy/interfaces";
import { setUrl } from "@windy/location";
import windyFetch from "@windy/fetch";
import windyUtils from "@windy/utils";
import { AppDispatch, AppThunk, RootState } from "src/util/store";
import { ModelState, fetchParams, receiveParams } from "src/features";
import config from "src/pluginConfig";

export type LocationAction = PayloadAction<LatLon>;
export type TimeAction = PayloadAction<PluginState["timestamp"]>;
export type SubscriptionAction = PayloadAction<Subscription>;
export type ActiveAction = PayloadAction<PluginState["active"]>;
export type WidthAction = PayloadAction<PluginState["width"]>;
export type HeightAction = PayloadAction<PluginState["height"]>;
export type FavoritesAction = PayloadAction<PluginState["favorites"]>;
export type YPointerAction = PayloadAction<PluginState["yPointer"]>;

export type Subscription = () => void;
export type PluginState = {
  subscriptions: Subscription[];
  favorites: SavedFav[];
  zoom: boolean;
  marker: any | null;
  lat?: LatLon["lat"];
  lon?: LatLon["lon"];
  timestamp?: number;
  active?: boolean;
  width?: number;
  height?: number;
  yPointer?: number;
};

const initialState: PluginState = {
  subscriptions: [],
  favorites: [],
  zoom: true,
  marker: null,
};

const pluginSlice = createSlice({
  name: "plugin",
  initialState,
  reducers: {
    updateLocation: {
      reducer: (state, action: LocationAction) => {
        const { lat, lon } = action.payload;
        state.lat = lat;
        state.lon = lon;
      },
      prepare: (lat: PluginState["lat"], lon: PluginState["lon"]) => ({
        payload: { lat, lon }
      })
    },
    setTime: (state, action: TimeAction) => {
      state.timestamp = action.payload;
    },
    addSubscription: (state, action: SubscriptionAction) => {
      state.subscriptions.push(action.payload);
    },
    deleteSubscription: (state, action: SubscriptionAction) => {
      state.subscriptions = state.subscriptions.filter((fn) => fn != action.payload);
    },
    setActive: (state, action: ActiveAction) => {
      state.active = action.payload;
    },
    moveMarker: {
      reducer: (state, action: LocationAction) => {
        const { lon: lng, lat } = action.payload;

        if (!state.marker) {
          state.marker = L.marker(
            { lat, lng },
            { icon: markers.pulsatingIcon, zIndexOffset: -300 }
          ).addTo(windyMap);
        } else {
          state.marker.setLatLng({ lat, lng });
        }
      },
      prepare: (lat: ModelState["lat"], lon: ModelState["lon"]) => ({
        payload: { lat, lon }
      })
    },
    removeMarker: (state) => {
      if (state.marker) {
        windyMap.removeLayer(state.marker);
      }
      state.marker = null;
    },
    setWidth: (state, action: WidthAction) => {
      state.width = action.payload;
    },
    setHeight: (state, action: HeightAction) => {
      state.height = action.payload;
    },
    setFavorites: (state, action: FavoritesAction) => {
      state.favorites = action.payload;
    },
    setYPointer: (state, action: YPointerAction) => {
      state.yPointer = action.payload;
    },
    toggleZoom: (state) => {
      state.zoom = !state.zoom;
    }
  }
});

// Helpers
const shouldFetchForecasts = (model, lat: LatLon["lat"], lon: LatLon["lon"]) => {
  if (!model) {
    return true;
  }
  const key = windyUtils.latLon2str({ lat, lon });
  const forecasts = model[key];
  if (!forecasts) {
    return true;
  }

  if (forecasts.isLoading) {
    return false;
  }

  const now = Date.now();
  return now > forecasts.nextUpdate && now - forecasts.loaded > 60 * 1000;
};

export const maybeFetchParams = (dispatch: AppDispatch, getState: () => RootState) => {
  const state: RootState = getState();
  const { lat, lon } = state.plugin;
  const { modelName } = state.model;
  const readyToFetch =
    lat != null
    && lon != null
    && modelName != null
    && shouldFetchForecasts(state.model[modelName], lat, lon);

  if (readyToFetch) {
    dispatch(fetchParams({ lat, lon, modelName }));
    const forecastOptions = { lat, lon, step: 3 };
    const pAirData = windyFetch.getMeteogramForecastData(modelName, forecastOptions);
    const pForecast = windyFetch.getPointForecastData(modelName, forecastOptions, "detail");

    Promise.all([pAirData, pForecast]).then(([{ data: airData }, { data: forecast }]) => {
      dispatch(receiveParams({ lat, lon, modelName, airData, forecast }));
    });
  }
};

// Thunks
export const setLocation = (lat: LatLon["lat"], lon: LatLon["lon"]): AppThunk => (dispatch: AppDispatch, getState: () => RootState) => {
  dispatch(pluginSlice.actions.updateLocation(lat, lon));
  dispatch(pluginSlice.actions.moveMarker(lat, lon));
  maybeFetchParams(dispatch, getState);
  setUrl(config.name, { lat, lon });
};
export const cancelSubscriptions = () => (dispatch: AppDispatch, getState: () => RootState) => {
  getState().plugin.subscriptions.forEach((cb) => {
    cb();
    dispatch(pluginSlice.actions.deleteSubscription(cb));
  });
};

export const {
  setTime,
  addSubscription,
  setActive,
  moveMarker,
  removeMarker,
  setWidth,
  setHeight,
  setFavorites,
  setYPointer,
  toggleZoom
} = pluginSlice.actions;

export default pluginSlice.reducer;
