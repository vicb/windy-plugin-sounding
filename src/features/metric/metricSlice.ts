import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import windyStore from "@windy/store";
import { AppDispatch } from "src/util/store";

export type TempAction = PayloadAction<MetricState["temp"]>;
export type AltitudeAction = PayloadAction<MetricState["altitude"]>;
export type SpeedAction = PayloadAction<MetricState["speed"]>;

export type MetricState = {
  temp?: "°F" | "°C";
  altitude?: "m" | "ft";
  speed?: "km/h" | "m/s" | "mph" | "kt" | "bft";
  pressure?: string;
};

const initialState: MetricState = {};

const metricSlice = createSlice({
  name: "metric",
  initialState,
  reducers: {
    setMetricTemp: (state, action: TempAction) => {
      state.temp = action.payload;
    },
    setMetricAltitude: (state, action: AltitudeAction) => {
      state.altitude = action.payload;
    },
    setMetricSpeed: (state, action: SpeedAction) => {
      state.speed = action.payload;
    }
  },
});

export const { setMetricTemp, setMetricAltitude, setMetricSpeed } = metricSlice.actions;

export const updateMetrics = () => (dispatch: AppDispatch) => {
  dispatch(setMetricTemp(windyStore.get("metric_temp")));
  dispatch(setMetricAltitude(windyStore.get("metric_altitude")));
  dispatch(setMetricSpeed(windyStore.get("metric_wind")));
};

export default metricSlice.reducer;
