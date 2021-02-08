import { PureComponent } from "./pure";
// eslint-disable-next-line no-unused-vars
import { h } from "preact";

export class LoadingIndicator extends PureComponent {
  render({ cx, cy }) {
    return (
      <svg width="60" height="60" viewBox="0 0 38 38" x={cx - 30} y={cy - 30}>
        <g transform="translate(1 1)" stroke-width="2" fill="none" fill-rule="evenodd">
          <circle cx="18" cy="18" r="18" stroke="#ddd" />
          <path d="M36 18C36 8 28 0 18 0" stroke="#333">
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 18 18"
              to="360 18 18"
              dur="1s"
              repeatCount="indefinite"
            />
          </path>
        </g>
      </svg>
    );
  }
}
