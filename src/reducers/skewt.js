import { SET_WIDTH, SET_HEIGHT, SET_P_MIN } from "../actions/skewt";

export function skewt(state = { pMax: 1000 }, action) {
  switch (action.type) {
    case SET_WIDTH:
      const { width } = action.payload;
      return { ...state, width };
    case SET_HEIGHT:
      const { height } = action.payload;
      return { ...state, height };
    case SET_P_MIN:
      const { pMin } = action.payload;
      return { ...state, pMin };
    default:
      return state;
  }
}
