import overlays from "@windy/overlays";
import store from "@windy/store";
import $ from "@windy/$";
import _ from "@windy/utils";
import sUtils from "./soundingUtils.mjs";

const containerEl = $("#sounding-chart");
const chartWidth = containerEl.clientWidth - 80;
const chartHeight = containerEl.clientHeight - 40;

/** @jsx h */
const { h, render } = preact;

// Scale for chart
let xScale, yScale;
let xAxisScale, yAxisScale;
let xAxis, yAxis;

let tempLine;
let dewPointLine;

let Sounding;
let root;

const pointData = {
  lat: 0,
  lon: 0,
  elevation: 0,
  modelElevation: 0,
  data: {},
};

let currentData = [];

const convertTemp = overlays.temp.convertNumber;
const convertWind = overlays.wind.convertNumber;
const convertPressure = overlays.pressure.convertNumber;

// Custom conversion of altitude
// Can not use convertNumber, because it rounds altitude to 100m
const convertAlt = value =>
  Math.round(overlays.cloudtop.metric === "ft" ? value * 3.28084 : value);

const init = () => {
  if (xScale) {
    return;
  }

  // Scale for chart
  xScale = d3.scaleLinear().range([0, chartWidth]);
  yScale = d3.scaleLinear().range([chartHeight, 0]);

  // Scale for axis is different, because it can display custom units
  xAxisScale = d3.scaleLinear().range([0, chartWidth]);
  yAxisScale = d3.scaleLinear().range([chartHeight, 0]);

  xAxis = d3.axisBottom(xAxisScale).ticks(5, "-d");
  yAxis = d3.axisRight(yAxisScale).ticks(10, "d");

  tempLine = d3
    .line()
    .x(d => xScale(d.temp))
    .y(d => yScale(d.gh));

  dewPointLine = d3
    .line()
    .x(d => xScale(d.dewpoint))
    .y(d => yScale(d.gh));

  Sounding = ({ data } = {}) => {
    return (
      <svg id="sounding">
        {data ? (
          <g class="chartArea" transform="translate(10,15)">
            <g
              class="x axis"
              transform={`translate(0,${chartHeight})`}
              ref={g => d3.select(g).call(xAxis)}
            />
            <g
              class="y axis"
              y={chartHeight + 16}
              ref={g => d3.select(g).call(yAxis)}
            />
            <text class="y label" opacity="0.75" x="0" y="-4" />
            <rect
              class="overlay"
              width={chartWidth}
              height={chartHeight}
              opacity="0"
            />
            <path
              class="temperature chart"
              fill="none"
              stroke="red"
              stroke-linejoin="round"
              stroke-linecap="round"
              stroke-width="1.5"
              d={tempLine(data)}
            />
            <path
              class="dewpoint chart"
              fill="none"
              stroke="steelblue"
              stroke-linejoin="round"
              stroke-linecap="round"
              stroke-width="1.5"
              d={dewPointLine(data)}
            />
          </g>
        ) : (
          <text x="50%" y="50%" text-anchor="middle">
            No Data
          </text>
        )}
      </svg>
    );
  };

  root = render(<Sounding display="block" />, containerEl, root);
};

// Compute the min and max temp and pressure over the forecast range
function updateScales() {
  let minTemp = Number.MAX_VALUE;
  let maxTemp = Number.MIN_VALUE;
  let minPressure = Number.MAX_VALUE;
  let maxPressure = Number.MIN_VALUE;

  for (let hour in pointData.data) {
    pointData.data[hour].forEach(d => {
      // pt.dewpoint <= pt.temp
      minTemp = Math.min(minTemp, d.dewpoint);
      maxTemp = Math.max(maxTemp, d.temp);
      minPressure = Math.min(minPressure, d.gh);
      maxPressure = Math.max(maxPressure, d.gh);
    });
  }

  xScale.domain([minTemp, maxTemp]);
  xAxisScale.domain([convertTemp(minTemp), convertTemp(maxTemp)]);

  yScale.domain([minPressure, maxPressure]);
  yAxisScale.domain([convertAlt(minPressure), convertAlt(maxPressure)]);
}

