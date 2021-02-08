import * as skewTSel from "../selectors/skewt";
import * as soundingSel from "../selectors/sounding";
import * as windSel from "../selectors/wind";

import { setLocation, toggleZoom } from "../actions/sounding";

import { Favorites } from "../components/favorites";
// eslint-disable-next-line no-unused-vars
import { LoadingIndicator } from "../components/loading";
import { SkewT } from "../components/skewt";
import { WindGram } from "../components/wind";
import { connect } from "react-redux";
// eslint-disable-next-line no-unused-vars
import { h } from "preact";
import { parcelTrajectory } from "../atmosphere";

const windyRootScope = W.require("rootScope");

function stateToSkewTProp(state) {
  if (soundingSel.isLoading(state)) {
    return { isLoading: true };
  }
  const parameters = skewTSel.params(state);
  const pSfc = skewTSel.pSfc(state);
  let parcel;

  if (soundingSel.isThermalHours(state)) {
    const thermalT = skewTSel.tSfc(state) + 3;
    const dpSfc = skewTSel.dewpointSfc(state);
    const { dry, moist, isohume, elevThermalTop, pThermalTop, pCloudTop } =
      parcelTrajectory(parameters, 40, thermalT, pSfc, dpSfc) || {};
    parcel = {
      trajectory: dry.concat(moist || []),
      isohume,
      elevThermalTop,
      pThermalTop,
      pCloudTop,
    };
  }

  return {
    isLoading: false,
    params: parameters,
    pMax: skewTSel.pMax(state),
    cloudCover: soundingSel.cloudCover(state),
    pSfc,
    parcel,
    formatAltitude: soundingSel.formatAltitude(state),
    formatTemp: soundingSel.formatTemp(state),
    tAxisToPx: skewTSel.tAxisToPx(state),
    pToPx: skewTSel.pToPx(state),
    pAxisToPx: skewTSel.pAxisToPx(state),
    line: skewTSel.line(state),
    tMetric: soundingSel.tMetric(state),
    tAxisStep: skewTSel.tAxisStep(state),
    ghMetric: soundingSel.altiMetric(state),
    ghAxisStep: skewTSel.ghAxisStep(state),
    zoom: soundingSel.zoom(state),
    skew: skewTSel.skew(state),
  };
}

const ConnectedSkewT = connect(stateToSkewTProp)(SkewT);

const stateToWindProp = (state) => {
  return soundingSel.isLoading(state)
    ? {
        isLoading: true,
      }
    : {
        isLoading: false,
        params: skewTSel.params(state),
        windSpeedMax: windSel.windSpeedMax(state),
        format: soundingSel.formatSpeed(state),
        metric: soundingSel.speedMetric(state),
        pSfc: skewTSel.pSfc(state),
        pToPx: skewTSel.pToPx(state),
        speedToPx: windSel.speedToPx(state),
        line: windSel.line(state),
        zoom: soundingSel.zoom(state),
      };
};

const ConnectedWindgram = connect(stateToWindProp)(WindGram);

const stateToFavProp = (state) => ({
  favorites: soundingSel.favorites(state),
  location: soundingSel.locationKey(state),
  isMobile: windyRootScope.isMobile || windyRootScope.isTablet,
});

export const ConnectedFavorites = connect(stateToFavProp)(Favorites);

const stateToTitleProps = (state) => {
  return soundingSel.isLoading(state)
    ? { isLoading: true }
    : {
        isLoading: false,
        modelName: soundingSel.modelName(state),
        updated: soundingSel.modelUpdated(state),
        nextUpdate: soundingSel.modelNextUpdate(state),
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

const SoundingTitle = connect(stateToTitleProps)(
  ({ isLoading, modelName, updated, nextUpdate }) => {
    if (isLoading) {
      return;
    }
    const updateStr = formatTimestamp(updated);
    const nextStr = formatTimestamp(nextUpdate);

    return (
      <p class="model">
        Model <strong>{modelName.toUpperCase()}</strong> ({updateStr}). Next update on {nextStr}.
      </p>
    );
  }
);

const stateToAppProps = (state) => {
  const width = soundingSel.width(state);
  const height = soundingSel.height(state);

  const props = {
    centerMap: soundingSel.centerMap(state),
    wheelHandler: () => null,
    title: () => <p class="model">Loading...</p>,
    chart: () => <LoadingIndicator cx={width / 2} cy={height / 2} />,
    width,
    height,
    graphHeight: soundingSel.graphHeight(state),
    skewTWidth: skewTSel.width(state),
    windgramWidth: windSel.width(state),
    zoom: soundingSel.zoom(state),
  };

  const isLoading = soundingSel.isLoading(state);

  if (isLoading) {
    return props;
  }

  const params = skewTSel.params(state);

  if (!params) {
    return {
      ...props,
      title: () => <p class="model">Forecast not available</p>,
      chart: () => (
        <text x="50%" y="50%" text-anchor="middle">
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
        <g transform={`translate(${skewTWidth + soundingSel.GRAPH_GAP_PX}, 0)`}>
          <ConnectedWindgram width={windgramWidth} height={height} />
        </g>
      </g>
    ),
    wheelHandler: soundingSel.wheelHandler(state),
  };
};

const stateToAppDispatch = (dispatch) => ({
  onFavSelected: (centerMap) => ({ lat, lon }) => {
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
)(
  ({
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
        <img
          class="wsp-abs"
          src="https://logs-01.loggly.com/inputs/8298f665-7a6e-44e6-926f-4795243b5e4b.gif?source=pixel"
          width="1"
          height="1"
        />
        <div style="position:relative">
          <svg {...{ width, height }} onWheel={wheelHandler}>
            {chart({ height: graphHeight, skewTWidth, windgramWidth })}
          </svg>
          <div id="wsp-zoom" class="iconfont clickable-size" onClick={onZoomClick}>
            {zoom ? "\uE03D" : "\uE03B"}
          </div>
        </div>
        <ConnectedFavorites onSelected={onFavSelected(centerMap)} />
      </div>
    );
  }
);
