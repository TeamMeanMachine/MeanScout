<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { openDialog } from "$lib/dialog";
  import DeleteSurveyDialog from "$lib/dialogs/DeleteSurveyDialog.svelte";
  import AdminHeader from "../AdminHeader.svelte";
  import type { PageData } from "./$types";

  let {
    data,
  }: {
    data: PageData;
  } = $props();
</script>

<div class="flex flex-col gap-6" style="view-transition-name:admin">
  <AdminHeader surveyRecord={data.surveyRecord} page="danger" />

  <Button
    onclick={() => {
      openDialog(DeleteSurveyDialog, { surveyRecord: data.surveyRecord, entryCount: data.entryRecords.length });
    }}
  >
    <Icon name="trash" />
    <div class="flex flex-col">
      Delete survey
      {#if data.entryRecords.length}
        <small>And {data.entryRecords.length} {data.entryRecords.length > 1 ? "entries" : "entry"}</small>
      {/if}
    </div>
  </Button>
</div>
