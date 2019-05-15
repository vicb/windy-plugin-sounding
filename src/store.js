import {createStore, applyMiddleware} from 'redux';
import thunk from 'redux-thunk';
import {rootReducer} from './reducers/sounding';
import * as soundingAct from './actions/sounding';
import * as skewTAct from './actions/skewt';
import * as windAct from './actions/wind';
/* strip-from-prod */
import logger from 'redux-logger';
/* end-strip-from-prod */

const $ = W.require("$");
const plugins = W.require("plugins");
const windyStore = W.require("store");
const favorites = W.require("favs");

let store;

export function getStore() {
  if (store) {
    return store;
  }

  const middlewares = [thunk];
  /* strip-from-prod */
  middlewares.push(logger);
  /* end-strip-from-prod */
  store = createStore(rootReducer, applyMiddleware(...middlewares));

  const container = $("#sounding-chart");
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

  plugins["detail-render"].load().then(() => {
    W.define("meteogram-ext", ["meteogram", "Class"], function(m, c) {
      return c.extend(m, {
        legend: () => this,
      });
    });
    store.dispatch(soundingAct.setMeteogram(W.require("meteogram-ext")));
  });

  return store;
}

export function updateMetrics() {
  if (store) {
    store.dispatch(soundingAct.setMetricTemp(windyStore.get('metric_temp')));
    store.dispatch(soundingAct.setMetricAltitude(windyStore.get('metric_altitude')));
    store.dispatch(soundingAct.setMetricSpeed(windyStore.get('metric_wind')));
  }
}
