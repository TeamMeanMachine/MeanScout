<script lang="ts">
  import { onNavigate } from "$app/navigation";
  import DialogBox from "$lib/components/DialogBox.svelte";
  import { closeAllDialogs, type DialogState, subscribeDialog } from "$lib/dialog";
  import { animationStore } from "$lib/settings";
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

{@render children()}
