import * as math from "../math";
import { h } from "preact";

export const WindGram = ({
  params,
  width,
  height,
  windSpeedMax,
  metric,
  format,
  pSfc,
  pToPx,
  speedToPx,
  line,
  zoom,
}) => {
  const sfcPx = pToPx(pSfc);

  return (
    <g class="chart wind">
      <path class="line wind" d={line(math.zip(params.windSpeed, params.level))} />
      <WindAxis {...{ speedToPx, width, height, maxSpeed: windSpeedMax, metric, format, zoom }} />
      <g transform={`translate(${width / 2}, 0)`}>
        {params.level.map((level, i) =>
          level <= pSfc ? (
            <WindArrow direction={params.windDir[i]} speed={params.windSpeed[i]} y={pToPx(level)} />
          ) : null
        )}
      </g>
      <rect class="surface" y={sfcPx} width={width} height={height - sfcPx + 1} />
      <rect class="border" height={height} width={width} />
    </g>
  );
};

const WindAxis = ({ height, width, metric, format, speedToPx, maxSpeed, zoom }) => {
  if (zoom) {
    const x30 = speedToPx(30 / 3.6);
    const x15 = x30 / 2;
    return (
      <g class="axis">
        <line y1={height} x1={x15} x2={x15} class="light" />
        <rect x={width / 2} width={width / 2} height={height} fill="red" opacity="0.1" />
        <text class="tick" transform={`translate(${x15 - 5} 80) rotate(-90)`}>
          {format(15 / 3.6)}
        </text>
        <text class="tick" transform={`translate(${x30 - 5} 80) rotate(-90)`}>
          {format(30 / 3.6)}
        </text>
        <text class="tick" transform={`translate(${width - 5} 80) rotate(-90)`}>
          {`${format(maxSpeed)} ${metric}`}
        </text>
      </g>
    );
  }

  return (
    <g class="axis">
      <line y1={height} x1={width / 3} x2={width / 3} class="light" />
      <text class="tick" transform={`translate(${width / 3 - 5} 80) rotate(-90)`}>
        {format(maxSpeed / 3)}
      </text>
      <line y1={height} x1={(2 * width) / 3} x2={(2 * width) / 3} class="light" />
      <text class="tick" transform={`translate(${(2 * width) / 3 - 5} 80) rotate(-90)`}>
        {format((2 * maxSpeed) / 3)}
      </text>
      <text class="tick" transform={`translate(${width - 5} 80) rotate(-90)`}>
        {`${format(maxSpeed)} ${metric}`}
      </text>
    </g>
  );
};

const WindArrow = ({ direction, y, speed }) => {
  return speed > 1 ? (
    <g transform={`translate(0,${y}) rotate(${direction})`} stroke="black" fill="none">
      <line y2="-30" />
      <path d="M-4,-8L0,0L4,-8" stroke-linejoin="round" />
    </g>
  ) : (
    <g transform={`translate(0,${y})`} stroke="black" fill="none">
      <circle r="6" />
      <circle r="1" />
    </g>
  );
};
