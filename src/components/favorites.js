import { h } from "preact";
import { PureComponent } from "./pure";
const utils = W.require("utils");

export class Favorites extends PureComponent {
  render({ favorites, location, onSelected }) {
    return (
      <div id="fly-to" class="size-s">
        {favorites.length == 0 ? (
          <span data-icon="m">Add favorites to enable fly to.</span>
        ) : (
          favorites.map((f) => {
            return (
              <span
                class={"location" + (utils.latLon2str(f) == location ? " selected" : "")}
                onClick={(e) => onSelected(f, e)}
              >
                {f.title || f.name}
              </span>
            );
          })
        )}
      </div>
    );
  }
}
