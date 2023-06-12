import { PureComponent } from "./pure";
// eslint-disable-next-line no-unused-vars
import { h } from "preact";

export function Parcel({ parcel, width, line, pToPx, formatAltitude, rain }) {
  const { trajectory, isohume, elevThermalTop, pThermalTop, pCloudTop } = parcel;
  const parts = [];
  if (trajectory) {
    const thtY = pToPx(pThermalTop);
    if (pCloudTop) {
      const ctY = pToPx(pCloudTop);
      parts.push(
        <rect y={ctY} height={thtY - ctY} width={width} fill="url(#diag-hatch)" />,
        <Cumulus x={width} y={thtY} />,
        <line class="boundary" y1={ctY} y2={ctY} x2={width} />
      );
      if (rain) {
        parts.push(<RainDrop x={width} y={thtY} />);
      }
    }
    parts.push(
      <line class="boundary" y1={thtY} y2={thtY} x2={width} />,
      <text
        class="tick"
        style="fill: black"
        text-anchor="end"
        dominant-baseline="hanging"
        y={thtY + 4}
        x={width - 7}
        filter="url(#whiteOutlineEffect)"
      >
        {formatAltitude(elevThermalTop)}
      </text>,
      <path class="parcel trajectory" d={line(trajectory)} />
    );
    if (isohume) {
      parts.push(<path class="parcel isohume" d={line(isohume)} />);
    }
  }

  return parts.length ? <g>{parts}</g> : null;
}

// https://www.flaticon.com/authors/yannick
class Cumulus extends PureComponent {
  render({ x, y }) {
    return (
      <path
        class="cumulus"
        transform={`translate(${x - 36}, ${y - 28})`}
        d="M26.003 24H5.997C3.794 24 2 22.209 2 20c0-1.893 1.318-3.482 3.086-3.896A7.162 7.162 0 0 1 5 15c0-3.866 3.134-7 7-7 3.162 0 5.834 2.097 6.702 4.975A4.477 4.477 0 0 1 21.5 12c2.316 0 4.225 1.75 4.473 4h.03C28.206 16 30 17.791 30 20c0 2.205-1.789 4-3.997 4z"
      />
    );
  }
}

export class RainDrop extends PureComponent {
  render({ x, y }) {
    return (
      <path
        class="raindrop"
        transform={`translate(${x - 36 + 15}, ${y - 36 + 25}) scale(0.2)`}
        d="M26.4562,52.9128c10.248,0,18.5862-8.3362,18.5862-18.5836c0-10.036-17.4188-32.8138-18.1606-33.7782L26.4562,0l-0,0 c-0,0-18.1604,23.742-18.1604,33.7764C7.8704,44.5766,16.2084,52.9128,26.4562,52.9128"
      />
    );
  }
}
