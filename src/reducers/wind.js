import { SET_WIDTH, SET_HEIGHT } from "../actions/wind";

export function windgram(state = {}, action) {
  switch (action.type) {
    case SET_WIDTH:
      const { width } = action.payload;
      return { ...state, width };
    case SET_HEIGHT:
      const { height } = action.payload;
      return { ...state, height };
    default:
      return state;
  }
}
