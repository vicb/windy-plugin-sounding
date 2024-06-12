import { createSelector } from "@reduxjs/toolkit";
import { pToPx, params } from "src/features/skewt/skewtSelector";
import {
  GRAPH_WINDGRAM_WIDTH_PERCENT,
  width as totalWidth,
  zoom
} from "src/features/plugin/pluginSelector";
import { RootState } from "src/util/store";
import * as math from "src/util/math";

export const width = (state: RootState) =>
  Math.floor((totalWidth(state) * GRAPH_WINDGRAM_WIDTH_PERCENT) / 100);

export const windSpeedMax = createSelector(params, (ps) =>
  ps ? Math.max(60 / 3.6, ...ps.windSpeed) : 0
);

export const speedToPx = createSelector(windSpeedMax, width, zoom, (speedMax, w, z) =>
  z
    ? math.scaleLinear([0, 30 / 3.6, speedMax], [0, w / 2, w])
    : math.scaleLinear([0, speedMax], [0, w])
);

export const line = createSelector(speedToPx, pToPx, (sToPx, toPx) =>
  math.line(
    (v) => sToPx(v[0]),
    (v) => toPx(v[1])
  ));
