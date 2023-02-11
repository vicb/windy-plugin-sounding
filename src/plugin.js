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
import pluginCss from "./plugin.less";
import pluginHtml from "./plugin.html";

const windyMap = W.require("map").map;
const windyRootScope = W.require("rootScope");
const windyUtils = W.require("utils");
const windyFavs = W.require("favs");

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
    className: "plugin-lhpane",
    classNameMobile: "window",
    exclusive: "lhpane",
    attachPointMobile: "#plugins",
  },
  /* eslint-enable */
  pluginHtml,
  process.env.NODE_ENV == "development"
    ? pluginCss + "#plugins #plugin-dev {left: 70%}"
    : pluginCss,
  function () {
    const $ = W.require("utils").$;
    const windyPicker = W.require("picker");
    const windyStore = W.require("store");

    const store = getStore();
    const container = $("#bsounding-chart");
    render(
      <Provider store={store}>
        <App />
      </Provider>,
      container
    );

    if (windyRootScope.isMobileOrTablet) {
      // Tablets use the className instead of classNameMobile.
      const el = document.querySelector("#windy-plugin-sounding");
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

    // Called when the plugin is opened
    this.onopen = (location) => {
      let lat;
      let lon;

      // Get location from:
      // - the opening location,
      // - the query location,
      // - the map center.
      if (!location) {
        const q = this.query || {};
        if (q.lat == null || q.lon == null) {
          const c = windyMap.getCenter();
          lat = c.lat;
          lon = c.lng;
        } else {
          lat = Number(q.lat);
          lon = Number(q.lon);
        }
      } else {
        lat = location.lat;
        lon = location.lon;
      }

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

        const pickerOpened = windyPicker.on("pickerOpened", ({ lat, lon }) => {
          store.dispatch(setLocation(lat, lon));
        });
        store.dispatch(addSubscription(() => windyPicker.off(pickerOpened)));

        const pickerMoved = windyPicker.on("pickerMoved", ({ lat, lon }) => {
          store.dispatch(setLocation(lat, lon));
        });
        store.dispatch(addSubscription(() => windyPicker.off(pickerMoved)));

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

      this.node.oncontextmenu =
        this.node.ondblclick =
        this.node.onclick =
          (ev) => ev.stopPropagation();
    };

    // Called when closed
    this.onclose = () => {
      store.dispatch(cancelSubscriptions());
      store.dispatch(removeMarker());
      store.dispatch(setActive(false));
    };
  }
);
