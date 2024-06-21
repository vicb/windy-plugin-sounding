// eslint-disable-next-line no-unused-vars
import { h, render } from "preact";
import {
  addSubscription,
  cancelSubscriptions,
  removeMarker,
  setActive,
  setFavorites,
  setLocation,
  setTime,
  setModelName,
  updateMetrics
} from "src/features";
import store, { updateStore } from "src/util/store";
// eslint-disable-next-line no-unused-vars
import { App } from "src/containers/containers";
// eslint-disable-next-line no-unused-vars
import { Provider } from "react-redux";
import * as windyRootScope from "@windy/rootScope";
import windyStore from "@windy/store";
import windyUtils from "@windy/utils";
import { map as windyMap } from "@windy/map";
import { emitter as windyPicker } from "@windy/picker";
import favs from "@windy/userFavs";
import { singleclick } from "@windy/singleclick";
import "./styles.less";
import { LatLon } from "@windycom/plugin-devtools/types/interfaces.js";
import { centerMap, updateTime } from "src/features/plugin/pluginSelector";
import config from "src/pluginConfig";

declare const SwipeListener;

const setCurrentLocation = (ll: LatLon) => {
  const { lat, lon } = ll;
  store.dispatch(setLocation(lat, lon));
};

export const mountPlugin = (container: HTMLDivElement) => {
  updateStore(container);

  render(
    <Provider store={store}>
      <App />
    </Provider>,
    container,
  );

  // todo(vicb)
  if (windyRootScope.isMobileOrTablet) {
    // Tablets use the className instead of classNameMobile.
    const el = document.querySelector("#plugin-windy-plugin-sounding") as HTMLDivElement;
    // Swipe Left/Right on the plugin to change the time.
    windyUtils
      .loadScript("https://unpkg.com/swipe-listener@1.3.0/dist/swipe-listener.min.js")
      .then(() => {
        // Make minHorizontal big enough to avoid false positives.
        SwipeListener(el, { minHorizontal: el.offsetWidth / 6, mouse: false });
        el.addEventListener("swipe", (e: CustomEvent) => {
          const { right, left } = e.detail.directions;
          const direction = left ? -1 : right ? 1 : 0;
          updateTime(updateStore(el).getState())({ direction, changeDay: true });
        });
      })
      .catch((e) => console.error(e));
  }
};

// Called when the plugin is opened
export const openPlugin = (ll?: LatLon) => {
  let lat: number;
  let lon: number;

  if (!ll || ll.lat == null || ll.lon == null) {
    const c = windyMap.getCenter();
    lat = c.lat;
    lon = c.lng;
  } else {
    lat = Number(ll.lat);
    lon = Number(ll.lon);
  }

  if (!store.getState().plugin.active) {
    // The plugin was previously closed
    windyMap.setZoom(10, { animate: false });
    windyStore.set("overlay", "clouds");

    const timeChangedEventId = windyStore.on("timestamp", () => {
      store.dispatch(setTime(windyStore.get("timestamp")));
    });
    store.dispatch(addSubscription(() => windyStore.off(timeChangedEventId)));

    const productChangedEventId = windyStore.on("product", () => {
      store.dispatch(setModelName(windyStore.get("product")));
    });
    store.dispatch(addSubscription(() => windyStore.off(productChangedEventId)));

    const singleClickIdEventId = singleclick.on(config.name, setCurrentLocation);

    store.dispatch(addSubscription(() => singleclick.off(singleClickIdEventId)));

    // USe the picker events on desktop.
    if (!windyRootScope.isMobileOrTablet) {
      const pickerOpenedEventId = windyPicker.on("pickerOpened", setCurrentLocation);

      store.dispatch(addSubscription(() => windyPicker.off(pickerOpenedEventId)));

      const pickerMovedEventId = windyPicker.on("pickerMoved", setCurrentLocation);

      store.dispatch(addSubscription(() => windyPicker.off(pickerMovedEventId)));
    }

    const favsChangedEventId = favs.on("favsChanged", () => {
      store.dispatch(setFavorites(favs.getArray()));
    });

    store.dispatch(addSubscription(() => favs.off(favsChangedEventId)));
    store.dispatch(setFavorites(favs.getArray()));
    store.dispatch(setActive(true));
  }

  store.dispatch(updateMetrics());
  centerMap(store.getState())(lat, lon);
  setCurrentLocation({ lat, lon });
  store.dispatch(setModelName(windyStore.get("product")));
  store.dispatch(setTime(windyStore.get("timestamp")));
};

// Called when closed
export const destroyPlugin = () => {
  store.dispatch(cancelSubscriptions());
  store.dispatch(removeMarker());
  store.dispatch(setActive(false));
};
