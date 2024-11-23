<script lang="ts">
  import { openDialog } from "$lib/dialog";
  import UploadEntriesDialog from "$lib/dialogs/UploadEntriesDialog.svelte";
  import UploadSurveyDialog from "$lib/dialogs/UploadSurveyDialog.svelte";
  import { onMount } from "svelte";

  onMount(async () => {
    const keys = await caches.keys();
    const key = keys.find((key) => key.startsWith("MS-Uploads"));
    if (!key) return;

    const cache = await caches.open(key);
    const response = await cache.match("upload");
    if (!response) return;

    const blob = await response.blob();
    await cache.delete("upload");
    const data = await blob.text();

    switch (blob.type) {
      case "application/json":
      case "text/plain":
        openDialog(UploadSurveyDialog, { data });
        break;
      case "text/csv":
      case "text/comma-separated-values":
        openDialog(UploadEntriesDialog, { data });
        break;
    }
  });
</script>
