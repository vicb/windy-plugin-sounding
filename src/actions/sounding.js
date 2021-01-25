const windyUtils = W.require("utils");
const windyUrls = W.require("urls");
const windyHttp = W.require("http");

// plugin
export const SET_LOCATION = "SDG.SET_LOCATION";
export const SET_MODELNAME = "SDG.SET_MODEL";
export const SET_TIME = "SDG.SET_TIME";
export const ADD_SUBSCRIPTION = "SDG.ADD_SUBSCRIPTION";
export const DELETE_SUBSCRIPTION = "SDG.DELETE_SUBSCRIPTION";
export const SET_ACTIVE = "SDG.SET_ACTIVE";
export const MOVE_MARKER = "SDG.MOVE_MARKER";
export const REMOVE_MARKER = "SDG.REMOVE_MARKER";
export const SET_WIDTH = "SDG.SET_WIDTH";
export const SET_HEIGHT = "SDG.SET_HEIGHT";
export const SET_METRIC_TEMP = "SDG.SET_METRIC_TEMP";
export const SET_METRIC_ALTITUDE = "SDG.SET_METRIC_ALTITUDE";
export const SET_METRIC_SPEED = "SDG.SET_METRIC_SPEED";
export const ADD_FAVORITE = "SDG.ADD_FAVORITE";
export const FETCH_PARAMS = "SDG.FETCH_PARAMS";
export const RECEIVE_PARAMS = "SDG.RECEIVE_PARAMS";
export const TOGGLE_ZOOM = "SDG.TOGGLE_ZOOM";

// Subset of W.store.get("availProducts") with sounding data.
export const SUPPORTED_MODELS = new Set(["ecmwf", "gfs", "nam", "icon", "iconEu"]);
const DEFAULT_MODEL = "ecmwf";

export const toggleZoom = () => ({
  type: TOGGLE_ZOOM,
});

export const addFavorite = (favorite) => ({
  type: ADD_FAVORITE,
  payload: favorite,
});

export const setMetricTemp = (metric) => ({
  type: SET_METRIC_TEMP,
  payload: metric,
});

export const setMetricAltitude = (metric) => ({
  type: SET_METRIC_ALTITUDE,
  payload: metric,
});

export const setMetricSpeed = (metric) => ({
  type: SET_METRIC_SPEED,
  payload: metric,
});

export const setLocation = (lat, lon) => (dispatch) => {
  dispatch({
    type: SET_LOCATION,
    payload: { lat, lon },
  });
  dispatch(moveMarker(lat, lon));
  dispatch(maybeFetchParams());
};

export const setModelName = (modelName) => (dispatch) => {
  modelName = SUPPORTED_MODELS.has(modelName) ? modelName : DEFAULT_MODEL;

  dispatch({
    type: SET_MODELNAME,
    payload: modelName,
  });
  dispatch(maybeFetchParams());
};

export const setTime = (timestamp) => ({
  type: SET_TIME,
  payload: timestamp,
});

export const addSubscription = (cb) => ({
  type: ADD_SUBSCRIPTION,
  payload: cb,
});

function deleteSubscription(cb) {
  return {
    type: DELETE_SUBSCRIPTION,
    payload: cb,
  };
}

export const cancelSubscriptions = () => (dispatch, getState) => {
  getState().plugin.subscriptions.forEach((cb) => {
    cb();
    dispatch(deleteSubscription(cb));
  });
};

export const setActive = (active) => ({
  type: SET_ACTIVE,
  payload: active,
});

export const moveMarker = (lat, lon) => ({
  type: MOVE_MARKER,
  payload: { lat, lon },
});

export const removeMarker = () => ({
  type: REMOVE_MARKER,
});

export const setWidth = (width) => ({
  type: SET_WIDTH,
  payload: width,
});

export const setHeight = (height) => ({
  type: SET_HEIGHT,
  payload: height,
});

// params

function shouldFetchForecasts(model, lat, lon) {
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
}

export function maybeFetchParams() {
  return (dispatch, getState) => {
    const state = getState();
    const { lat, lon, modelName } = state.plugin;
    if (
      lat != null &&
      lon != null &&
      modelName != null &&
      shouldFetchForecasts(getState().models[modelName], lat, lon)
    ) {
      dispatch(fetchParams(lat, lon, modelName));
      const step = 3;
      const forecastUrl = windyUrls.getPointForecast(modelName, { lat, lon, step }, "detail");
      const meteogramUrl = windyUrls.getMeteogramForecast(modelName, { lat, lon, step });

      Promise.all([windyHttp.get(meteogramUrl), windyHttp.get(forecastUrl)]).then(
        ([airData, forecast]) => {
          dispatch(receiveParams(lat, lon, modelName, airData.data, forecast.data));
        }
      );
    }
  };
}

const fetchParams = (lat, lon, modelName) => ({
  type: FETCH_PARAMS,
  payload: { lat, lon, modelName },
});

const receiveParams = (lat, lon, modelName, airData, forecast) => ({
  type: RECEIVE_PARAMS,
  payload: { lat, lon, modelName, airData, forecast },
});
