<script lang="ts">
  import { SquareCheckBigIcon, SquareIcon } from "@lucide/svelte";
  import { rerunAllContextLoads } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import ImportViewer from "$lib/components/ImportViewer.svelte";
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import { anyDataInBulk, importData, type ImportedData } from "$lib/import.svelte";
  import type { ClientInfo } from "$lib/online-transfer.svelte";

  let {
    data,
    client,
    existing,
    onhandle,
  }: {
    data: ImportedData;
    client: ClientInfo;
    existing: ImportedData;
    onhandle(): void;
  } = $props();

  const duplicateEntryIds = $derived.by(() => {
    return new Set(data.entries?.map((e) => e.id)).intersection(new Set(existing.entries?.map((e) => e.id)));
  });

  let overwriteDuplicateEntries = $state(true);
  let error = $state("");

  const anyImported = $derived(anyDataInBulk(data));

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      if (error) {
        return;
      }

      if (!anyImported) {
        error = "No data found";
        return;
      }

      importData({ imported: data, existing, overwriteDuplicateEntries })
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

<ImportViewer imported={data} {existing} {overwriteDuplicateEntries} {client} />

{#if duplicateEntryIds.size}
  <Button
    onclick={() => (overwriteDuplicateEntries = !overwriteDuplicateEntries)}
    class={["grow basis-0", overwriteDuplicateEntries ? "font-bold" : "font-light"]}
  >
    {#if overwriteDuplicateEntries}
      <SquareCheckBigIcon class="text-theme" />
    {:else}
      <SquareIcon class="text-neutral-500" />
    {/if}
    <div class="flex flex-col">Overwrite duplicate entries</div>
  </Button>
{/if}

Accept data?

{#if error}
  <span>{error}</span>
{/if}
