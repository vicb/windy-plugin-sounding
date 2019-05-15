import { SkewT } from "../components/skewt";
import { WindGram } from "../components/wind";
import { Favorites } from "../components/favorites";
import { LoadingIndicator } from "../components/loading";
import { connect } from "preact-redux";
import * as skewTSel from "../selectors/skewt";
import * as soundingSel from "../selectors/sounding";
import * as windSel from "../selectors/wind";
import { parcelTrajectory } from "../atmosphere";
import { setLocation, setZoom } from "../actions/sounding";
import { h } from "preact";

const windyCalendar = W.require("Calendar");

function stateToSkewTProp(state) {
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
    params: parameters,
    pMax: skewTSel.pMax(state),
    cloudCover: soundingSel.cloudCover(state),
    pSfc,
    parcel,
    formatAltitude: soundingSel.formatAltitude(state),
    tAxisToPx: skewTSel.tAxisToPx(state),
    pToPx: skewTSel.pToPx(state),
    pAxisToPx: skewTSel.pAxisToPx(state),
    line: skewTSel.line(state),
    tMetric: soundingSel.tMetric(state),
    tAxisStep: skewTSel.tAxisStep(state),
    ghMetric: soundingSel.altiMetric(state),
    ghAxisStep: skewTSel.ghAxisStep(state),
    zoom: soundingSel.zoom(state),
  };
}

const ConnectedSkewT = connect(stateToSkewTProp)(SkewT);

const stateToWindProp = state => ({
  params: skewTSel.params(state),
  windSpeedMax: windSel.windSpeedMax(state),
  format: soundingSel.formatSpeed(state),
  metric: soundingSel.speedMetric(state),
  pSfc: skewTSel.pSfc(state),
  pToPx: skewTSel.pToPx(state),
  speedToPx: windSel.speedToPx(state),
  line: windSel.line(state),
});

const ConnectedWindgram = connect(stateToWindProp)(WindGram);

const stateToFavProp = state => ({
  favorites: soundingSel.favorites(state),
  location: soundingSel.locationKey(state),
});

export const ConnectedFavorites = connect(stateToFavProp)(Favorites);

const stateToTitleProps = state => ({
  modelName: soundingSel.modelName(state),
  updated: soundingSel.modelUpdated(state),
  nextUpdate: soundingSel.modelNextUpdate(state),
});

function formatTimestamp(ts) {
  return new Date(ts).toLocaleString([], {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const SoundingTitle = connect(stateToTitleProps)(({ modelName, updated, nextUpdate }) => {
  const updateStr = formatTimestamp(updated);
  const nextStr = formatTimestamp(nextUpdate);

  return (
    <p class="model">
      Model <strong>{modelName.toUpperCase()}</strong> ({updateStr}). Next update on {nextStr}.
    </p>
  );
});

const stateToAppProps = state => {
  const width = soundingSel.width(state);
  const height = soundingSel.height(state);

  const props = {
    centerMap: soundingSel.centerMap(state),
    wheelHandler: () => null,
    title: () => <p class="model">Loading...</p>,
    chart: () => <LoadingIndicator cx={width / 2} cy={height / 2} />,
    width,
    height,
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
    chart: () => (
      <g>
        <ConnectedSkewT width={460} height={580} />
        <g transform="translate(480, 0)">
          <ConnectedWindgram width={100} height={580} />
        </g>
      </g>
    ),
    wheelHandler: soundingSel.wheelHandler(state),
  };
};

const stateToAppDispatch = dispatch => ({
  onFavSelected: centerMap => ({ lat, lon }) => {
    dispatch(setLocation(lat, lon));
    centerMap(lat, lon);
  },
  onZoomClick: e => {
    dispatch(setZoom(e.target.checked));
  },
});

export const App = connect(
  stateToAppProps,
  stateToAppDispatch
)(({ title, chart, centerMap, onFavSelected, wheelHandler, width, height, zoom, onZoomClick }) => {
  return (
    <div>
      {title()}
      <svg {...{ width, height }} onWheel={wheelHandler}>
        {chart()}
      </svg>
      <ConnectedFavorites onSelected={onFavSelected(centerMap)} />
      <label>
        <input type="checkbox" checked={zoom} onClick={onZoomClick} />
        Zoom view
      </label>
    </div>
  );
});
