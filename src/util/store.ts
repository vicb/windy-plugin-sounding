import { configureStore, ThunkAction, Action } from '@reduxjs/toolkit';
import rootReducer, {
  setWidth,
  setHeight,
  updateMetrics,
  setPMin
} from "src/features";

// Automatically adds thunk and Redux DevTools
const store = configureStore({
  reducer: rootReducer,
  devTools: process.env.NODE_ENV !== 'production',
  middleware: getDefaultMiddleware => (
    getDefaultMiddleware({
      serializableCheck: false,
    })
  ),
});

export function updateStore(container: HTMLDivElement): typeof store {
  const { plugin } = store.getState();
  if (!plugin.width && !plugin.height) {
    // TODO: mobile dimension
    const graphWidth = container.clientWidth;
    const graphHeight = Math.min(graphWidth, window.innerHeight * 0.7);

    store.dispatch(setWidth(graphWidth));
    store.dispatch(setHeight(graphHeight));

    store.dispatch(updateMetrics());

    store.dispatch(setPMin(400));
  }
  return store;
}

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;

export default store;
