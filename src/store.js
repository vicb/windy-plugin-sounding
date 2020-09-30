import * as skewTAct from './actions/skewt';
import * as soundingAct from './actions/sounding';
import * as windAct from './actions/wind';

import {applyMiddleware, compose, createStore} from 'redux';

import {rootReducer} from './reducers/sounding';
import thunk from 'redux-thunk';

const $ = W.require("$");
const plugins = W.require("plugins");
const windyStore = W.require("store");
const favorites = W.require("favs");

let store;

export function getStore() {
  if (store) {
    return store;
  }

  const middlewares = [thunk, ];
  const composeEnhancers = (process.env.NODE_ENV == 'development' ? window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ : null) || compose;
  store = createStore(rootReducer, composeEnhancers(applyMiddleware(...middlewares)));

  const container = $("#bsounding-chart");
  store.dispatch(soundingAct.setWidth(container.clientWidth));
  store.dispatch(soundingAct.setHeight(600));
  updateMetrics(store);
  favorites.getArray().forEach(f => {
    store.dispatch(soundingAct.addFavorite(f));
  });

  // TODO - compute this from container geom.
  // Do we need to keep wxh for the sounding ?
  store.dispatch(skewTAct.setWidth(460));
  store.dispatch(skewTAct.setHeight(580));
  store.dispatch(skewTAct.setPMin(400));

  store.dispatch(windAct.setWidth(100));
  store.dispatch(windAct.setHeight(580));

  store.dispatch(soundingAct.setZoom(true));

  return store;
}

export function updateMetrics() {
  if (store) {
    store.dispatch(soundingAct.setMetricTemp(windyStore.get('metric_temp')));
    store.dispatch(soundingAct.setMetricAltitude(windyStore.get('metric_altitude')));
    store.dispatch(soundingAct.setMetricSpeed(windyStore.get('metric_wind')));
  }
}
