<script lang="ts">
  import { SquareCheckBigIcon, SquareIcon } from "@lucide/svelte";
  import { rerunAllContextLoads } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import ImportViewer from "$lib/components/ImportViewer.svelte";
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import type { AllData } from "$lib/idb";
  import { importData } from "$lib/import";
  import type { ClientInfo, RTCResponseMessage } from "$lib/online-transfer.svelte";

  let {
    message,
    client,
    existing,
    onhandle,
  }: {
    message: RTCResponseMessage;
    client: ClientInfo;
    existing: AllData;
    onhandle(): void;
  } = $props();

  const importedIds = $derived({
    comps: new Set(message.comps?.map((c) => c.id)),
    surveys: new Set(message.surveys?.map((s) => s.id)),
    fields: new Set(message.fields?.map((f) => f.id)),
    entries: new Set(message.entries?.map((e) => e.id)),
  });

  const existingIds = $derived({
    comps: new Set(existing.comps.map((c) => c.id)),
    surveys: new Set(existing.surveys.map((s) => s.id)),
    fields: new Set(existing.fields.map((f) => f.id)),
    entries: new Set(existing.entries.map((e) => e.id)),
  });

  const duplicateIds = $derived({
    comps: importedIds.comps.intersection(existingIds.comps),
    surveys: importedIds.surveys.intersection(existingIds.surveys),
    fields: importedIds.fields.intersection(existingIds.fields),
    entries: importedIds.entries.intersection(existingIds.entries),
  });

  let overwriteDuplicateEntries = $state(true);
  let error = $state("");

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      if (error) {
        return;
      }

      if (!message.comps?.length && !message.surveys?.length && !message.fields?.length && !message.entries?.length) {
        error = "No data in message";
        return;
      }

      importData({ imported: message, existing, overwriteDuplicateEntries })
        .then(() => {
          onhandle();
          rerunAllContextLoads();
          closeDialog();
        })
        .catch((reason) => {
          error = reason;
        });
    },
  };
</script>

<ImportViewer imported={message} {existing} {overwriteDuplicateEntries} {client} />

{#if duplicateIds.entries.size}
  <Button
    onclick={() => (overwriteDuplicateEntries = !overwriteDuplicateEntries)}
    class={["grow basis-0", overwriteDuplicateEntries ? "font-bold" : "font-light"]}
  >
    {#if overwriteDuplicateEntries}
      <SquareCheckBigIcon class="text-theme" />
    {:else}
      <SquareIcon class="text-theme" />
    {/if}
    <div class="flex flex-col">Overwrite duplicate entries</div>
  </Button>
{/if}

Accept data?

{#if error}
  <span>{error}</span>
{/if}
