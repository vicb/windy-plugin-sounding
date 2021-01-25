import { SUPPORTED_MODELS, setModelName } from "../actions/sounding";

import { PureComponent } from "./pure";
import { getStore } from "../store";
import { h } from "preact";

const windyUtils = W.require("utils");
const windyStore = W.require("store");

function label(favorite) {
  return favorite.title || favorite.name;
}

function handleSelectChanged(e, onSelected) {
  if (e.target.value) {
    const [lat, lon] = e.target.value.split("#").map((str) => Number(str));
    onSelected({ lat, lon }, e);
  }
}

export class Favorites extends PureComponent {
  render({ favorites, location, isMobile, onSelected }) {
    favorites.sort((a, b) => (label(a) > label(b) ? 1 : -1));

    if (isMobile) {
      const currentModel = windyStore.get("product");
      const models = windyStore.get("visibleProducts").filter((p) => SUPPORTED_MODELS.has(p));
      models.sort();

      return (
        <div style="display: flex; justify-content: space-between; margin-bottom: 3px">
          <select id="wsp-select-fav" onChange={(e) => handleSelectChanged(e, onSelected)}>
            <option>Pick a favorite</option>
            {favorites.map((f) => {
              return (
                <option value={`${f.lat}#${f.lon}`} selected={windyUtils.latLon2str(f) == location}>
                  {label(f)}
                </option>
              );
            })}
          </select>
          <select
            id="wsp-select-model"
            onChange={(e) => getStore().dispatch(setModelName(e.target.value))}
          >
            {models.map((p) => {
              return (
                <option value={p} selected={p == currentModel}>
                  {p}
                </option>
              );
            })}
          </select>
        </div>
      );
    }

    if (favorites.length == 0) {
      return (
        <div id="fly-to" class="size-s">
          <span data-icon="m">Add favorites to enable fly to.</span>
        </div>
      );
    }

    return (
      <div id="fly-to" class="size-s">
        {favorites.map((f) => {
          return (
            <span
              class={"location" + (windyUtils.latLon2str(f) == location ? " selected" : "")}
              onClick={(e) => onSelected(f, e)}
            >
              {label(f)}
            </span>
          );
        })}
      </div>
    );
  }
}
