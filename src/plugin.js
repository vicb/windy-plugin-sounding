import {
  addSubscription,
  cancelSubscriptions,
  removeMarker,
  setActive,
  setLocation,
  setModelName,
  setTime,
} from "./actions/sounding";
import { getStore, updateMetrics } from "./store";
import { h, render } from "preact";

import { App } from "./containers/containers";
import { Provider } from "react-redux";
import { centerMap } from "./selectors/sounding";
import pluginCss from "./plugin.less";
import pluginHtml from "./plugin.html";

const map = W.require("map");

W.loadPlugin(
  /* eslint-disable */
  {
    name: PKG_NAME,
    version: PKG_VERSION,
    author: PKG_AUTHOR,
    repository: {
      type: PKG_REPO_TYPE,
      url: PKG_REPO_URL,
    },
    description: PKG_DESCRIPTION,
    displayName: "Better Sounding",
    hook: "contextmenu",
    className: "plugin-lhpane plugin-mobile-fullscreen",
    exclusive: "lhpane",
  },
  /* eslint-enable */
  pluginHtml,
  process.env.NODE_ENV == "development"
    ? pluginCss + "#plugins #plugin-dev {left: 70%}"
    : pluginCss,
  function () {
    const $ = W.require("$");
    const picker = W.require("picker");
    const windyStore = W.require("store");

    const store = getStore();
    const container = $("#bsounding-chart");
    render(
      <Provider store={store}>
        <App />
      </Provider>,
      container
    );

    // Called when the plugin is opened
    this.onopen = (location) => {
      let lat;
      let lon;

      // Opening from other location than contextmenu
      if (!location) {
        const c = map.getCenter();
        lat = c.lat;
        lon = c.lng;
      } else {
        lat = location.lat;
        lon = location.lon;
      }

      if (!store.getState().plugin.active) {
        // The plugin was previously closed
        map.setZoom(10, { animate: false });
        windyStore.set("overlay", "clouds");

        const timeChanged = windyStore.on("timestamp", () => {
          store.dispatch(setTime(windyStore.get("timestamp")));
        });
        store.dispatch(addSubscription(() => windyStore.off(timeChanged)));

        const productChanged = windyStore.on("product", () => {
          store.dispatch(setModelName(windyStore.get("product")));
        });
        store.dispatch(addSubscription(() => windyStore.off(productChanged)));

        const pickerOpened = picker.on("pickerOpened", ({ lat, lon }) => {
          store.dispatch(setLocation(lat, lon));
        });

        store.dispatch(addSubscription(() => picker.off(pickerOpened)));

        const pickerMoved = picker.on("pickerMoved", ({ lat, lon }) => {
          store.dispatch(setLocation(lat, lon));
        });
        store.dispatch(addSubscription(() => picker.off(pickerMoved)));

        store.dispatch(setActive(true));
      }

      updateMetrics();
      store.dispatch(setLocation(lat, lon));
      store.dispatch(setModelName(windyStore.get("product")));
      store.dispatch(setTime(windyStore.get("timestamp")));

      centerMap(store.getState())(lat, lon);

      this.node.oncontextmenu = this.node.ondblclick = this.node.onclick = (ev) =>
        ev.stopPropagation();
    };

    // Called when closed
    this.onclose = () => {
      store.dispatch(cancelSubscriptions());
      store.dispatch(removeMarker());
      store.dispatch(setActive(false));
    };
  }
);
