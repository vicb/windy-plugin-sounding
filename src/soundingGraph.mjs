import overlays from "@windy/overlays";
import store from "@windy/store";
import $ from "@windy/$";
import _ from "@windy/utils";
import sUtils from "./soundingUtils.mjs";

const containerEl = $("#sounding-chart");
const chartWindWidth = 100;
const chartWidth = containerEl.clientWidth - 100 - 20 - 15;
const chartHeight = containerEl.clientHeight - 20;

/** @jsx h */
const { h, render } = preact;

// Scale for chart
let xScale, yScale, xWindScale;
let xAxisScale, xWindAxisScale, yAxisScale;
let xAxis, xWindAxis, yAxis;

let skew = 0.4;

let tempLine, dewPointLine, windLine;

let Sounding;
let root;

const pointData = {
  lat: 0,
  lon: 0,
  elevation: 0,
  modelElevation: 0,
  tempRange: [0, 0],
  pressureRange: [0, 0],
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
  xWindScale = d3.scaleLinear().range([0, chartWindWidth]);
  yScale = d3.scaleLog().range([chartHeight, 0]);

  // Scale for axis is different, because it can display custom units
  xAxisScale = d3.scaleLinear().range([0, chartWidth]);
  yAxisScale = d3.scaleLinear().range([chartHeight, 0]);
  xWindAxisScale = d3.scaleLinear().range([0, chartWindWidth]);

  xAxis = d3.axisBottom(xAxisScale).ticks(5, "-d");
  yAxis = d3.axisRight(yAxisScale).ticks(10, "d");
  xWindAxis = d3.axisBottom(xWindAxisScale).ticks(4, "d");

  tempLine = d3
    .line()
    .x(d => xScale(d.temp) + skew * (chartHeight - yScale(d.pressure)))
    .y(d => yScale(d.pressure));

  dewPointLine = d3
    .line()
    .x(d => xScale(d.dewpoint) + skew * (chartHeight - yScale(d.pressure)))
    .y(d => yScale(d.pressure));

  windLine = d3
    .line()
    .x(d => xWindScale(_.wind2obj([d.wind_u, d.wind_v]).wind))
    .y(d => yScale(d.pressure));

  const IsoTemp = ({ temp }) => {
    if (skew == 0) {
      return null;
    }
    const x1 = xScale(temp + 273);
    const y2 = chartHeight - (chartWidth - x1) / skew;
    return (
      <line
        x1={x1}
        y1={chartHeight}
        x2={chartWidth}
        y2={y2}
        stroke="darkred"
        stroke-width="0.2"
      />
    );
  };

  const IsoHume = ({ q }) => {
    const points = [];
    const step = chartHeight / 6;
    for (let y = chartHeight; y > -step; y -= step) {
      const p = yScale.invert(y);
      const es = (p * q) / (q + 622.0);
      const logthing = Math.pow(Math.log(es / 6.11), -1.0);
      const t =
        273 + Math.pow((17.269 / 237.3) * (logthing - 1.0 / 17.269), -1.0);
      points.push({ t, p });
    }
    const ad = d3
      .line()
      .x(d => xScale(d.t) + skew * (chartHeight - yScale(d.p)))
      .y(d => yScale(d.p));
    return (
      <path
        fill="none"
        stroke="blue"
        stroke-width="0.3"
        stroke-dasharray="2"
        d={ad(points)}
      />
    );
  };

  const DryAdiabatic = ({ temp }) => {
    const points = [];
    let t0 = temp + 273;
    const p0 = yScale.domain()[0];
    const CP = 1.03e3;
    const RD = 287.0;
    const step = chartHeight / 15;
    for (let y = chartHeight; y > -step; y -= step) {
      const p = yScale.invert(y);
      const t = t0 * Math.pow(p0 / p, -RD / CP);
      points.push({ t, p });
    }
    const ad = d3
      .line()
      .x(d => xScale(d.t) + skew * (chartHeight - yScale(d.p)))
      .y(d => yScale(d.p));
    return (
      <path fill="none" stroke="green" stroke-width="0.3" d={ad(points)} />
    );
  };

  const MoistAdiabatic = ({ temp }) => {
    const points = [];
    let t0 = temp + 273;
    const p0 = yScale.domain()[0];
    const CP = 1.03e3;
    const L = 2.5e6;
    const RD = 287.0;
    const RV = 461.0;
    const KELVIN = 273;

    let t = t0;
    let previousP = p0;
    const step = chartHeight / 15;
    for (let y = chartHeight; y > -step; y -= step) {
      const pressure = yScale.invert(y);
      const lsbc = (L / RV) * (1.0 / KELVIN - 1.0 / t);
      const rw = 6.11 * Math.exp(lsbc) * (0.622 / pressure);
      const lrwbt = (L * rw) / (RD * t);
      const nume = ((RD * t) / (CP * pressure)) * (1.0 + lrwbt);
      const deno = 1.0 + lrwbt * ((0.622 * L) / (CP * t));
      const gradi = nume / deno;
      t = t - gradi * (previousP - pressure);
      previousP = pressure;
      points.push({ t, p: pressure });
    }
    const ad = d3
      .line()
      .x(d => xScale(d.t) + skew * (chartHeight - yScale(d.p)))
      .y(d => yScale(d.p));
    return (
      <path
        fill="none"
        stroke="green"
        stroke-width="0.3"
        stroke-dasharray="3 5"
        d={ad(points)}
      />
    );
  };

  const WindArrow = ({ wind_u, wind_v, y }) => {
    const w = _.wind2obj([wind_u, wind_v]);
    return (
      <g>
        {w.wind > 1 ? (
          <g
            transform={`translate(0,${y}) rotate(${w.dir})`}
            stroke="black"
            fill="none"
          >
            <line y2="-30" />
            <polyline points="-5,-10 0,0 5,-10" stroke-linejoin="round" />
          </g>
        ) : (
          <g transform={`translate(0,${y})`} stroke="black" fill="none">
            <circle r="6" />
            <circle r="1" />
          </g>
        )}
      </g>
    );
  };

  Sounding = ({ data } = {}) => {
    return (
      <svg id="sounding">
        <defs>
          <clipPath id="clip-chart">
            <rect x="0" y="0" width={chartWidth} height={chartHeight + 20} />
          </clipPath>
        </defs>
        {data ? (
          <g>
            <g class="wind">
              <g class="chart" transform={`translate(${chartWidth + 30},0)`}>
                <g
                  class="x axis"
                  transform={`translate(0,${chartHeight})`}
                  ref={g => d3.select(g).call(xWindAxis)}
                />
                <line
                  y1={chartHeight}
                  y2="0"
                  stroke="black"
                  stroke-width="0.2"
                  stroke-dasharray="3"
                />
                <line
                  y1={chartHeight}
                  x1={xWindScale(15 / 3.6)}
                  y2="0"
                  x2={xWindScale(15 / 3.6)}
                  stroke="black"
                  stroke-width="0.2"
                  stroke-dasharray="3"
                />
                <rect
                  x={chartWindWidth / 2}
                  width={chartWindWidth / 2}
                  height={chartHeight}
                  fill="red"
                  opacity="0.1"
                />
                <g class="chartArea" clip-path="url(#clip-chart)">
                  <path
                    class="temperature chart"
                    fill="none"
                    stroke="purple"
                    stroke-linejoin="round"
                    stroke-linecap="round"
                    stroke-width="1.5"
                    d={windLine(data)}
                  />
                  <g transform={`translate(${chartWindWidth / 2},0)`}>
                    {data.map(d => (
                      <WindArrow
                        wind_u={d.wind_u}
                        wind_v={d.wind_v}
                        y={yScale(d.pressure)}
                      />
                    ))}
                  </g>
                </g>
              </g>
            </g>
            <g class="chart" transform="translate(10,0)">
              <g class="axis">
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
              </g>
              <g
                class="chartArea"
                clip-path="url(#clip-chart)"
                stroke-linejoin="round"
                stroke-linecap="round"
              >
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
                  stroke-width="1.5"
                  d={tempLine(data)}
                />
                <path
                  class="dewpoint chart"
                  fill="none"
                  stroke="steelblue"
                  stroke-width="1.5"
                  d={dewPointLine(data)}
                />
                {[-70, -60, -50, -40, -30, -20, -10, 0, 10, 20].map(t => (
                  <IsoTemp temp={t} />
                ))}
                {[-20, -10, 0, 5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80].map(
                  t => (
                    <DryAdiabatic temp={t} />
                  )
                )}
                {[-20, -10, 0, 5, 10, 15, 20, 25, 30, 35].map(t => (
                  <MoistAdiabatic temp={t} />
                ))}
                {[0.01, 0.1, 0.5, 1.0, 2.0, 5.0, 8.0, 12.0, 16.0, 20.0].map(
                  q => (
                    <IsoHume q={q} />
                  )
                )}
              </g>
            </g>
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

  store.on("timestamp", redraw);
};

// Compute the min and max temp and pressure over the forecast range
function updateScales() {
  let minTemp = Number.MAX_VALUE;
  let maxTemp = Number.MIN_VALUE;
  let minGh = Number.MAX_VALUE;
  let maxGh = Number.MIN_VALUE;
  let minPressure = Number.MAX_VALUE;
  let maxPressure = Number.MIN_VALUE;
  let maxWind = Number.MIN_VALUE;

  for (let ts in pointData.data) {
    const tsData = pointData.data[ts];
    tsData.forEach((d, index) => {
      if (index == 0) {
        minGh = Math.min(minGh, d.gh);
        maxPressure = Math.max(maxPressure, d.pressure);
      }
      if (index == tsData.length - 1) {
        maxGh = Math.max(maxGh, d.gh);
        minPressure = Math.min(minPressure, d.pressure);
      }
      // pt.dewpoint <= pt.temp
      minTemp = Math.min(minTemp, d.dewpoint);
      maxTemp = Math.max(maxTemp, d.temp);
      const wind = _.wind2obj([d.wind_u, d.wind_v]).wind;
      maxWind = Math.max(maxWind, wind);
    });
  }

  // TODO
  minTemp = -30 + 273;
  maxTemp = 30 + 273;

  xScale.domain([minTemp, maxTemp]);
  xAxisScale.domain([convertTemp(minTemp), convertTemp(maxTemp)]);

  xWindScale.domain([0, 30 / 3.6, maxWind]);
  xWindScale.range([0, chartWindWidth / 2, chartWindWidth]);
  xWindAxisScale.domain([0, 30, convertWind(maxWind)]);
  xWindAxisScale.range([0, chartWindWidth / 2, chartWindWidth]);

  yScale.domain([maxPressure, minPressure]);
  yAxisScale.domain([convertAlt(minGh), convertAlt(maxGh)]);
}

// Return the value of the parameter `name` at `level` for the given `tsIndex`
function GetParam(airData, name, level, tsIndex) {
  if (name === "gh" && level == "surface") {
    // GFS has no modelElevation
    return airData.header.modelElevation || airData.header.elevation;
  }

  return airData.data[`${name}-${level}`][tsIndex];
}

// Handler for data request
const load = (lat, lon, airData, forecastData) => {
  pointData.lat = lat;
  pointData.lon = lon;

  // Create a lookup for forecast
  const forecastsByTs = {};
  for (let d in forecastData.data) {
    forecastData.data[d].forEach(f => (forecastsByTs[f.origTs] = f));
  }

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
  //      wind_u: ,
  //      wind_v: ,
  //      level: ,
  //    }, ...
  // }
  const timestamps = airData.data.hours;
  const elevation = airData.header.elevation;
  // GFS has no model elevation
  const modelElevation = airData.header.modelElevation || elevation;
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
  timestamps.forEach((ts, index) => {
    levelDataByTs[ts] = [];
    levels.forEach(level => {
      let LevelName = level < 0 ? "surface" : `${level}h`;
      const gh = GetParam(airData, "gh", LevelName, index);
      if (gh >= modelElevation) {
        // Forecasts have the pressure in Pa - we want hPa.
        const pressure =
          level < 0 ? Math.round(forecastsByTs[ts].pressure / 100) : level;

        levelDataByTs[ts].push({
          temp: GetParam(airData, "temp", LevelName, index),
          dewpoint: GetParam(airData, "dewpoint", LevelName, index),
          gh: GetParam(airData, "gh", LevelName, index),
          wind_u: GetParam(airData, "wind_u", LevelName, index),
          wind_v: GetParam(airData, "wind_v", LevelName, index),
          pressure,
          forecast: forecastsByTs[ts],
        });
      }
    });
  });

  pointData.data = levelDataByTs;
  pointData.elevation = elevation;
  pointData.modelElevation = modelElevation;

  updateScales(pointData);

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
