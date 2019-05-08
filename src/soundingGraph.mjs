import overlays from "@windy/overlays";
import broadcast from "@windy/broadcast";
import favs from "@windy/favs";
import store from "@windy/store";
import $ from "@windy/$";
import utils from "@windy/utils";
import atm from "./atmosphere.mjs";
import math from "./math.mjs";

const containerEl = $("#sounding-chart");
const chartWindWidth = 100;
const chartWidth = containerEl.clientWidth - 100 - 20 - 15;
const chartHeight = /*containerEl.clientHeight*/ 600 - 20;

/** @jsx h */
const { h, render } = preact;

// Scale for chart
let xScale, yScale, xWindScale, canvasScale;
let xAxisScale, yAxisScale;

let skew;

let tempLine, windLine;

let Sounding;
let root;

// Keep levels >= upper level
const upperLevel = 400;

const pointData = {
  lat: 0,
  lon: 0,
  elevation: 0,
  params: {},
};

let currentParams = [];

const convertTemp = overlays.temp.convertNumber;
const convertWind = overlays.wind.convertNumber;

// Custom conversion of altitude
// Can not use convertNumber, because it rounds altitude to 100m
const convertAlt = value =>
  Math.round(store.get("metric_altitude") === "ft" ? value * 3.28084 : value);

