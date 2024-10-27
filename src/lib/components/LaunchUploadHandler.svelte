<script lang="ts">
  import { openDialog } from "$lib/dialog";
  import UploadEntriesDialog from "$lib/dialogs/UploadEntriesDialog.svelte";
  import UploadSurveyDialog from "$lib/dialogs/UploadSurveyDialog.svelte";

  let {
    idb,
  }: {
    idb: IDBDatabase;
  } = $props();

  function handleUpload(type: string, data: string) {
    switch (type) {
      case "application/json":
      case "text/plain":
        openDialog(UploadSurveyDialog, { idb, data });
        break;
      case "text/csv":
      case "text/comma-separated-values":
        openDialog(UploadEntriesDialog, { idb, data });
        break;
    }
  }

  async function checkUploadCache() {
    const keys = await caches.keys();
    const key = keys.find((key) => key.startsWith("MS-Uploads"));
    if (!key) return;

    const cache = await caches.open(key);
    const response = await cache.match("upload");
    if (!response) return;

    const blob = await response.blob();
    await cache.delete("upload");
    const data = await blob.text();

    handleUpload(blob.type, data);
  }

  // LaunchQueue is intended to be used with modifying files in the device file system.
  // We're not using it that way, so things are a bit buggy:
  // refreshing after using "Open with" will rerun the consumer.
  // https://github.com/WICG/web-app-launch/issues/92
  function checkLaunchQueue() {
    if (!("launchQueue" in window)) return;

    window.launchQueue.setConsumer(async (launchParams) => {
      if (!launchParams.files?.length) return;

      const file = await launchParams.files[0].getFile();
      const data = await file.text();

      handleUpload(file.type, data);
    });
  }

  checkUploadCache();
  checkLaunchQueue();
</script>
