export const SET_WIDTH = "SKT.SET_WIDTH";
export const SET_HEIGHT = "SKT.SET_HEIGHT";
export const SET_P_MIN = "SKT.SET_P_MIN";

export const setWidth = width => ({
  type: SET_WIDTH,
  payload: { width },
});

export const setHeight = height => ({
  type: SET_HEIGHT,
  payload: { height },
});

export const setPMin = pMin => ({
  type: SET_P_MIN,
  payload: { pMin },
});
