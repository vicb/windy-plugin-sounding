import overlays from "@windy/overlays";
import broadcast from "@windy/broadcast";
import favs from "@windy/favs";
import store from "@windy/store";
import $ from "@windy/$";
import utils from "@windy/utils";
import sUtils from "./soundingUtils.mjs";
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

let skew = 0.4;

let tempLine, dewPointLine, windLine;

let Sounding;
let root;

const upperLevel = 300;

const pointData = {
  lat: 0,
  lon: 0,
  elevation: 0,
  data: {},
};

let currentData = [];

const convertTemp = overlays.temp.convertNumber;
const convertWind = overlays.wind.convertNumber;

// Custom conversion of altitude
// Can not use convertNumber, because it rounds altitude to 100m
const convertAlt = value =>
  Math.round(store.get("metric_altitude") === "ft" ? value * 3.28084 : value);

const init = (lat, lon) => {
  pointData.lat = lat;
  pointData.lon = lon;
  pointData.data = null;

  if (xScale) {
    redraw();
    return;
  }

  // Scale for chart
  xScale = math.scaleLinear().range([0, chartWidth]);
  xWindScale = math.scaleLinear().range([0, chartWindWidth]);
  yScale = math.scaleLog().range([chartHeight, 0]);

  // Scale for axis is different, because it can display custom units
  xAxisScale = math.scaleLinear().range([0, chartWidth]);
  yAxisScale = math.scaleLinear().range([chartHeight, 0]);

  tempLine = math
    .line()
    .x(d => xScale(d.temp) + skew * (chartHeight - yScale(d.pressure)))
    .y(d => yScale(d.pressure));

  dewPointLine = math
    .line()
    .x(d => xScale(d.dewpoint) + skew * (chartHeight - yScale(d.pressure)))
    .y(d => yScale(d.pressure));

  windLine = math
    .line()
    .x(d => xWindScale(utils.wind2obj([d.wind_u, d.wind_v]).wind))
    .y(d => yScale(d.pressure));

  const IsoTemp = ({ temp }) => {
    if (skew == 0) {
      return null;
    }
    const x1 = xScale(temp + atm.celsiusToK);
    const y2 = chartHeight - (chartWidth - x1) / skew;
    return (
      <line x1={x1} y1={chartHeight} x2={chartWidth} y2={y2} stroke="darkred" stroke-width="0.2" />
    );
  };

  const IsoHume = ({ temp }) => {
    const points = [];
    const mixingRatio = atm.mixingRatio(atm.saturationVaporPressure(temp + atm.celsiusToK), 1000);
    const step = chartHeight / 6;
    for (let y = chartHeight; y > -step; y -= step) {
      const p = yScale.invert(y);
      const t = atm.dewpoint(atm.vaporPressure(p, mixingRatio));
      points.push({ t, p });
    }
    const ad = math
      .line()
      .x(d => xScale(d.t) + skew * (chartHeight - yScale(d.p)))
      .y(d => yScale(d.p));
    return <path class="isohume" d={ad(points)} />;
  };

  const DryAdiabatic = ({ temp }) => {
    const points = [];
    const tK0 = temp + atm.celsiusToK;
    const p0 = 1000;

    const step = chartHeight / 15;
    for (let y = chartHeight; y > -step; y -= step) {
      const p = yScale.invert(y);
      const t = atm.dryLapse(p, tK0, p0);
      points.push({ t, p });
    }

    const ad = math
      .line()
      .x(d => xScale(d.t) + skew * (chartHeight - yScale(d.p)))
      .y(d => yScale(d.p));

    return <path class="dry" d={ad(points)} />;
  };

  const MoistAdiabatic = ({ temp }) => {
    const points = [];
    const tK0 = temp + atm.celsiusToK;
    const p0 = 1000;

    let t = tK0;
    let previousP = p0;
    const step = chartHeight / 15;
    for (let y = chartHeight; y > -step; y -= step) {
      const p = yScale.invert(y);
      t = t + (p - previousP) * atm.moistGradientT(p, t);
      previousP = p;
      points.push({ t, p });
    }
    const ad = math
      .line()
      .x(d => xScale(d.t) + skew * (chartHeight - yScale(d.p)))
      .y(d => yScale(d.p));
    return <path class="moist" d={ad(points)} />;
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
  const Surface = ({ elevation }) => {
    if (elevation == null) {
      return null;
    }

    const yPx = Math.round(yAxisScale(convertAlt(elevation)));
    if (yPx >= chartHeight) {
      return null;
    }
    return (
      <g>
        <rect class="surface" x="10" y={yPx} width={chartWidth} height={chartHeight - yPx} />
        <rect
          class="surface"
          x={10 + chartWidth + 20}
          y={yPx}
          width={chartWindWidth}
          height={chartHeight - yPx}
        />
      </g>
    );
  };

  const Cloud = ({ y, height, width, cover }) => {
    return (
      <rect {...{ y, height, width }} x="0" fill={`rgba(${cover}, ${cover}, ${cover}, 0.8)`} />
    );
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
    const minTs = pointData.hours[0];
    const maxTs = pointData.hours[pointData.hours.length - 1];
    const x = Math.round(((w - 1) / (maxTs - minTs)) * (ts - minTs));
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

  const Parcel = ({ data }) => {
    // Thermal 2h after sunrise to 2h before sunset
    const thermalStart = pointData.celestial.sunriseTs + 2 * 3600000;
    const thermalStop = pointData.celestial.sunsetTs - 2 * 3600000;
    const thermalDuration = thermalStop - thermalStart;
    const currentTs = store.get('timestamp');
    if (currentTs < thermalStart || ((currentTs - thermalStart) % (24 * 3600000)) > thermalDuration) {
      return null;
    }
    const temps = [];
    const dewpoints = [];
    const pressures = [];
    data.forEach(d => {
      temps.push(d.temp);
      dewpoints.push(d.dewpoint);
      pressures.push(d.pressure);
    });
    const sfcPressure = yScale.invert(yAxisScale(convertAlt(pointData.elevation)));
    const sfcThermalTemp = 3 + math.sampleAt(pressures, temps, [sfcPressure])[0];
    const sfcDewpoint = math.sampleAt(pressures, dewpoints, [sfcPressure])[0];

    const pdTemps = [];
    const pdDewpoints = [];
    const pdPressures = [];
    const pressureStep = 20;
    const mixingRatio = atm.mixingRatio(atm.saturationVaporPressure(sfcDewpoint), sfcPressure);

    for (let p = sfcPressure; p >= upperLevel; p -= pressureStep) {
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
    const dryIntersection = math.firstIntersection(pdPressures, pdTemps, pressures, temps);

    const line = math
      .line()
      .y(d => yScale(d[1]))
      .x(d => xScale(d[0]) + skew * (chartHeight - yScale(d[1])));

    const children = [];

    let thermalTop = dryIntersection;

    if (moistIntersection && moistIntersection[0] > dryIntersection[0]) {
      // Cumulus clouds
      thermalTop = moistIntersection;
      const pmPressures = [];
      const pmTemps = [];
      let t = moistIntersection[1];
      for (let p = thermalTop[0]; p >= upperLevel; p -= pressureStep) {
        pmPressures.push(p);
        pmTemps.push(t);
        t = t - pressureStep * atm.moistGradientT(p, t);
      }

      const isohumePoints = math.zip(pdDewpoints, pdPressures).filter(pt => pt[1] > thermalTop[0]);
      isohumePoints.push([moistIntersection[1], moistIntersection[0]]);
      children.push(<path class="parcel isohume" d={line(isohumePoints)} />);

      let cloudPoints = math.zip(pmTemps, pmPressures);
      const equilibrium = math.firstIntersection(pmPressures, pmTemps, pressures, temps);

      let cloudTopPx = 0;
      if (equilibrium) {
        const cloudTop = equilibrium[0];
        cloudTopPx = yScale(cloudTop);
        children.push(
          <line
            stroke="gray"
            stroke-width="1"
            stroke-dasharray="3"
            y1={cloudTopPx}
            y2={cloudTopPx}
            x2={chartWidth}
          />
        );
        cloudPoints = cloudPoints.filter(pt => pt[1] >= cloudTop);
        cloudPoints.push([equilibrium[1], equilibrium[0]]);
      }

      children.push(
        <rect
          x="0"
          y={cloudTopPx}
          height={yScale(thermalTop[0]) - cloudTopPx}
          width={chartWidth}
          fill="url(#diag-hatch)"
        />
      );
      children.push(<Cumulus x={chartWidth} y={yScale(thermalTop[0])} />);
      children.push(<path class="parcel moist" d={line(cloudPoints)} />);
    }

    const thermalTopPx = yScale(thermalTop[0]);
    const thermalTopUsr = Math.round(yAxisScale.invert(thermalTopPx) / 100) * 100;
    const dryPoints = math.zip(pdTemps, pdPressures).filter(pt => pt[1] >= thermalTop[0]);
    dryPoints.push([thermalTop[1], thermalTop[0]]);
    children.push(
      <line
        stroke="gray"
        stroke-width="1"
        stroke-dasharray="3"
        y1={thermalTopPx}
        y2={thermalTopPx}
        x2={chartWidth}
      />
    );
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
    children.push(<path class="parcel dry" d={line(dryPoints)} />);

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

  Sounding = ({ data, elevation } = {}) => {
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
              <path d="M 0,-1 L 0,11" stroke="gray" stroke-width="1" />
            </pattern>
          </defs>
          {data ? (
            <g>
              <Surface elevation={elevation} />
              <g class="wind">
                <g class="chart" transform={`translate(${chartWidth + 30},0)`}>
                  <rect
                    fill="none"
                    y="1"
                    height={chartHeight}
                    width={chartWindWidth}
                    stroke="gray"
                    stroke-width=".5"
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
                    <path class="infoline wind" d={windLine(data)} />
                    <g transform={`translate(${chartWindWidth / 2},0)`}>
                      {data.map(d => (
                        <WindArrow wind_u={d.wind_u} wind_v={d.wind_v} y={yScale(d.pressure)} />
                      ))}
                    </g>
                  </g>
                </g>
              </g>
              <g class="chart" transform="translate(10,0)">
                <Clouds />
                <rect
                  fill="none"
                  y="1"
                  height={chartHeight}
                  width={chartWidth}
                  stroke="gray"
                  stroke-width=".5"
                />
                <AltitudeAxis />
                <TemperatureAxis />
                <g class="chartArea" clip-path="url(#clip-chart)">
                  <rect class="overlay" width={chartWidth} height={chartHeight} opacity="0" />
                  <path class="infoline temperature" d={tempLine(data)} />
                  <path class="infoline dewpoint" d={dewPointLine(data)} />
                  <Parcel data={data} />
                  {[-70, -60, -50, -40, -30, -20, -10, 0, 10, 20].map(t => (
                    <IsoTemp temp={t} />
                  ))}
                  {[-20, -10, 0, 5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80].map(t => (
                    <DryAdiabatic temp={t} />
                  ))}
                  {[-20, -10, 0, 5, 10, 15, 20, 25, 30, 35].map(t => (
                    <MoistAdiabatic temp={t} />
                  ))}
                  {[-20, -15, -10, -5, 0, 5, 10, 15, 20].map(t => (
                    <IsoHume temp={t} />
                  ))}
                </g>
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
      const wind = utils.wind2obj([d.wind_u, d.wind_v]).wind;
      maxWind = Math.max(maxWind, wind);
    });
  }

  // TODO
  minTemp = -30 + atm.celsiusToK;
  maxTemp = 30 + atm.celsiusToK;

  xScale.domain([minTemp, maxTemp]);
  xAxisScale.domain([convertTemp(minTemp), convertTemp(maxTemp)]);

  xWindScale.domain([0, 30 / 3.6, maxWind]);
  xWindScale.range([0, chartWindWidth / 2, chartWindWidth]);

  yScale.domain([maxPressure, minPressure]);
  yAxisScale.domain([convertAlt(minGh), convertAlt(maxGh)]);

  const levels = [1000, 950, 925, 900, 850, 800, 700, 600, 500, 400, 300, 200, 150, 100];
  const levelsH = hrAlt.map(p => (pointData.mgCanvas.height - 1) * (1 - p / 100));
  canvasScale = math
    .scaleLinear()
    .range(levelsH)
    .domain(levels);
}

// Return the value of the parameter `name` at `level` for the given `tsIndex`
function getParam(airData, name, levelName, tsIndex) {
  const valueByTs = airData.data[`${name}-${levelName}`];
  return Array.isArray(valueByTs) ? valueByTs[tsIndex] : null;
}

function getGh(airData, levelName, tsIndex, p) {
  const value = getParam(airData, "gh", levelName, tsIndex);
  return value != null ? value : Math.round(atm.getElevation(p));
}

// Handler for data request
const load = (airData, forecast, meteogram) => {
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
  // Some models do not provide modelElevation (ie GFS)
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
  const levels = Array.from(paramLevels)
    .filter(l => l > upperLevel)
    .sort((a, b) => (Number(a) < Number(b) ? 1 : -1));

  const levelDataByTs = {};
  const sfcTempByTs = [];
  timestamps.forEach((ts, index) => {
    levelDataByTs[ts] = [];
    sfcTempByTs.push(getParam(airData, "temp", "surface", index));
    levels.forEach(level => {
      let LevelName = `${level}h`;
      const gh = getGh(airData, LevelName, index, level);

      // Forecasts have the pressure in Pa - we want hPa.
      levelDataByTs[ts].push({
        temp: getParam(airData, "temp", LevelName, index),
        dewpoint: getParam(airData, "dewpoint", LevelName, index),
        gh,
        wind_u: getParam(airData, "wind_u", LevelName, index),
        wind_v: getParam(airData, "wind_v", LevelName, index),
        pressure: level,
      });
    });
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

  pointData.data = levelDataByTs;
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
  currentData = null;
  pointData.sfcTemp = null;
  if (pointData.data) {
    const ts = store.get("timestamp");

    let ts1, ts2;
    const hours = pointData.hours;
    const idx = hours.findIndex(x => x >= ts);

    let w = 0;
    if (idx > -1) {
      if (idx == 0) {
        ts1 = ts2 = hours[0];
      } else {
        ts1 = hours[idx - 1];
        ts2 = hours[idx];
        w = (ts - ts1) / (ts2 - ts1);
      }

      // Interpolate between two nearest hours
      currentData = sUtils.interpolateArray(pointData.data[ts1], pointData.data[ts2], w);
      // Surface temperature
      const temp1 = pointData.sfcTempByTs[idx - 1];
      if (temp1 != null) {
        const temp2 = pointData.sfcTempByTs[idx];
        pointData.sfcTemp = (1 - w) * temp1 + w * temp2;
      }
    }
  }

  root = render(
    <Sounding data={currentData} elevation={pointData.elevation} display="block" />,
    containerEl,
    root
  );
};

export default { load, init };