// Return the value of the parameter `name` at `level` for the given `hourIdx`
function ExtractParamAtLevel(airData, name, level, hourIdx) {
  if (name === "gh" && level == "surface") {
    return airData.header.modelElevation;
  }

  return airData.data[`${name}-${level}`][hourIdx];
}

// Handler for data request
const load = (lat, lon, airData, forecastData) => {
  pointData.lat = lat;
  pointData.lon = lon;

  // Create a flat array of forecast data
  const forecasts = [];
  for (let d in forecastData.data) {
    forecasts.push(...forecastData.data[d]);
  }
  forecasts.sort((a, b) => (Number(a.ts) < Number(b.ts) ? -1 : 1));

  // Re-arrange the airData
  // from
  // {
  //    temp-150h: [...]
  //    temp-surface: [...]
  //    hours: [...]
  //    ...
  // }
  // to
  // {
  //    [timestamp0]: {
  //      temp: ,
  //      wind: ,
  //      wind_dir: ,
  //      level: ,
  //    }, ...
  // }
  const hours = airData.data.hours;
  const elevation = airData.header.elevation;
  const modelElevation = airData.header.modelElevation;
  const paramNames = new Set();
  const paramLevels = new Set();

  // Extracts parameter names and levels.
  for (let name in airData.data) {
    const m = name.match(/([^-]+)-(.+)h$/);
    if (m !== null) {
      paramNames.add(m[1]);
      paramLevels.add(Number(m[2]));
    }
  }

  // Filters the list of levels and add surface (-1).
  const levels = [
    -1,
    ...Array.from(paramLevels)
      .filter(l => l > 300)
      .sort((a, b) => (Number(a) < Number(b) ? 1 : -1)),
  ];

  const levelDataByTs = {};
  hours.forEach((h, hIdx) => {
    levelDataByTs[h] = [];
    levels.forEach(level => {
      let LevelName = level < 0 ? "surface" : `${level}h`;
      const gh = ExtractParamAtLevel(airData, "gh", LevelName, hIdx);
      if (gh >= modelElevation) {
        // Precompute the wind object
        const windU = ExtractParamAtLevel(airData, "wind_u", LevelName, hIdx);
        const windV = ExtractParamAtLevel(airData, "wind_v", LevelName, hIdx);
        const wind = _.wind2obj([windU, windV]);

        levelDataByTs[h].push({
          temp: ExtractParamAtLevel(airData, "temp", LevelName, hIdx),
          dewpoint: ExtractParamAtLevel(airData, "dewpoint", LevelName, hIdx),
          gh: ExtractParamAtLevel(airData, "gh", LevelName, hIdx),
          wind: wind.wind,
          wind_dir: wind.dir,
          level: level < 0 ? undefined : level,
        });
      }
    });
  });

  pointData.data = levelDataByTs;
  pointData.elevation = elevation;
  pointData.modelElevation = modelElevation;

  updateScales();

  store.on("timestamp", redraw);
  redraw();
};

// Update the sounding
const redraw = () => {
  currentData = null;
  if (pointData.data) {
    const ts = store.get("timestamp");

    // Find nearest hour
    const hours = Object.getOwnPropertyNames(pointData.data).sort((a, b) =>
      Number(a) < Number(b) ? -1 : 1
    );

    let ts1, ts2;
    const idx = hours.findIndex(x => x >= ts);

    if (idx > -1) {
      if (idx == 0) {
        ts1 = ts2 = hours[0];
      } else {
        ts1 = hours[idx - 1];
        ts2 = hours[idx];
      }

      // Interpolate between two nearest hours
      currentData = sUtils.interpolateArray(
        pointData.data[ts1],
        pointData.data[ts2],
        ts2 != ts1 ? (ts - ts1) / (ts2 - ts1) : 0
      );
    }
  }

  root = render(
    <Sounding data={currentData} display="block" />,
    containerEl,
    root
  );
};

export default { load, init };
