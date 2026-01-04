<script lang="ts">
  import { Trash2Icon } from "@lucide/svelte";
  import Button from "$lib/components/Button.svelte";
  import { openDialog } from "$lib/dialog";
  import DeleteEntriesDialog from "$lib/dialogs/DeleteEntriesDialog.svelte";
  import DeleteSurveyDialog from "$lib/dialogs/DeleteSurveyDialog.svelte";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
</script>

<div class="flex flex-col gap-6">
  <div class="flex flex-col gap-2">
    <h2 class="font-bold">Danger Zone</h2>

    {#if data.survey.entryRecords.length}
      <Button
        onclick={() => {
          openDialog(DeleteEntriesDialog, {
            surveyRecord: data.survey.record,
            entryCount: data.survey.entryRecords.length,
          });
        }}
      >
        <Trash2Icon class="text-theme" />
        <div class="flex flex-col">
          Delete {data.survey.entryRecords.length}
          {data.survey.entryRecords.length > 1 ? "entries" : "entry"}&hellip;
        </div>
      </Button>
    {/if}

    <Button
      onclick={() => {
        openDialog(DeleteSurveyDialog, {
          surveyRecord: data.survey.record,
          entryCount: data.survey.entryRecords.length,
        });
      }}
    >
      <Trash2Icon class="text-theme" />
      <div class="flex flex-col">
        Delete ENTIRE survey&hellip;
        {#if data.survey.entryRecords.length}
          <span class="text-xs font-light"
            >Including
            {data.survey.entryRecords.length}
            {data.survey.entryRecords.length == 1 ? "entry" : "entries"}
          </span>
        {/if}
      </div>
    </Button>
  </div>
</div>
