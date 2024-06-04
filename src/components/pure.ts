import { Component } from "preact";

// Shallow diff
function diff<I extends object>(a: I, b: I) {
  for (const i in a) {
    if (!(i in b)) {
      return true;
    }
  }
  for (const i in b) {
    if (a[i] !== b[i]) {
      return true;
    }
  }
  return false;
}

export class PureComponent<P extends object = Record<string, never>, S extends object = Record<string, never>> extends Component<P, S> {
  shouldComponentUpdate(nextProps: P, nextState: S) {
    return diff(this.props, nextProps) || diff(this.state, nextState);
  }
  render() {
    return null;
  }
}
