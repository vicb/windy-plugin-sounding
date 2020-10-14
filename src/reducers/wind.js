import { SET_HEIGHT, SET_WIDTH } from "../actions/wind";

export function windgram(state = {}, action) {
  switch (action.type) {
    case SET_WIDTH:
      return { ...state, width: action.payload };
    case SET_HEIGHT:
      return { ...state, height: action.payload };
    default:
      return state;
  }
}
