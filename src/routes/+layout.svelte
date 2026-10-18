<script lang="ts">
  import "./layout.css";
  import { rerunAllContextLoads } from "#lib";
  import DialogBox from "#lib/components/DialogBox.svelte";
  import { closeAllDialogs, subscribeDialog, type DialogState } from "#lib/dialog.ts";
  import { importData } from "#lib/import.svelte.ts";
  import { onlineTransfer } from "#lib/online-transfer.svelte.ts";
  import { webRtcAutoReceiveStore } from "#lib/settings.ts";
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
      const newEntries = response.entries.filter(
        (existingEntry) => !data.all.entries.some((newEntry) => newEntry.id == existingEntry.id),
      );

      importData({
        existing: data.all,
        imported: { comps: [], surveys: [], fields: [], entries: newEntries },
        overwriteDuplicateEntries: false,
      })
        .catch(console.error)
        .finally(() => {
          const filteredResponse = {
            ...response,
            entries: response.entries.filter((e) => !newEntries.some((newEntry) => newEntry.id == e.id)),
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
        });
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
