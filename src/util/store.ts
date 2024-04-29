import { configureStore, EnhancedStore } from '@reduxjs/toolkit';
import windyStore from "@windy/store";
import * as skewTAct from "../actions/skewt";
import * as soundingAct from "../actions/sounding";
import { rootReducer } from "../reducers/sounding";

export type AppStore = EnhancedStore<{ [K in keyof typeof rootReducer]: ReturnType<typeof rootReducer[K]> }>;

let store: AppStore;

export function getStore(container: HTMLDivElement): AppStore {
  if (store) {
    return store;
  }

  // Automatically adds thunk and Redux DevTools
  store = configureStore({
    reducer: rootReducer,
    devTools: process.env.NODE_ENV !== 'production'
  });

  // TODO: mobile dimension
  const graphWith = container.clientWidth;
  const graphHeight = Math.min(graphWith, window.innerHeight * 0.7);

  store.dispatch(soundingAct.setWidth(graphWith));
  store.dispatch(soundingAct.setHeight(graphHeight));

  updateMetrics(store);

  store.dispatch(skewTAct.setPMin(400));

  return store;
}

export function updateMetrics(store: AppStore) {
  if (store) {
    store.dispatch(soundingAct.setMetricTemp(windyStore.get("metric_temp")));
    store.dispatch(soundingAct.setMetricAltitude(windyStore.get("metric_altitude")));
    store.dispatch(soundingAct.setMetricSpeed(windyStore.get("metric_wind")));
  }
}
