import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type SkewtState = {
  pMax: number;
  pMin?: number;
};

const initialState: SkewtState = { pMax: 1000 };

export type PMinAction = PayloadAction<number>;

const skewtSlice = createSlice({
  name: "skewt",
  initialState,
  reducers: {
    setPMin: (state, action: PMinAction) => {
      state.pMin = action.payload;
    }
  },
});

export const { setPMin } = skewtSlice.actions;
export default skewtSlice.reducer;
