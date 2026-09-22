<script lang="ts">
  import "./layout.css";
  import { onNavigate } from "$app/navigation";
  import { rerunAllContextLoads } from "$lib";
  import BetaDialogBox from "$lib/components/BetaDialogBox.svelte";
  import DialogBox from "$lib/components/DialogBox.svelte";
  import { EventDB } from "$lib/db";
  import { closeAllDialogs, Dialog, subscribeDialog, type DialogState } from "$lib/dialog";
  import { anyDataInBulk, importData } from "$lib/import.svelte";
  import { onlineTransfer } from "$lib/online-transfer.svelte";
  import { webRtcAutoReceiveStore } from "$lib/settings";
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

  onNavigate(() => {
    Dialog.stack.clear();
    closeAllDialogs();
  });

  onlineTransfer.onrtcresponsemessage = (id, response) => {
    const areResponseEntriesInCurrentEvent =
      EventDB.id && EventDB.id == response.eventDB?.id && response.eventDB.entries?.length;
    if ($webRtcAutoReceiveStore && (response.entries?.length || areResponseEntriesInCurrentEvent)) {
      importData({
        existing: data.all,
        imported: {
          comps: [],
          surveys: [],
          fields: [],
          entries: response.entries,
          eventDB:
            areResponseEntriesInCurrentEvent && response.eventDB
              ? { id: response.eventDB.id, version: response.eventDB.version, entries: response.eventDB.entries }
              : undefined,
        },
        overwriteDuplicateEntries: false,
      })
        .then(({ duplicateLegacyEntries, duplicateEventEntries }) => {
          const filteredResponse = {
            ...response,
            entries: response.entries?.filter((e) => duplicateLegacyEntries.has(e.id)),
            eventDB: response.eventDB
              ? {
                  ...response.eventDB,
                  entries: response.eventDB.entries?.filter((e) => duplicateEventEntries.has(e.id)),
                }
              : undefined,
          };

          const anyData = anyDataInBulk(filteredResponse);

          if (anyData.meta || anyData.event || anyData.legacy) {
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

{#each Dialog.stack as [Content, props]}
  <BetaDialogBox {Content} {props} />
{/each}

{#each dialogStack as { component, props }}
  <DialogBox {component} {props} />
{/each}

{@render children()}
