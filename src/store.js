import * as skewTAct from "./actions/skewt";
import * as soundingAct from "./actions/sounding";

import { applyMiddleware, compose, createStore } from "redux";

import { rootReducer } from "./reducers/sounding";
import thunk from "redux-thunk";

const $ = W.require("$");
const windyStore = W.require("store");
const favorites = W.require("favs");

let store;

export function getStore() {
  if (store) {
    return store;
  }

  const middlewares = [thunk];
  const composeEnhancers =
    (process.env.NODE_ENV == "development" ? window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ : null) ||
    compose;
  store = createStore(rootReducer, composeEnhancers(applyMiddleware(...middlewares)));

  const container = $("#bsounding-chart");
  const graphSize = container.clientWidth - 10;
  store.dispatch(soundingAct.setWidth(graphSize));
  store.dispatch(soundingAct.setHeight(graphSize));

  updateMetrics(store);

  favorites.getArray().forEach((f) => {
    store.dispatch(soundingAct.addFavorite(f));
  });

  store.dispatch(skewTAct.setPMin(400));

  return store;
}

export function updateMetrics() {
  if (store) {
    store.dispatch(soundingAct.setMetricTemp(windyStore.get("metric_temp")));
    store.dispatch(soundingAct.setMetricAltitude(windyStore.get("metric_altitude")));
    store.dispatch(soundingAct.setMetricSpeed(windyStore.get("metric_wind")));
  }
}
