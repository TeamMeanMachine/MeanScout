<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import { openDialog } from "$lib/dialog";
  import DeleteEntriesDialog from "$lib/dialogs/DeleteEntriesDialog.svelte";
  import DeleteSurveyDialog from "$lib/dialogs/DeleteSurveyDialog.svelte";
  import { Trash2Icon } from "@lucide/svelte";
  import SurveyAdminHeader from "../SurveyAdminHeader.svelte";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
</script>

<div class="flex flex-col gap-6" style="view-transition-name:admin">
  <SurveyAdminHeader compRecord={data.compRecord} surveyRecord={data.surveyRecord} page="danger" />

  <div class="flex flex-col gap-2">
    <h2 class="font-bold">Danger Zone</h2>

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
          <span class="text-xs font-light"
            >Including
            {data.entryRecords.length}
            {data.entryRecords.length == 1 ? "entry" : "entries"}
          </span>
        {/if}
      </div>
    </Button>
  </div>
</div>
