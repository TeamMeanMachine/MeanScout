<script lang="ts">
  import { Trash2Icon } from "@lucide/svelte";
  import { rerunAllContextLoads } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import { openDialog } from "$lib/dialog";
  import DeleteCompDialog from "$lib/dialogs/DeleteCompDialog.svelte";
  import { idb } from "$lib/idb";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();

  let showDangerZone = $derived(
    data.compRecord.scouts?.length || data.compRecord.matches.length || data.compRecord.teams.length,
  );
</script>

<div class="flex flex-col gap-6">
  {#if showDangerZone}
    <div class="flex flex-col gap-2">
      {#if data.compRecord.scouts?.length}
        <Button
          onclick={() => {
            data = {
              ...data,
              compRecord: { ...data.compRecord, scouts: [], modified: new Date() },
            };
            idb.put("comps", $state.snapshot(data.compRecord)).onsuccess = rerunAllContextLoads;
          }}
        >
          <Trash2Icon class="text-theme" />
          Delete
          {data.compRecord.scouts.length}
          {data.compRecord.scouts.length > 1 ? "scouts" : "scout"}
        </Button>
      {/if}

      {#if data.compRecord.matches.length}
        <Button
          onclick={() => {
            data = {
              ...data,
              compRecord: { ...data.compRecord, matches: [], modified: new Date() },
            };
            idb.put("comps", $state.snapshot(data.compRecord)).onsuccess = rerunAllContextLoads;
          }}
        >
          <Trash2Icon class="text-theme" />
          Delete
          {data.compRecord.matches.length}
          {data.compRecord.matches.length > 1 ? "matches" : "match"}
        </Button>
      {/if}

      {#if data.compRecord.teams.length}
        <Button
          onclick={() => {
            data = {
              ...data,
              compRecord: { ...data.compRecord, teams: [], modified: new Date() },
            };
            idb.put("comps", $state.snapshot(data.compRecord)).onsuccess = rerunAllContextLoads;
          }}
        >
          <Trash2Icon class="text-theme" />
          Delete
          {data.compRecord.teams.length}
          {data.compRecord.teams.length > 1 ? "teams" : "team"}
        </Button>
      {/if}

      {#if data.compRecord.alliances?.length}
        <Button
          onclick={() => {
            delete data.compRecord.alliances;
            idb.put("comps", $state.snapshot(data.compRecord)).onsuccess = rerunAllContextLoads;
          }}
        >
          <Trash2Icon class="text-theme" />
          Delete
          {data.compRecord.alliances.length}
          {data.compRecord.alliances.length > 1 ? "alliances" : "alliance"}
        </Button>
      {/if}
    </div>
  {/if}

  <div class="flex flex-col gap-2">
    <h2 class="font-bold">Super-Duper Danger Zone</h2>

    <Button
      onclick={() => {
        openDialog(DeleteCompDialog, { compRecord: data.compRecord, surveyCount: data.surveyRecords.length });
      }}
    >
      <Trash2Icon class="text-theme" />
      <div class="flex flex-col">
        Delete ENTIRE comp&hellip;
        {#if data.surveyRecords.length}
          <span class="text-xs font-light">
            Including
            {data.surveyRecords.length}
            {data.surveyRecords.length == 1 ? "survey" : "surveys"}
          </span>
        {/if}
      </div>
    </Button>
  </div>
</div>
