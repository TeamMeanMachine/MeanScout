<script lang="ts">
  import "./layout.css";
  import { onNavigate } from "$app/navigation";
  import DialogBox from "$lib/components/DialogBox.svelte";
  import { closeAllDialogs, subscribeDialog, type DialogState } from "$lib/dialog";

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

  onNavigate(closeAllDialogs);
</script>

{#each dialogStack as { component, props }}
  <DialogBox {component} {props} />
{/each}

{@render children()}
