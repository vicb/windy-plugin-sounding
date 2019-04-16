import * as math from "../math";
import * as atm from "../atmosphere";
import { Parcel } from "../components/parcel";
import { h } from "preact";
import { PureComponent } from "./pure";

export const SkewT = ({
  params,
  pMax,
  width,
  height,
  cloudCover,
  pSfc,
  parcel,
  formatAltitude,
  tAxisToPx,
  pToPx,
  pAxisToPx,
  line,
  tMetric,
  tAxisStep,
  ghMetric,
  ghAxisStep,
}) => {
  const sfcPx = pToPx(pSfc);

  return (
    <svg width={width} height={height + 20}>
      <defs>
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

      <g class="chart skewt">
        <g class="axis">
          {[-20, -10, 0, 5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80].map(t => (
            <DryAdiabat
              temp={t + 273.15}
              pressure={pMax}
              height={height}
              pToPx={pToPx}
              line={line}
            />
          ))}
          {[-20, -10, 0, 5, 10, 15, 20, 25, 30, 35].map(t => (
            <MoistAdiabat
              temp={t + 273.15}
              pressure={pMax}
              height={height}
              pToPx={pToPx}
              line={line}
            />
          ))}
          {[-20, -15, -10, -5, 0, 5, 10, 15, 20].map(t => (
            <IsoHume temp={t + 273.15} pressure={pMax} {...{ height, pToPx, line }} />
          ))}
          {[-70, -60, -50, -40, -30, -20, -10, 0, 10, 20, 30, 40].map(t => (
            <IsoTherm temp={t + 273.15} {...{ height, pToPx, line }} />
          ))}
          {parcel && <Parcel {...{ parcel, width, height, line, pToPx, formatAltitude }} />}
          <TemperatureAxis
            width={width}
            height={height}
            tAxisToPx={tAxisToPx}
            step={tAxisStep}
            metric={tMetric}
          />
          <Clouds width={width} height={height} cloudCover={cloudCover} pToPx={pToPx} pSfc={pSfc} />
          <AltitudeAxis width={width} pAxisToPx={pAxisToPx} step={ghAxisStep} metric={ghMetric} />
        </g>
        <path class="line temperature" d={line(math.zip(params.temp, params.level))} />
        <path class="line dewpoint" d={line(math.zip(params.dewpoint, params.level))} />
        <rect class="surface" y={sfcPx} width={width} height={height - sfcPx + 1} />
        <rect class="border" height={height} width={width} />
      </g>
    </svg>
  );
};
class DryAdiabat extends PureComponent {
  render({ temp, pressure, height, pToPx, line }) {
    const points = [];
    const stepPx = height / 15;
    for (let y = height; y > -stepPx; y -= stepPx) {
      const p = pToPx.invert(y);
      const t = atm.dryLapse(p, temp, pressure);
      points.push([t, p]);
    }

    return <path class="dry" d={line(points)} />;
  }
}

class MoistAdiabat extends PureComponent {
  render({ temp, pressure, height, pToPx, line }) {
    const points = [];
    let previousP = pressure;
    const stepPx = height / 15;
    for (let y = height; y > -stepPx; y -= stepPx) {
      const p = pToPx.invert(y);
      temp = temp + (p - previousP) * atm.moistGradientT(p, temp);
      previousP = p;
      points.push([temp, p]);
    }

    return <path class="moist" d={line(points)} />;
  }
}

class IsoHume extends PureComponent {
  render({ temp, pressure, height, pToPx, line }) {
    const points = [];
    const mixingRatio = atm.mixingRatio(atm.saturationVaporPressure(temp), pressure);
    const stepPx = height;
    for (let y = height; y > -stepPx; y -= stepPx) {
      const p = pToPx.invert(y);
      const t = atm.dewpoint(atm.vaporPressure(p, mixingRatio));
      points.push([t, p]);
    }
    return <path class="isohume" d={line(points)} />;
  }
}

class IsoTherm extends PureComponent {
  render({ temp, height, pToPx, line }) {
    const points = [[temp, pToPx.invert(height)], [temp, pToPx.invert(0)]];
    return <path class="isotherm" d={line(points)} />;
  }
}

class TemperatureAxis extends PureComponent {
  render({ height, width, metric, step, tAxisToPx }) {
    const ticks = [];
    const start = Math.trunc(tAxisToPx.invert(0) / step) * step;
    for (let temp = start, isLast; !isLast; temp += step) {
      const x = tAxisToPx(temp);
      isLast = tAxisToPx(temp + step) > width;
      ticks.push(
        <text class="tick" text-anchor="middle" dominant-baseline="hanging" y={height + 5} x={x}>
          {temp + (isLast ? " " + metric : "")}
        </text>
      );
    }

    return <g>{ticks}</g>;
  }
}

const AltitudeAxis = ({ pAxisToPx, width, metric, step }) => {
  const children = [];
  for (let alti = step, isLast; !isLast; alti += step) {
    const yPx = pAxisToPx(alti);
    isLast = pAxisToPx(alti + step) < 20;
    children.push(
      <line y1={yPx} x2={width} y2={yPx} class="light" />,
      <text class="tick" y={yPx - 5} x={5}>
        {alti + " " + (isLast ? " " + metric : "")}
      </text>
    );
  }

  return <g>{children}</g>;
};

const Clouds = ({ width, cloudCover, pToPx, pSfc }) => {
  const rects = [];

  let y = 30;
  const upperPressure = pToPx.invert(y);
  // TODO: 100
  const upperCover = cloudCover(upperPressure, 100);

  if (upperCover > 0) {
    rects.push(
      <Cloud y="0" width={width} height="30" cover={upperCover} />,
      <text class="tick" y={30 - 5} x={width - 5} text-anchor="end">
        upper clouds
      </text>,

      <line y1="30" y2="30" x2={width} class="boundary" />
    );
  }

  // Then respect the y scale
  const sfcY = pToPx(pSfc);
  while (y < sfcY) {
    const startY = y;
    const cover = cloudCover(pToPx.invert(y));
    let layerHeight = 1;
    while (y++ < sfcY && cloudCover(pToPx.invert(y)) == cover) {
      layerHeight++;
    }
    if (cover == 0) {
      continue;
    }
    rects.push(<Cloud y={startY} width={100} height={layerHeight} cover={cover} />);
  }

  return <g>{rects}</g>;
};

const Cloud = ({ y, height, width, cover }) => {
  return <rect {...{ y, height, width }} fill={`rgba(${cover}, ${cover}, ${cover}, 0.7)`} />;
};
