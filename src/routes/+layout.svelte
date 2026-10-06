<script lang="ts">
  import "./layout.css";
  import { rerunAllContextLoads } from "#lib";
  import DialogBox from "#lib/components/DialogBox.svelte";
  import { closeAllDialogs, subscribeDialog, type DialogState } from "#lib/dialog.js";
  import { importData } from "#lib/import.svelte.js";
  import { onlineTransfer } from "#lib/online-transfer.svelte.js";
  import { webRtcAutoReceiveStore } from "#lib/settings.js";
  import { onNavigate } from "$app/navigation";
  import { onDestroy } from "svelte";

  let { data, children } = $props();

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

  onlineTransfer.onrtcresponsemessage = (id, response) => {
    if ($webRtcAutoReceiveStore && response.entries.length) {
      importData({
        existing: data.all,
        imported: { comps: [], surveys: [], fields: [], entries: response.entries },
        overwriteDuplicateEntries: false,
      })
        .then(({ duplicateEntryIds }) => {
          const filteredResponse = {
            ...response,
            entries: response.entries.filter((e) => duplicateEntryIds.has(e.id)),
          };

          if (
            filteredResponse.comps.length ||
            filteredResponse.surveys.length ||
            filteredResponse.fields.length ||
            filteredResponse.entries.length
          ) {
            onlineTransfer.dataFromClients.set(id, filteredResponse);
          } else {
            onlineTransfer.dataFromClients.delete(id);
          }

          rerunAllContextLoads();
        })
        .catch(console.error);
    }
  };

  onDestroy(() => {
    onlineTransfer.onrtcresponsemessage = undefined;
  });
</script>

{#each dialogStack as { component, props }}
  <DialogBox {component} {props} />
{/each}

{@render children()}
