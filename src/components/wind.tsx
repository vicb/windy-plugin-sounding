// eslint-disable-next-line no-unused-vars
import { h } from "preact";
import { pluginSel, skewTSel, windSel } from "src/features";
import * as math from "../util/math";
import { PureComponent } from "./pure";
import { sampleAt } from "../util/math";

type WindGramProps = {
  isLoading?: boolean;
  params?: ReturnType<typeof skewTSel.params>;
  windSpeedMax?: ReturnType<typeof windSel.windSpeedMax>;
  width?: number;
  height?: number;
  format?: ReturnType<typeof pluginSel.formatSpeed>;
  metric?: ReturnType<typeof pluginSel.speedMetric>;
  pSfc?: ReturnType<typeof skewTSel.pSfc>;
  pToPx?: ReturnType<typeof skewTSel.pToPx>;
  speedToPx?: ReturnType<typeof windSel.speedToPx>;
  line?: ReturnType<typeof windSel.line>;
  zoom?: ReturnType<typeof pluginSel.zoom>;
  yPointer?: ReturnType<typeof pluginSel.yPointer>;
  setYPointer?: (y: WindGramProps["yPointer"]) => void;
};

export class WindGram extends PureComponent<WindGramProps> {
  constructor(props: WindGramProps) {
    super(props);
  }
  render() {
    const {
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
      yPointer,
      setYPointer,
    } = this.props;

    if (isLoading) {
      return null;
    }
    const sfcPx = pToPx(pSfc);

    let windAtCursor = 0;
    if (yPointer != null) {
      windAtCursor = sampleAt(params.level, params.windSpeed, [pToPx.invert(yPointer)])[0];
    }

    return (
      <g
        className="chart wind"
        onPointerLeave={() => setYPointer(null)}
        onPointerMove={(e) => setYPointer(e.offsetY)}
      >
        <defs>
          <filter id="whiteOutlineEffect" colorInterpolationFilters="sRGB">
            <feMorphology in="SourceAlpha" result="MORPH" operator="dilate" radius="2" />
            <feColorMatrix
              in="MORPH"
              result="WHITENED"
              type="matrix"
              values="-1 0 0 0 1, 0 -1 0 0 1, 0 0 -1 0 1, 0 0 0 1 0"
            />
            <feMerge>
              <feMergeNode in="WHITENED" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <WindAxis {...{ speedToPx, width, height, maxSpeed: windSpeedMax, metric, format, zoom }} />
        <path className="line wind" d={line(math.zip(params.windSpeed, params.level))} />
        <g transform={`translate(${width / 2}, 0)`}>
          {params.level.map((level, i) =>
            level <= pSfc ? (
              <WindArrow
                key={pToPx(level)}
                direction={params.windDir[i]}
                speed={params.windSpeed[i]}
                y={pToPx(level)}
              />
            ) : null
          )}
        </g>
        <rect className="surface" y={sfcPx} width={width} height={height - sfcPx + 1} />
        {yPointer != null && yPointer < sfcPx ? (
          <g>
            <text
              className="tick"
              textAnchor="end"
              dominantBaseline="hanging"
              x={width - 5}
              y={yPointer + 4}
              filter="url(#whiteOutlineEffect)"
            >
              {format(windAtCursor)}
            </text>
            <line id="wind-hint-line" y1={yPointer} y2={yPointer} x2={width} className="boundary" />
          </g>
        ) : null}
        <rect className="border" height={height} width={width} />
      </g>
    );
  }
}

function WindAxis({ height, width, metric, format, speedToPx, maxSpeed, zoom }) {
  if (zoom) {
    const x30 = speedToPx(30 / 3.6);
    const x15 = x30 / 2;
    return (
      <g className="axis">
        <rect width={width} height={height} fill="white" opacity="1" />
        <rect x={width / 2} width={width / 2} height={height} fill="red" opacity="0.1" />
        <line y1={height} x1={x15} x2={x15} className="light" />
        <text
          className="tick"
          transform={`translate(${x15 - 5} 80) rotate(-90)`}
          filter="url(#whiteOutlineEffect)"
        >
          {format(15 / 3.6)}
        </text>
        <text
          className="tick"
          transform={`translate(${x30 - 5} 80) rotate(-90)`}
          filter="url(#whiteOutlineEffect)"
        >
          {format(30 / 3.6)}
        </text>
        <text
          className="tick"
          transform={`translate(${width - 5} 80) rotate(-90)`}
          filter="url(#whiteOutlineEffect)"
        >
          {`${format(maxSpeed)} ${metric}`}
        </text>
      </g>
    );
  }


  return (
    <g className="axis">
      <rect width={width} height={height} fill="white" opacity="1" />
      <line y1={height} x1={width / 3} x2={width / 3} className="light" />
      <text
        className="tick"
        transform={`translate(${width / 3 - 5} 80) rotate(-90)`}
        filter="url(#whiteOutlineEffect)"
      >
        {format(maxSpeed / 3)}
      </text>
      <line y1={height} x1={(2 * width) / 3} x2={(2 * width) / 3} className="light" />
      <text
        className="tick"
        transform={`translate(${(2 * width) / 3 - 5} 80) rotate(-90)`}
        filter="url(#whiteOutlineEffect)"
      >
        {format((2 * maxSpeed) / 3)}
      </text>
      <text
        className="tick"
        transform={`translate(${width - 5} 80) rotate(-90)`}
        filter="url(#whiteOutlineEffect)"
      >
        {`${format(maxSpeed)} ${metric}`}
      </text>
    </g>
  );
}

function WindArrow({ direction, y, speed }) {
  return speed > 1 ? (
    <g transform={`translate(0,${y}) rotate(${direction})`} stroke="black" fill="none">
      <line y2="-30" />
      <path d="M-4,-8L0,0L4,-8" strokeLinejoin="round" />
    </g>
  ) : (
    <g transform={`translate(0,${y})`} stroke="black" fill="none">
      <circle r="6" />
      <circle r="1" />
    </g>
  );
}