const init = (lat, lon) => {
  pointData.lat = lat;
  pointData.lon = lon;
  pointData.params = null;

  if (xScale) {
    redraw();
    return;
  }

  // Scale for chart
  xScale = math.scaleLinear().range([0, chartWidth]);
  xWindScale = math.scaleLinear().range([0, chartWindWidth / 2, chartWindWidth]);
  yScale = math.scaleLog().range([chartHeight, 0]);

  // Scale for axis is different, because it can display custom units
  xAxisScale = math.scaleLinear().range([0, chartWidth]);
  yAxisScale = math.scaleLinear().range([chartHeight, 0]);

  tempLine = math
    .line()
    .x(d => xScale(d[0]) + skew * (chartHeight - yScale(d[1])))
    .y(d => yScale(d[1]));

  windLine = math
    .line()
    .x(d => xWindScale(d[0]))
    .y(d => yScale(d[1]));

  const IsoTherm = ({ temp }) => {
    const x1 = xScale(temp + atm.celsiusToK);
    const y2 = chartHeight - (chartWidth - x1) / skew;
    return (
      <line
        class="isotherm"
        x1={x1.toFixed(1)}
        y1={chartHeight}
        x2={chartWidth}
        y2={y2.toFixed(1)}
      />
    );
  };

  const IsoHume = ({ temp }) => {
    const points = [];
    const mixingRatio = atm.mixingRatio(atm.saturationVaporPressure(temp + atm.celsiusToK), 1000);
    const stepPx = chartHeight / 4;
    for (let y = chartHeight; y > -stepPx; y -= stepPx) {
      const p = yScale.invert(y);
      const t = atm.dewpoint(atm.vaporPressure(p, mixingRatio));
      points.push([t, p]);
    }
    return <path class="isohume" d={tempLine(points)} />;
  };

  const DryAdiabat = ({ temp }) => {
    const points = [];
    const tK0 = temp + atm.celsiusToK;
    const p0 = 1000;

    const stepPx = chartHeight / 15;
    for (let y = chartHeight; y > -stepPx; y -= stepPx) {
      const p = yScale.invert(y);
      const t = atm.dryLapse(p, tK0, p0);
      points.push([t, p]);
    }

    return <path class="dry" d={tempLine(points)} />;
  };

  const MoistAdiabat = ({ temp }) => {
    const points = [];
    const tK0 = temp + atm.celsiusToK;
    const p0 = 1000;

    let t = tK0;
    let previousP = p0;
    const stepPx = chartHeight / 15;
    for (let y = chartHeight; y > -stepPx; y -= stepPx) {
      const p = yScale.invert(y);
      t = t + (p - previousP) * atm.moistGradientT(p, t);
      previousP = p;
      points.push([t, p]);
    }

    return <path class="moist" d={tempLine(points)} />;
  };

  const WindArrows = ({ params }) => {
    const ySfcPx = yAxisScale(pointData.elevation);
    const arrows = math.zip(params.wind_u, params.wind_v).reduce((arrows, uv, i) => {
      const yPx = yScale(params.pressure[i]);
      if (yPx < ySfcPx) {
        arrows.push(<WindArrow wind_u={uv[0]} wind_v={uv[1]} y={yPx} />);
      }
      return arrows;
    }, []);
    return <g children={arrows} />;
  };

  const WindArrow = ({ wind_u, wind_v, y }) => {
    const w = utils.wind2obj([wind_u, wind_v]);
    return (
      <g>
        {w.wind > 1 ? (
          <g transform={`translate(0,${y}) rotate(${w.dir})`} stroke="black" fill="none">
            <line y2="-30" />
            <path d="M-4,-8L0,0L4,-8" stroke-linejoin="round" />
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

  // elevation in meters
  const Surface = ({ elevation, width }) => {
    if (elevation == null) {
      return null;
    }

    const yPx = Math.round(yAxisScale(convertAlt(elevation)));
    if (yPx >= chartHeight) {
      return null;
    }
    return <rect class="surface" y={yPx} width={width} height={chartHeight - yPx + 1} />;
  };

  const Cloud = ({ y, height, width, cover }) => {
    return <rect {...{ y, height, width }} fill={`rgba(${cover}, ${cover}, ${cover}, 0.7)`} />;
  };

  // https://www.flaticon.com/authors/yannick
  const Cumulus = ({ x, y }) => {
    return (
      <path
        class="cumulus"
        transform={`translate(${x - 36}, ${y - 28})`}
        d="M26.003 24H5.997C3.794 24 2 22.209 2 20c0-1.893 1.318-3.482 3.086-3.896A7.162 7.162 0 0 1 5 15c0-3.866 3.134-7 7-7 3.162 0 5.834 2.097 6.702 4.975A4.477 4.477 0 0 1 21.5 12c2.316 0 4.225 1.75 4.473 4h.03C28.206 16 30 17.791 30 20c0 2.205-1.789 4-3.997 4z"
      />
    );
  };

  const Clouds = () => {
    const ts = store.get("timestamp");
    const canvas = pointData.mgCanvas;
    const w = canvas.width;
    const height = canvas.height;

    const times = pointData.hours;
    const next = times.findIndex(t => t >= ts);
    if (next == -1) {
      return null;
    }
    const prev = Math.max(0, next - 1);
    const stepX = w / times.length;
    const nextX = stepX / 2 + next * stepX;
    const prevX = stepX / 2 + prev * stepX;
    const x = Math.round(math.linearInterpolate(times[prev], prevX, times[next], nextX, ts));
    const data = canvas.getContext("2d").getImageData(x, 0, 1, height).data;
    const maxY = Math.min(chartHeight, Math.round(yAxisScale(convertAlt(pointData.elevation))));

    const cloudCoverAtChartY = y => {
      const p = yScale.invert(y);
      const canvasY = Math.round(canvasScale(p));
      return data[4 * canvasY];
    };

    const rects = [];

    // Compress upper clouds to top pixels
    let y = 30;
    const upperBottomCanvas = Math.round(canvasScale(yScale.invert(y)));
    let maxCover = 255;
    let hasUpperCover = false;
    for (let cy = 0; cy < upperBottomCanvas; cy++) {
      const cover = data[4 * cy];
      if (cover > 0) {
        hasUpperCover = true;
        maxCover = Math.min(cover, maxCover);
      }
    }
    if (hasUpperCover) {
      rects.push(<Cloud y="0" width={chartWidth} height="30" cover={maxCover} />);
      rects.push(
        <text class="tick" y={30 - 5} x={chartWidth - 5} text-anchor="end">
          upper clouds
        </text>
      );
      rects.push(<line y1="30" y2="30" x2={chartWidth} class="boundary" />);
    }

    // Then respect the y scale
    while (y < maxY) {
      const startY = y;
      const cover = cloudCoverAtChartY(y);
      let height = 1;
      while (y++ < maxY && cloudCoverAtChartY(y) == cover) {
        height++;
      }
      if (cover == 0) {
        continue;
      }
      rects.push(<Cloud y={startY} width="100" height={height} cover={cover} />);
    }

    return <g children={rects} />;
  };

  const flyTo = location => {
    init(location.lat, location.lon);
    broadcast.emit("rqstOpen", "windy-plugin-sounding", location);
  };

  const Favorites = ({ favs }) => {
    const places = Object.values(favs);
    const currentLoc = utils.latLon2str(pointData);
    return (
      <div id="fly-to" class="size-s">
        {places.length == 0 ? (
          <span data-icon="m">Add favorites to enable fly to.</span>
        ) : (
          places.map(f => {
            return (
              <span
                class={`location + ${utils.latLon2str(f) == currentLoc ? " selected" : ""}`}
                onClick={_ => flyTo(f)}
              >
                {f.title || f.name}
              </span>
            );
          })
        )}
      </div>
    );
  };

  const Parcel = ({ params }) => {
    // Thermal 2h after sunrise to 2h before sunset
    const thermalStart = pointData.celestial.sunriseTs + 2 * 3600000;
    const thermalStop = pointData.celestial.sunsetTs - 2 * 3600000;
    const thermalDuration = thermalStop - thermalStart;
    const currentTs = store.get("timestamp");
    if (currentTs < thermalStart || (currentTs - thermalStart) % (24 * 3600000) > thermalDuration) {
      return null;
    }

    const sfcPx = yAxisScale(convertAlt(pointData.elevation));
    const sfcPressure = yScale.invert(sfcPx);
    const sfcThermalTemp = 3 + math.sampleAt(params.pressure, params.temp, [sfcPressure])[0];
    const sfcDewpoint = math.sampleAt(params.pressure, params.dewpoint, [sfcPressure])[0];

    const pdTemps = [];
    const pdDewpoints = [];
    const pdPressures = [];
    const stepPx = chartHeight / 20;
    const mixingRatio = atm.mixingRatio(atm.saturationVaporPressure(sfcDewpoint), sfcPressure);

    for (let y = sfcPx; y > -stepPx; y -= stepPx) {
      const p = yScale.invert(y);
      pdPressures.push(p);
      pdTemps.push(atm.dryLapse(p, sfcThermalTemp, sfcPressure));
      pdDewpoints.push(atm.dewpoint(atm.vaporPressure(p, mixingRatio)));
    }

    const moistIntersection = math.firstIntersection(
      pdPressures,
      pdTemps,
      pdPressures,
      pdDewpoints
    );
    const dryIntersection = math.firstIntersection(
      pdPressures,
      pdTemps,
      params.pressure,
      params.temp
    );

    const children = [];

    let thermalTop = dryIntersection;

    if (moistIntersection && moistIntersection[0] > dryIntersection[0]) {
      // Cumulus clouds
      thermalTop = moistIntersection;
      const pmPressures = [];
      const pmTemps = [];
      let t = moistIntersection[1];
      let previousP = moistIntersection[0];
      for (let y = yScale(previousP); y > -stepPx; y -= stepPx) {
        const p = yScale.invert(y);
        t = t + (p - previousP) * atm.moistGradientT(p, t);
        previousP = p;
        pmPressures.push(p);
        pmTemps.push(t);
      }

      const isohumePoints = math.zip(pdDewpoints, pdPressures).filter(pt => pt[1] > thermalTop[0]);
      isohumePoints.push([moistIntersection[1], moistIntersection[0]]);
      children.push(<path class="parcel isohume" d={tempLine(isohumePoints)} />);

      let cloudPoints = math.zip(pmTemps, pmPressures);
      const equilibrium = math.firstIntersection(
        pmPressures,
        pmTemps,
        params.pressure,
        params.temp
      );

      let cloudTopPx = 0;
      if (equilibrium) {
        const cloudTop = equilibrium[0];
        cloudTopPx = yScale(cloudTop);
        children.push(<line class="boundary" y1={cloudTopPx} y2={cloudTopPx} x2={chartWidth} />);
        cloudPoints = cloudPoints.filter(pt => pt[1] >= cloudTop);
        cloudPoints.push([equilibrium[1], equilibrium[0]]);
      }

      children.push(
        <rect
          y={cloudTopPx}
          height={yScale(thermalTop[0]) - cloudTopPx}
          width={chartWidth}
          fill="url(#diag-hatch)"
        />
      );
      children.push(<Cumulus x={chartWidth} y={yScale(thermalTop[0])} />);
      children.push(<path class="parcel moist" d={tempLine(cloudPoints)} />);
    }

    const thermalTopPx = yScale(thermalTop[0]);
    const thermalTopUsr = Math.round(yAxisScale.invert(thermalTopPx) / 100) * 100;
    const dryPoints = math.zip(pdTemps, pdPressures).filter(pt => pt[1] >= thermalTop[0]);
    dryPoints.push([thermalTop[1], thermalTop[0]]);
    children.push(<line class="boundary" y1={thermalTopPx} y2={thermalTopPx} x2={chartWidth} />);
    children.push(
      <text
        class="tick"
        style="fill: black"
        text-anchor="end"
        dominant-baseline="hanging"
        y={thermalTopPx + 4}
        x={chartWidth - 7}
      >
        {thermalTopUsr}
      </text>
    );
    children.push(<path class="parcel dry" d={tempLine(dryPoints)} />);

    return <g children={children} />;
  };

  let lastWheelMove = Date.now();
  const wheelHandler = e => {
    let ts = store.get("timestamp");
    let debounceMs = 100;
    const direction = Math.sign(event.deltaY);
    if (e.shiftKey || e.ctrlKey) {
      debounceMs = 800;
      const d = new Date(ts);
      const h = d.getUTCHours();
      d.setUTCMinutes(0);
      ts = d.getTime();
      const refTime = (13 - pointData.celestial.TZoffset + 24) % 24;
      const dh = (refTime - h) * direction;
      if (dh <= 0) {
        ts += direction * (24 + dh) * 3600 * 1000;
      } else {
        ts += direction * dh * 3600 * 1000;
      }
    } else {
      ts += direction * 3600 * 1000;
    }

    if (Date.now() - lastWheelMove > debounceMs) {
      store.set("timestamp", ts);
      lastWheelMove = Date.now();
    }
    e.stopPropagation();
    e.preventDefault();
  };

  const AltitudeAxis = () => {
    const children = [];

    const altiMetric = store.get("metric_altitude");
    const altiStep = altiMetric == "m" ? 1000 : 3000;

    for (let alti = altiStep, isLast; !isLast; alti += altiStep) {
      const yPx = yAxisScale(alti);
      isLast = yAxisScale(alti + altiStep) < 20;
      children.push(<line y1={yPx} x2={chartWidth} y2={yPx} stroke="black" stroke-width="0.1" />);
      children.push(
        <text class="tick" y={yPx - 5} x={5}>
          {alti + " " + (isLast ? " " + altiMetric : "")}
        </text>
      );
    }

    return <g children={children} />;
  };

  const TemperatureAxis = () => {
    const children = [];

    const tempMetric = store.get("metric_temp");
    const tempStep = tempMetric == "°C" ? 10 : 20;
    const tempStart = Math.trunc(xAxisScale.invert(0) / tempStep) * tempStep;

    for (let temp = tempStart, isLast; !isLast; temp += tempStep) {
      const xPx = xAxisScale(temp);
      isLast = xAxisScale(temp + tempStep) > chartWidth;
      children.push(
        <text
          class="tick"
          text-anchor="middle"
          dominant-baseline="hanging"
          y={chartHeight + 5}
          x={xPx}
        >
          {temp + (isLast ? " " + tempMetric : "")}
        </text>
      );
    }

    return <g children={children} />;
  };

  Sounding = ({ params, elevation } = {}) => {
    let windSpeeds;
    if (params) {
      windSpeeds = math.zip(params.wind_u, params.wind_v).map(w => utils.wind2obj(w).wind);
      const maxWindSpeed = Math.max(...windSpeeds);
      xWindScale.domain([0, 30 / 3.6, Math.max(60 / 3.6, maxWindSpeed)]);
      yAxisScale.domain([convertAlt(params.gh[0]), convertAlt(params.gh[params.gh.length - 1])]);
    }

    return (
      <div>
        <svg id="sounding" onWheel={wheelHandler}>
          <defs>
            <clipPath id="clip-chart">
              <rect width={chartWidth} height={chartHeight + 20} />
            </clipPath>
            <pattern
              id="diag-hatch"
              patternUnits="userSpaceOnUse"
              width="8"
              height="8"
              patternTransform="rotate(45 2 2)"
            >
              <rect width="8" height="8" fill="#f8f8f8" opacity="0.7" />
              <path d="M 0,-1 L 0,11" stroke="gray" stroke-width="1" />
            </pattern>
          </defs>
          {params ? (
            <g>
              <g class="wind">
                <g class="chart" transform={`translate(${chartWidth + 30},0)`}>
                  <rect
                    fill="none"
                    y="1"
                    height={chartHeight - 1}
                    width={chartWindWidth}
                    stroke="gray"
                    stroke-width="1"
                  />
                  <text
                    class="tick"
                    transform={`translate(${xWindScale(15 / 3.6) - 5} 80) rotate(-90)`}
                  >
                    {convertWind(15 / 3.6)}
                  </text>
                  <text
                    class="tick"
                    transform={`translate(${xWindScale(30 / 3.6) - 5} 80) rotate(-90)`}
                  >
                    {convertWind(30 / 3.6)}
                  </text>
                  <text class="tick" transform={`translate(${chartWindWidth - 5} 80) rotate(-90)`}>
                    {convertWind(xWindScale.invert(chartWindWidth)) +
                      " " +
                      store.get("metric_wind")}
                  </text>
                  <line
                    y1={chartHeight}
                    x1={xWindScale(15 / 3.6)}
                    x2={xWindScale(15 / 3.6)}
                    stroke="black"
                    stroke-width="0.1"
                  />
                  <rect
                    x={chartWindWidth / 2}
                    width={chartWindWidth / 2}
                    height={chartHeight}
                    fill="red"
                    opacity="0.1"
                  />
                  <g class="chartArea">
                    <path
                      class="infoline wind"
                      d={windLine(math.zip(windSpeeds, params.pressure))}
                    />
                    <g transform={`translate(${chartWindWidth / 2},0)`}>
                      <WindArrows params={params} />
                    </g>
                  </g>
                  <Surface elevation={elevation} width={chartWindWidth} />
                </g>
              </g>
              <g class="chart" transform="translate(10,0)">
                <rect
                  fill="none"
                  y="1"
                  height={chartHeight - 1}
                  width={chartWidth}
                  stroke="gray"
                  stroke-width="1"
                />
                <g class="chartArea" clip-path="url(#clip-chart)">
                  <rect class="overlay" width={chartWidth} height={chartHeight} opacity="0" />
                  {[-70, -60, -50, -40, -30, -20, -10, 0, 10, 20].map(t => (
                    <IsoTherm temp={t} />
                  ))}
                  {[-20, -10, 0, 5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80].map(t => (
                    <DryAdiabat temp={t} />
                  ))}
                  {[-20, -10, 0, 5, 10, 15, 20, 25, 30, 35].map(t => (
                    <MoistAdiabat temp={t} />
                  ))}
                  {[-20, -15, -10, -5, 0, 5, 10, 15, 20].map(t => (
                    <IsoHume temp={t} />
                  ))}
                  <Parcel params={params} />
                  <Clouds />
                  <path
                    class="infoline temperature"
                    d={tempLine(math.zip(params.temp, params.pressure))}
                  />
                  <path
                    class="infoline dewpoint"
                    d={tempLine(math.zip(params.dewpoint, params.pressure))}
                  />
                  <Surface elevation={elevation} width={chartWidth} />
                </g>
                <TemperatureAxis />
                <AltitudeAxis />
              </g>
            </g>
          ) : (
            <text x="50%" y="50%" text-anchor="middle">
              No Data
            </text>
          )}
        </svg>
        <Favorites favs={favs.getAll()} />
      </div>
    );
  };

  root = render(<Sounding display="block" elevation="0" />, containerEl, root);

  store.on("timestamp", redraw);
};

// Compute the min and max temp and pressure over the forecast range
function updateScales(hrAlt) {
  let maxTemp = Number.MIN_VALUE;
  let minPressure = Number.MAX_VALUE;
  let maxPressure = Number.MIN_VALUE;

  for (let ts in pointData.params) {
    const params = pointData.params[ts];
    const lastIndex = params.pressure.length - 1;
    // Look for min/max pressure at either ends only
    maxPressure = Math.max(maxPressure, params.pressure[0]);
    minPressure = Math.min(minPressure, params.pressure[lastIndex]);
    maxTemp = Math.max(maxTemp, ...params.temp);
  }

  maxTemp += 8;
  const minTemp = maxTemp - 60;

  skew =
    ((76.53 * (3 - Math.log10(upperLevel))) / (maxTemp - minTemp)) * (chartWidth / chartHeight);

  xScale.domain([minTemp, maxTemp]);
  xAxisScale.domain([convertTemp(minTemp), convertTemp(maxTemp)]);

  yScale.domain([maxPressure, minPressure]);

  const levels = [1000, 950, 925, 900, 850, 800, 700, 600, 500, 400, 300, 200, 150, 100];
  const levelsH = hrAlt.map(p => (pointData.mgCanvas.height - 1) * (1 - p / 100));
  canvasScale = math
    .scaleLinear()
    .range(levelsH)
    .domain(levels);
}

// Return the value of the parameter `name` at `level` for the given `tsIndex`
function getParamAtLevel(airData, param, level, tsIndex) {
  const valueByTs = airData.data[`${param}-${level}h`];
  const value = Array.isArray(valueByTs) ? valueByTs[tsIndex] : null;
  if (param === "gh" && value == null) {
    // Approximate gh when not provided by the model
    return Math.round(atm.getElevation(level));
  }
  return value;
}

function getParam(airData, param, levels, tsIndex) {
  return levels.map(level => getParamAtLevel(airData, param, level, tsIndex));
}

// Handler for data request
const load = (airData, forecast, meteogram) => {
  // Re-arrange the airData
  // from
  // {
  //    temp-150h: [...]
  //    temp-surface: [...]
  //    hours: [timestamp0, ...]
  //    ...
  // }
  // to
  // {
  //    [timestamp0]: {
  //      temp: [...],
  //      wind_u: [...],
  //      wind_v: [...],
  //      pressure: [...],
  //    }, ...
  // }
  const timestamps = airData.data.hours;
  // Some models do not provide modelElevation (ie GFS)
  const paramLevels = new Set();

  // Extracts parameter names and levels.
  for (let name in airData.data) {
    const m = name.match(/([^-]+)-(.+)h$/);
    if (m !== null) {
      paramLevels.add(Number(m[2]));
    }
  }

  // Filters the list of levels
  const levels = Array.from(paramLevels)
    .filter(l => l >= upperLevel)
    .sort((a, b) => (Number(a) < Number(b) ? 1 : -1));

  const paramsByTs = {};
  const sfcTempByTs = [];
  timestamps.forEach((ts, tsIndex) => {
    sfcTempByTs.push(getParamAtLevel(airData, "temp", "surface", tsIndex));
    paramsByTs[ts] = {
      temp: getParam(airData, "temp", levels, tsIndex),
      dewpoint: getParam(airData, "dewpoint", levels, tsIndex),
      gh: getParam(airData, "gh", levels, tsIndex),
      wind_u: getParam(airData, "wind_u", levels, tsIndex),
      wind_v: getParam(airData, "wind_v", levels, tsIndex),
      pressure: levels,
    };
  });

  // Draw the clouds
  const canvas = document.createElement("canvas");
  const numData = airData.data.hours.length;
  // 300px whatever the pixel density
  const height = 300 / meteogram.canvasRatio;
  meteogram
    .init(canvas, numData, 6, height)
    .setHeight(height)
    .setOffset(0)
    .render(airData)
    .resetCanvas();

  pointData.params = paramsByTs;
  pointData.mgCanvas = canvas;
  pointData.hours = airData.data.hours;
  pointData.sfcTempByTs = sfcTempByTs;
  let elevation = forecast.header.elevation == null ? 0 : forecast.header.elevation;
  if (airData.header.elevation != null) {
    elevation = airData.header.elevation;
  }
  if (airData.header.modelElevation != null) {
    elevation = airData.header.modelElevation;
  }
  pointData.elevation = elevation;
  pointData.celestial = forecast.celestial;

  // Update the scales
  updateScales(meteogram.hrAlt);

  redraw();
};

// Update the sounding
const redraw = () => {
  currentParams = null;
  pointData.sfcTemp = null;
  if (pointData.params) {
    const ts = store.get("timestamp");

    let ts1, ts2;
    const hours = pointData.hours;
    const idx = hours.findIndex(x => x >= ts);

    if (idx > -1) {
      if (idx == 0) {
        ts1 = ts2 = hours[0];
      } else {
        ts1 = hours[idx - 1];
        ts2 = hours[idx];
      }

      // Interpolate between two nearest hours
      const paramsTs1 = pointData.params[ts1];
      const paramsTs2 = pointData.params[ts2];
      currentParams = {};

      Object.getOwnPropertyNames(paramsTs1).forEach(param => {
        currentParams[param] = math.linearInterpolate(
          ts1,
          paramsTs1[param],
          ts2,
          paramsTs2[param],
          ts
        );
      });

      // Surface temperature
      const temp1 = pointData.sfcTempByTs[idx - 1];
      if (temp1 != null) {
        const temp2 = pointData.sfcTempByTs[idx];
        pointData.sfcTemp = math.linearInterpolate(ts1, temp1, ts2, temp2, ts);
      }
    }
  }

  root = render(
    <Sounding params={currentParams} elevation={pointData.elevation} display="block" />,
    containerEl,
    root
  );
};

export default { load, init };
