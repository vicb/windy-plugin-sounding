import { combineReducers } from "@reduxjs/toolkit";

// import all reducers
import pluginReducer from "src/features/plugin/pluginSlice";
import metricReducer from "src/features/metric/metricSlice";
import skewtReducer from "src/features/skewt/skewtSlice";
import modelReducer from "src/features/model/modelSlice";
import windReducer from "src/features/wind/windSlice";

// export combined reducers
const rootReducer = combineReducers({
  plugin: pluginReducer,
  metric: metricReducer,
  model: modelReducer,
  skewt: skewtReducer,
  windgram: windReducer
});

export default rootReducer;

// export all actions/thunks from one place
export * from "src/features/plugin/pluginSlice";
export * from "src/features/model/modelSlice";
export * from "src/features/metric/metricSlice";
export * from "src/features/skewt/skewtSlice";
export * from "src/features/wind/windSlice";

// export all selectors from one place
export * as pluginSel from "src/features/plugin/pluginSelector";
export * as windSel from "src/features/wind/windSelector";
export * as skewTSel from "src/features/skewt/skewtSelector";
