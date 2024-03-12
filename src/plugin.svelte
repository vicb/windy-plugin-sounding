<script lang="ts">
  import bcast from "@windy/broadcast";
  import { isMobileOrTablet } from "@windy/rootScope";
  import { onDestroy, onMount } from "svelte";
  import config from "./pluginConfig";
  import { openPlugin, mountPlugin, destroyPlugin } from "./sounding";
  import { LatLon } from "@windycom/plugin-devtools/types/interfaces";

  let pluginElement: any;

  const { title } = config;

  export const onopen = (ll?: LatLon) => {
    openPlugin(ll);
  };

  onMount(() => {
    mountPlugin(pluginElement);
  });

  onDestroy(() => {
    destroyPlugin();
  });
</script>

{#if isMobileOrTablet}
  <section class="plugin__content mobile">
    <div id="bsounding-chart" bind:this={pluginElement}></div>
    <div class="sponsor" style="text-align:center; padding-top: 1em">
      <a href="https://www.buymeacoffee.com/vic.b" target="_blank"
        ><img
          src="https://cdn.buymeacoffee.com/buttons/default-orange.png"
          alt="Buy Me A Coffee"
          height="35"
          width="145"
          style="display: inline-block"
        /></a
      >
    </div>
  </section>
{:else}
  <section class="plugin__content">
    <div
      class="plugin__title plugin__title--chevron-back"
      on:click={() => bcast.emit("rqstOpen", "menu")}
    >
      ⛅️ {title}
    </div>

    <div id="bsounding-chart" bind:this={pluginElement}></div>
    <div class="sponsor">
      <p>Sponsor the development of this plugin</p>
      <a href="https://www.buymeacoffee.com/vic.b" target="_blank"
        ><img
          src="https://cdn.buymeacoffee.com/buttons/default-orange.png"
          alt="Buy Me A Coffee"
          height="41"
          width="174"
        /></a
      >
    </div>
  </section>
{/if}
