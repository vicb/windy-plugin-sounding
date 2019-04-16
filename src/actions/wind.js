export const SET_WIDTH = "WND.SET_WIDTH";
export const SET_HEIGHT = "WND.SET_HEIGHT";

export const setWidth = width => ({
  type: SET_WIDTH,
  payload: { width },
});

export const setHeight = height => ({
  type: SET_HEIGHT,
  payload: { height },
});
