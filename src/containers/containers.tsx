// eslint-disable-next-line no-unused-vars
import { h } from "preact";
import {
  setLocation,
  setYPointer,
  toggleZoom,
  skewTSel,
  pluginSel,
  windSel
} from "src/features";
import { connect } from "react-redux";
import * as windyRootScope from "@windy/rootScope";

import { Favorites } from "../components/favorites.js";
// eslint-disable-next-line no-unused-vars
import { LoadingIndicator } from "../components/loading.js";
import { SkewT } from "../components/skewt.js";
import { WindGram } from "../components/wind.js";
import { parcelTrajectory } from "../util/atmosphere.js";


const statePointerDispatch = (dispatch) => ({
  setYPointer: (y) => {
    dispatch(setYPointer(y));
  },
});

function stateToSkewTProp(state) {
  if (pluginSel.isLoading(state)) {
    return { isLoading: true };
  }
  const parameters = skewTSel.params(state);
  const pSfc = skewTSel.pSfc(state);
  let parcel;

  if (pluginSel.isThermalHours(state)) {
    const thermalT = skewTSel.tSfc(state) + 3;
    const dpSfc = skewTSel.dewpointSfc(state);
    const trajectory = parcelTrajectory(parameters, 40, thermalT, pSfc, dpSfc);
    if (trajectory) {
      const { dry, moist, isohume, elevThermalTop, pThermalTop, pCloudTop } = trajectory;
      parcel = {
        trajectory: dry.concat(moist || []),
        isohume,
        elevThermalTop,
        pThermalTop,
        pCloudTop,
      };
    }
  }

  return {
    isLoading: false,
    params: parameters,
    pMax: skewTSel.pMax(state),
    cloudCover: pluginSel.cloudCover(state),
    pSfc,
    parcel,
    formatAltitude: pluginSel.formatAltitude(state),
    formatTemp: pluginSel.formatTemp(state),
    tAxisToPx: skewTSel.tAxisToPx(state),
    tToPx: skewTSel.tToPx(state),
    pToPx: skewTSel.pToPx(state),
    pAxisToPx: skewTSel.pAxisToPx(state),
    line: skewTSel.line(state),
    tMetric: pluginSel.tMetric(state),
    tAxisStep: skewTSel.tAxisStep(state),
    ghMetric: pluginSel.altiMetric(state),
    ghAxisStep: skewTSel.ghAxisStep(state),
    zoom: pluginSel.zoom(state),
    skew: skewTSel.skew(state),
    yPointer: pluginSel.yPointer(state),
  };
}

const ConnectedSkewT = connect(stateToSkewTProp, statePointerDispatch)(SkewT);

const stateToWindProp = (state) => {
  return pluginSel.isLoading(state)
    ? {
        isLoading: true,
      }
    : {
        isLoading: false,
        params: skewTSel.params(state),
        windSpeedMax: windSel.windSpeedMax(state),
        format: pluginSel.formatSpeed(state),
        metric: pluginSel.speedMetric(state),
        pSfc: skewTSel.pSfc(state),
        pToPx: skewTSel.pToPx(state),
        speedToPx: windSel.speedToPx(state),
        line: windSel.line(state),
        zoom: pluginSel.zoom(state),
        yPointer: pluginSel.yPointer(state),
      };
};

const ConnectedWindgram = connect(stateToWindProp, statePointerDispatch)(WindGram);

const stateToFavProp = (state) => ({
  favorites: pluginSel.favorites(state),
  location: pluginSel.locationKey(state),
  isMobile: windyRootScope.isMobile || windyRootScope.isTablet,
});

export const ConnectedFavorites = connect(stateToFavProp)(Favorites);

const stateToTitleProps = (state) => {
  return pluginSel.isLoading(state)
    ? { isLoading: true }
    : {
        isLoading: false,
        modelName: pluginSel.modelName(state),
        updated: pluginSel.modelUpdated(state),
        nextUpdate: pluginSel.modelNextUpdate(state),
      };
};

function formatTimestamp(ts) {
  return new Date(ts).toLocaleString([], {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const SoundingTitle = connect(stateToTitleProps)(({
  isLoading,
  modelName,
  updated,
  nextUpdate,
}) => {
  if (isLoading) {
    return;
  }
  const updateStr = formatTimestamp(updated);
  const nextStr = formatTimestamp(nextUpdate);

  return (
    <p className="model desktop-only">
      Model <strong>{modelName.toUpperCase()}</strong> ({updateStr}). Next update on {nextStr}.
    </p>
  );
});

const stateToAppProps = (state) => {
  const width = pluginSel.width(state);
  const height = pluginSel.height(state);

  const props = {
    centerMap: pluginSel.centerMap(state),
    wheelHandler: () => null,
    title: () => <p className="model">Loading...</p>,
    chart: () => <LoadingIndicator cx={width / 2} cy={height / 2} />,
    width,
    height,
    graphHeight: pluginSel.graphHeight(state),
    skewTWidth: skewTSel.width(state),
    windgramWidth: windSel.width(state),
    zoom: pluginSel.zoom(state),
  };

  const isLoading = pluginSel.isLoading(state);

  if (isLoading) {
    return props;
  }

  const params = skewTSel.params(state);

  if (!params) {
    return {
      ...props,
      title: () => <p className="model">Forecast not available</p>,
      chart: () => (
        <text x="50%" y="50%" textAnchor="middle">
          Forecast not available
        </text>
      ),
    };
  }

  return {
    ...props,
    title: () => <SoundingTitle />,
    chart: ({ skewTWidth, windgramWidth, height }) => (
      <g>
        <ConnectedSkewT width={skewTWidth} height={height} />
        <g transform={`translate(${skewTWidth + pluginSel.GRAPH_GAP_PX}, 0)`}>
          <ConnectedWindgram width={windgramWidth} height={height} />
        </g>
      </g>
    ),
    wheelHandler: pluginSel.wheelHandler(state),
  };
};

const stateToAppDispatch = (dispatch) => ({
  onFavSelected:
    (centerMap) =>
    ({ lat, lon }) => {
      dispatch(setLocation(lat, lon));
      centerMap(lat, lon);
    },
  onZoomClick: () => {
    dispatch(toggleZoom());
  },
});

export const App = connect(
  stateToAppProps,
  stateToAppDispatch
)(({
  title,
  chart,
  centerMap,
  onFavSelected,
  wheelHandler,
  width,
  height,
  zoom,
  onZoomClick,
  graphHeight,
  skewTWidth,
  windgramWidth,
}) => {
  return (
    <div>
      {title()}
      <div style="position:relative">
        <svg {...{ width, height }} onWheel={wheelHandler}>
          {chart({ height: graphHeight, skewTWidth, windgramWidth })}
        </svg>
        <div id="wsp-zoom" className="iconfont clickable-size" onClick={onZoomClick}>
          {zoom ? "\uE03D" : "\uE03B"}
        </div>
      </div>
      <ConnectedFavorites onSelected={onFavSelected(centerMap)} />
    </div>
  );
});
