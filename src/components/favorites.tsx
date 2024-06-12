// eslint-disable-next-line no-unused-vars
import { h } from "preact";
import { SUPPORTED_MODEL_PREFIXES, setModelName, PluginState} from "src/features";
import { PureComponent } from "src/components/pure";

import store from "src/util/store";
import windyStore from "@windy/store";
import windyUtils from "@windy/utils";
import windyModels from "@windy/models";

type FavoritesProps = {
  favorites: PluginState["favorites"];
  location: string;
  isMobile: boolean;
  onSelected: (
    { lat, lon }: {
      lat: number;
      lon: number;
    }
  ) => void;
};

function label(favorite: { name?: string; title?: string }) {
  return favorite.title || favorite.name;
}

function handleFavoriteChanged(e: h.JSX.TargetedEvent<HTMLSelectElement, Event>, onSelected: FavoritesProps["onSelected"]) {
  if (e.currentTarget.value && e.currentTarget.value != "Pick a favorite") {
    const [lat, lon] = e.currentTarget.value.split("#").map((str: string | number) => Number(str));
    onSelected({ lat, lon }, e);
  }
}

function handleModelChanged(name: string) {
  store.dispatch(setModelName(name));
  windyStore.set("product", name);
}

export class Favorites extends PureComponent {
  render ({ favorites, location, isMobile, onSelected }: FavoritesProps) {
    const sortedFavorites = [...favorites].sort((a, b) => (label(a) > label(b) ? 1 : -1));

    if (isMobile) {
      const currentModel = windyStore.get("product");
      const models = windyModels
        .getAllPointProducts(windyUtils.str2latLon(location))
        .filter((model) => SUPPORTED_MODEL_PREFIXES.some((prefix) => model.startsWith(prefix)));

      const sortedModels = [...models].sort();

      return (
        <div style="display: flex; justify-content: space-between; margin-bottom: 3px">
          <select
            id="wsp-select-fav"
            onChange={(e) => handleFavoriteChanged(e, onSelected)}
            style="max-width: 60%"
          >
            <option>Pick a favorite</option>
            {sortedFavorites.map((f) => {
              return (
                <option key={label(f)} value={`${f.lat}#${f.lon}`} selected={windyUtils.latLon2str(f) == location}>
                  {label(f)}
                </option>
              );
            })}
          </select>
          <select
            id="wsp-select-model"
            onChange={(e) => handleModelChanged(e.currentTarget.value)}
            style="max-width: 35%"
          >
            {sortedModels.map((p) => {
              return (
                <option key={p} value={p} selected={p == currentModel}>
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
            <span key={label(f)}
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
