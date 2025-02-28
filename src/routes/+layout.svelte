<script lang="ts">
  import { onNavigate } from "$app/navigation";
  import DialogBox from "$lib/components/DialogBox.svelte";
  import LaunchUploadHandler from "$lib/components/LaunchUploadHandler.svelte";
  import { closeAllDialogs, type DialogState, subscribeDialog } from "$lib/dialog";
  import { animationStore } from "$lib/settings";
  import { BarChart } from "echarts/charts";
  import {
    TooltipComponent,
    LegendComponent,
    GridComponent,
    TitleComponent,
    DatasetComponent,
  } from "echarts/components";
  import * as echarts from "echarts/core";
  import { SVGRenderer } from "echarts/renderers";
  import "../app.css";

  let { children } = $props();

  if (navigator.storage) {
    navigator.storage
      .persisted()
      .then((isPersisted) => {
        if (isPersisted) return;
        navigator.storage.persist().catch(console.error);
      })
      .catch(console.error);
  }

  let dialogStack = $state<DialogState[]>([]);
  subscribeDialog((state) => {
    dialogStack = state;
  });

  echarts.use([
    BarChart,
    TooltipComponent,
    LegendComponent,
    GridComponent,
    TitleComponent,
    DatasetComponent,
    SVGRenderer,
  ]);

  onNavigate((navigation) => {
    closeAllDialogs();

    if (document.startViewTransition && $animationStore == "full") {
      return new Promise((resolve) => {
        document.startViewTransition(async () => {
          resolve();
          await navigation.complete;
        });
      });
    }
  });
</script>

{#each dialogStack as { component, props }}
  <DialogBox {component} {props} />
{/each}

<LaunchUploadHandler />

{@render children()}
