import {
  addSubscription,
  cancelSubscriptions,
  removeMarker,
  setActive,
  setFavorites,
  setLocation,
  setModelName,
  setTime,
} from "./actions/sounding";
import { centerMap, updateTime } from "./selectors/sounding";
import { getStore, updateMetrics } from "./store";
// eslint-disable-next-line no-unused-vars
import { h, render } from "preact";

// eslint-disable-next-line no-unused-vars
import { App } from "./containers/containers";
// eslint-disable-next-line no-unused-vars
import { Provider } from "react-redux";

import * as windyRootScope from "@windy/rootScope";
import windyStore from "@windy/store";
import { map as windyMap } from "@windy/map";
import windyUtils from "@windy/utils";
import { emitter as windyPicker } from "@windy/picker";
import windyFavs from "@windy/favs";

let node;
let store;

export const onmount = (node_) => {
  node = node_;

  store = getStore(node);

  const container = node.querySelector("#bsounding-chart");
  render(
    <Provider store={store}>
      <App />
    </Provider>,
    container
  );

  if (windyRootScope.isMobileOrTablet) {
    // Tablets use the className instead of classNameMobile.
    const el = document.querySelector("#windy-plugin-sounding");
    console.log(`## pg element`, el);
    const classes = el.classList;
    classes.remove("plugin-lhpane");
    classes.add("window");
    // Swipe Left/Right on the plugin to change the time.
    windyUtils
      .loadScript("https://unpkg.com/swipe-listener@1.3.0/dist/swipe-listener.min.js")
      .then(() => {
        // Make minHorizontal big enough to avoid false positives.
        SwipeListener(el, { minHorizontal: el.offsetWidth / 6, mouse: false });
        el.addEventListener("swipe", (e) => {
          const { right, left } = e.detail.directions;
          const direction = left ? -1 : right ? 1 : 0;
          updateTime(getStore().getState())({ direction, changeDay: true });
        });
      })
      .catch((e) => console.error(e));
  }
};

// Called when the plugin is opened
export const onopen = (params) => {
  let lat;
  let lon;

  if (params.query) {    
    lat = params.query.lat;
    lon = params.query.lon;
  } else {
    lat = params.lat;
    lon = params.lon;
  }

  if (lat == null || lon == null) {
      const c = windyMap.getCenter();
      lat = c.lat;
      lon = c.lng;
  }

  // Strings when retrieved from the query string.
  lat = Number(lat);
  lon = Number(lon);

  if (!store.getState().plugin.active) {
    // The plugin was previously closed
    windyMap.setZoom(10, { animate: false });
    windyStore.set("overlay", "clouds");

    const timeChanged = windyStore.on("timestamp", () => {
      store.dispatch(setTime(windyStore.get("timestamp")));
    });
    store.dispatch(addSubscription(() => windyStore.off(timeChanged)));

    const productChanged = windyStore.on("product", () => {
      store.dispatch(setModelName(windyStore.get("product")));
    });
    store.dispatch(addSubscription(() => windyStore.off(productChanged)));

    // Can not use the picker on mobile as it is fixed at the top of the screen
    if (windyRootScope.isMobileOrTablet) {
      const center = ({ latlng }) => store.dispatch(setLocation(latlng.lat, latlng.lng));

      windyMap.on("click", center);
      store.dispatch(addSubscription(() => windyMap.off("click", center)));
    } else {
      const pickerOpened = windyPicker.on("pickerOpened", ({ lat, lon }) => {
        store.dispatch(setLocation(lat, lon));
      });
      store.dispatch(addSubscription(() => windyPicker.off(pickerOpened)));

      const pickerMoved = windyPicker.on("pickerMoved", ({ lat, lon }) => {
        store.dispatch(setLocation(lat, lon));
      });
      store.dispatch(addSubscription(() => windyPicker.off(pickerMoved)));
    }

    const favsChanged = windyFavs.on("favsChanged", () => {
      store.dispatch(setFavorites(windyFavs.getArray()));
    });
    store.dispatch(addSubscription(() => windyFavs.off(favsChanged)));
    store.dispatch(setFavorites(windyFavs.getArray()));

    store.dispatch(setActive(true));
  }

  updateMetrics();
  store.dispatch(setLocation(lat, lon));
  store.dispatch(setModelName(windyStore.get("product")));
  store.dispatch(setTime(windyStore.get("timestamp")));

  centerMap(store.getState())(lat, lon);

  node.oncontextmenu = node.ondblclick = node.onclick = (ev) => ev.stopPropagation();
};

// Called when closed
export const ondestroy = () => {
  store.dispatch(cancelSubscriptions());
  store.dispatch(removeMarker());
  store.dispatch(setActive(false));
};
