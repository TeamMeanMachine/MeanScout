<script lang="ts">
  import { CalendarDaysIcon, SquarePenIcon } from "@lucide/svelte";
  import { rerunAllContextLoads } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import FetchTbaDataButton from "$lib/components/FetchTbaDataButton.svelte";
  import { openDialog } from "$lib/dialog";
  import EditCompNameDialog from "$lib/dialogs/EditCompNameDialog.svelte";
  import EditCompTbaEventKeyDialog from "$lib/dialogs/EditCompTbaEventKeyDialog.svelte";
  import { idb } from "$lib/idb";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
</script>

<div class="flex flex-col gap-6">
  <div class="flex flex-col gap-2">
    <Button
      onclick={() =>
        openDialog(EditCompNameDialog, {
          compRecord: data.compRecord,
          onedit(name) {
            data = {
              ...data,
              compRecord: { ...data.compRecord, name, modified: new Date() },
            };
            idb.put("comps", $state.snapshot(data.compRecord)).onsuccess = rerunAllContextLoads;
          },
        })}
    >
      <SquarePenIcon class="text-theme" />
      <div class="flex flex-col">
        {data.compRecord.name}
        <span class="text-xs font-light">Edit name</span>
      </div>
    </Button>
  </div>

  <div class="flex flex-col gap-2">
    <h2 class="font-bold">The Blue Alliance</h2>
    <Button
      onclick={() =>
        openDialog(EditCompTbaEventKeyDialog, {
          compRecord: data.compRecord,
          onedit(tbaEventKey) {
            data = {
              ...data,
              compRecord: { ...data.compRecord, tbaEventKey, modified: new Date() },
            };
            idb.put("comps", $state.snapshot(data.compRecord)).onsuccess = rerunAllContextLoads;
          },
        })}
    >
      <CalendarDaysIcon class="text-theme" />
      {#if data.compRecord.tbaEventKey}
        <div class="flex flex-col">
          {data.compRecord.tbaEventKey}
          <span class="text-xs font-light">Edit event</span>
        </div>
      {:else}
        Add event
      {/if}
    </Button>

    {#if data.compRecord.tbaEventKey}
      <FetchTbaDataButton pageData={data} />
    {/if}
  </div>
</div>
