<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import { openDialog } from "$lib/dialog";
  import DeleteEntriesDialog from "$lib/dialogs/DeleteEntriesDialog.svelte";
  import DeleteSurveyDialog from "$lib/dialogs/DeleteSurveyDialog.svelte";
  import { objectStore } from "$lib/idb";
  import { Trash2Icon } from "@lucide/svelte";
  import AdminHeader from "../AdminHeader.svelte";
  import type { PageData } from "./$types";

  let {
    data,
  }: {
    data: PageData;
  } = $props();

  let showDangerZone = $derived(
    data.surveyRecord.scouts?.length || data.surveyRecord.matches.length || data.surveyRecord.teams.length,
  );
</script>

<div class="flex flex-col gap-6" style="view-transition-name:admin">
  <AdminHeader surveyRecord={data.surveyRecord} page="danger" />

  {#if showDangerZone}
    <div class="flex flex-col gap-2">
      {#if data.surveyRecord.scouts?.length}
        <Button
          onclick={() => {
            data = {
              ...data,
              surveyRecord: { ...data.surveyRecord, scouts: [], modified: new Date() },
            } as PageData;
            objectStore("surveys", "readwrite").put($state.snapshot(data.surveyRecord));
          }}
        >
          <Trash2Icon class="text-theme" />
          Delete
          {data.surveyRecord.scouts.length}
          {data.surveyRecord.scouts.length > 1 ? "scouts" : "scout"}
        </Button>
      {/if}

      {#if data.surveyRecord.matches.length}
        <Button
          onclick={() => {
            data = {
              ...data,
              surveyRecord: { ...data.surveyRecord, matches: [], modified: new Date() },
            } as PageData;
            objectStore("surveys", "readwrite").put($state.snapshot(data.surveyRecord));
          }}
        >
          <Trash2Icon class="text-theme" />
          Delete
          {data.surveyRecord.matches.length}
          {data.surveyRecord.matches.length > 1 ? "matches" : "match"}
        </Button>
      {/if}

      {#if data.surveyRecord.teams.length}
        <Button
          onclick={() => {
            data = {
              ...data,
              surveyRecord: { ...data.surveyRecord, teams: [], modified: new Date() },
            } as PageData;
            objectStore("surveys", "readwrite").put($state.snapshot(data.surveyRecord));
          }}
        >
          <Trash2Icon class="text-theme" />
          Delete
          {data.surveyRecord.teams.length}
          {data.surveyRecord.teams.length > 1 ? "teams" : "team"}
        </Button>
      {/if}
    </div>
  {/if}

  <div class="flex flex-col gap-2">
    <h2 class="font-bold">Super-Duper Danger Zone</h2>

    {#if data.entryRecords.length}
      <Button
        onclick={() => {
          openDialog(DeleteEntriesDialog, { surveyRecord: data.surveyRecord, entryCount: data.entryRecords.length });
        }}
      >
        <Trash2Icon class="text-theme" />
        <div class="flex flex-col">
          Delete {data.entryRecords.length}
          {data.entryRecords.length > 1 ? "entries" : "entry"}&hellip;
        </div>
      </Button>
    {/if}

    <Button
      onclick={() => {
        openDialog(DeleteSurveyDialog, { surveyRecord: data.surveyRecord, entryCount: data.entryRecords.length });
      }}
    >
      <Trash2Icon class="text-theme" />
      <div class="flex flex-col">
        Delete ENTIRE survey&hellip;
        {#if data.entryRecords.length}
          <span class="text-xs font-light">Including entries</span>
        {/if}
      </div>
    </Button>
  </div>
</div>
