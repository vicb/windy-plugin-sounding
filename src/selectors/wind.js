import { createSelector } from "reselect";
import { pToPx, params } from "./skewt";
import { zoom } from "./sounding";
import * as math from "../math";

export const width = state => state.windgram.width;

export const windSpeedMax = createSelector(
  params,
  params => (params ? Math.max(60 / 3.6, ...params.windSpeed) : 0)
);

export const speedToPx = createSelector(
  windSpeedMax,
  width,
  zoom,
  (speedMax, width, zoom) =>
    zoom
      ? math.scaleLinear([0, 30 / 3.6, speedMax], [0, width / 2, width])
      : math.scaleLinear([0, speedMax], [0, width])
);

export const line = createSelector(
  speedToPx,
  pToPx,
  (speedToPx, pToPx) => math.line(v => speedToPx(v[0]), v => pToPx(v[1]))
);
