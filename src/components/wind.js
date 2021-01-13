import * as math from "../math";

import { PureComponent } from "./pure";
import { h } from "preact";
import { sampleAt } from "../math";

export class WindGram extends PureComponent {
  constructor(props) {
    super(props);
    this.state = { yCursor: null };
  }

  render(
    {
      isLoading,
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
    },
    { yCursor }
  ) {
    if (isLoading) {
      return;
    }
    const sfcPx = pToPx(pSfc);

    let windAtCursor = 0;
    if (yCursor != null) {
      windAtCursor = sampleAt(params.level, params.windSpeed, [pToPx.invert(yCursor)])[0];
    }

    return (
      <g
        class="chart wind"
        onPointerLeave={() => this.setState({ yCursor: null })}
        onPointerMove={(e) => this.setState({ yCursor: e.offsetY })}
      >
        <path class="line wind" d={line(math.zip(params.windSpeed, params.level))} />
        <WindAxis {...{ speedToPx, width, height, maxSpeed: windSpeedMax, metric, format, zoom }} />
        <g transform={`translate(${width / 2}, 0)`}>
          {params.level.map((level, i) =>
            level <= pSfc ? (
              <WindArrow
                direction={params.windDir[i]}
                speed={params.windSpeed[i]}
                y={pToPx(level)}
              />
            ) : null
          )}
        </g>
        {yCursor != null ? (
          <g>
            <text class="tick" text-anchor="end" style="fill: black;" x={width - 5} y={yCursor - 5}>
              {format(windAtCursor)}
            </text>
            <line id="wind-hint-line" y1={yCursor} y2={yCursor} x2={width} class="boundary" />
          </g>
        ) : null}
        <rect class="surface" y={sfcPx} width={width} height={height - sfcPx + 1} />
        <rect class="border" height={height} width={width} />
      </g>
    );
  }
}

const WindAxis = ({ height, width, metric, format, speedToPx, maxSpeed, zoom }) => {
  if (zoom) {
    const x30 = speedToPx(30 / 3.6);
    const x15 = x30 / 2;
    return (
      <g class="axis">
        <line y1={height} x1={x15} x2={x15} class="light" />
        <rect width={width / 2} height={height} fill="white" opacity="0.1" />
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
