import { Component } from "preact";

// Shallow diff
function diff(a, b) {
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

export class PureComponent extends Component {
  shouldComponentUpdate(props, state) {
    return diff(this.props, props) || diff(this.state, state);
  }
}
