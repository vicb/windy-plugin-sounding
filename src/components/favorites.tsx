import { SUPPORTED_MODEL_PREFIXES, setModelName } from "../actions/sounding";

import { PureComponent } from "./pure.js";
import { getStore } from "../util/store.js";
// eslint-disable-next-line no-unused-vars
import { h } from "preact";
import windyStore from "@windy/store";
import windyUtils from "@windy/utils";
import windyModels from "@windy/models";

function label(favorite) {
  return favorite.title || favorite.name;
}

function handleFavoriteChanged(e, onSelected) {
  if (e.target.value) {
    const [lat, lon] = e.target.value.split("#").map((str) => Number(str));
    onSelected({ lat, lon }, e);
  }
}

function handleModelChanged(name) {
  getStore().dispatch(setModelName(name));
  windyStore.set("product", name);
}

export class Favorites extends PureComponent {
  render({ favorites, location, isMobile, onSelected }) {
    favorites.sort((a, b) => (label(a) > label(b) ? 1 : -1));

    if (isMobile) {
      const currentModel = windyStore.get("product");
      const models = windyModels
        .getAllPointProducts(windyUtils.str2latLon(location))
        .filter((model) => SUPPORTED_MODEL_PREFIXES.some((prefix) => model.startsWith(prefix)));

      models.sort();

      return (
        <div style="display: flex; justify-content: space-between; margin-bottom: 3px">
          <select
            id="wsp-select-fav"
            onChange={(e) => handleFavoriteChanged(e, onSelected)}
            style="max-width: 60%"
          >
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
            onChange={(e) => handleModelChanged(e.target.value)}
            style="max-width: 35%"
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
        <div id="fly-to" className="size-s">
          <span data-icon="m">Add favorites to enable fly to.</span>
        </div>
      );
    }

    return (
      <div id="fly-to" className="size-s">
        {favorites.map((f) => {
          return (
            <span
              className={"location" + (windyUtils.latLon2str(f) == location ? " selected" : "")}
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
