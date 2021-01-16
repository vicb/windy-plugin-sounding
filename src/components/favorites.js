import { PureComponent } from "./pure";
import { h } from "preact";
const utils = W.require("utils");

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
    if (favorites.length == 0) {
      return (
        <div id="fly-to" class="size-s">
          <span data-icon="m">Add favorites to enable fly to.</span>
        </div>
      );
    }

    favorites.sort((a, b) => (label(a) > label(b) ? 1 : -1));

    if (isMobile) {
      return (
        <select id="wsp-select-fav" onChange={(e) => handleSelectChanged(e, onSelected)}>
          <option>Pick a favorite</option>
          {favorites.map((f) => {
            return (
              <option value={`${f.lat}#${f.lon}`} selected={utils.latLon2str(f) == location}>
                {label(f)}
              </option>
            );
          })}
        </select>
      );
    }

    return (
      <div id="fly-to" class="size-s">
        {favorites.map((f) => {
          return (
            <span
              class={"location" + (utils.latLon2str(f) == location ? " selected" : "")}
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
