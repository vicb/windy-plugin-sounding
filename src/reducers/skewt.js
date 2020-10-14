import { SET_HEIGHT, SET_P_MIN, SET_WIDTH } from "../actions/skewt";

export function skewt(state = { pMax: 1000 }, action) {
  switch (action.type) {
    case SET_WIDTH:
      return { ...state, width: action.payload };
    case SET_HEIGHT:
      return { ...state, height: action.payload };
    case SET_P_MIN:
      return { ...state, pMin: action.payload };
    default:
      return state;
  }
}
