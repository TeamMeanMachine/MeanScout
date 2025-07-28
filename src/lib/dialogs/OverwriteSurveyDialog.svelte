<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import { schemaVersion, sessionStorageStore } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import QRCodeReader from "$lib/components/QRCodeReader.svelte";
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import { type Field } from "$lib/field";
  import { idb } from "$lib/idb";
  import { cameraStore } from "$lib/settings";
  import { type Survey } from "$lib/survey";
  import { Undo2Icon } from "@lucide/svelte";

  let {
    compId,
    surveyRecord,
    fieldRecords,
    entryCount,
  }: {
    compId: string;
    surveyRecord: Survey;
    fieldRecords: Field[];
    entryCount: number;
  } = $props();

  const tab = sessionStorageStore<"qrfcode" | "file">("import-data-tab", $cameraStore ? "qrfcode" : "file");

  let files = $state<FileList | undefined>();
  let importedSurvey = $state<Survey | undefined>();
  let importedFields = $state<Map<string, Field> | undefined>();

  let changes = $state<{
    name: boolean;
    type: boolean;
    fields: boolean;
    tbaMetrics: boolean;
    pickLists: boolean;
    expressions: boolean;
  }>({
    name: false,
    type: false,
    fields: false,
    tbaMetrics: false,
    pickLists: false,
    expressions: false,
  });

  let error = $state("");

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      if (error || !importedSurvey) {
        return;
      }

      const importTransaction = idb.transaction(["surveys", "fields"], "readwrite");
      importTransaction.onabort = () => {
        error ||= "Could not overwrite survey";
      };

      importTransaction.oncomplete = () => {
        invalidateAll();
        closeDialog();
      };

      const surveyStore = importTransaction.objectStore("surveys");
      const fieldStore = importTransaction.objectStore("fields");

      surveyStore.put($state.snapshot(importedSurvey));

      if (importedFields?.size) {
        for (const [, importedField] of importedFields) {
          fieldStore.put($state.snapshot(importedField));
        }
      }

      for (const field of fieldRecords) {
        if (!importedFields?.size || !importedFields.has(field.id)) {
          fieldStore.delete(field.id);
        }
      }
    },
  };

  async function onchange() {
    if (!files?.length) {
      return;
    }

    onread(await files[0].text());
  }

  function onread(data: string) {
    retry();

    let json: {
      version: number;
      surveys?: Survey[];
      fields?: Field[];
    };

    try {
      json = JSON.parse(data);
    } catch (e) {
      console.error("JSON failed to parse imported data:", data);
      error = "JSON failed to parse";
      return;
    }

    if (json.version < schemaVersion) {
      error = "Outdated version";
      return;
    } else if (json.version > schemaVersion) {
      error = "Unsupported version";
      return;
    }

    const jsonSurvey = json.surveys?.find((jsonSurvey) => jsonSurvey.id == surveyRecord.id);

    if (!jsonSurvey) {
      error = "No matching survey found";
      return;
    }

    if (jsonSurvey.name != surveyRecord.name) {
      changes.name = true;
    }

    if (jsonSurvey.type != surveyRecord.type) {
      changes.type = true;
    }

    const jsonFields = json.fields?.filter((jsonField) => jsonField.surveyId == jsonSurvey.id);

    if (entryCount && (jsonFields?.length || 0) != fieldRecords.length) {
      error = "Different field counts aren't allowed with entries present";
      return;
    }

    importedFields = new Map();

    for (const field of jsonFields || []) {
      importedFields.set(field.id, field);
    }

    if (importedFields.size != fieldRecords.length) {
      changes.fields = true;
    }

    if (jsonSurvey.type == "match") {
      importedSurvey = {
        id: surveyRecord.id,
        compId,
        name: jsonSurvey.name,
        type: "match",
        fieldIds: jsonSurvey.fieldIds,
        pickLists: jsonSurvey.pickLists,
        expressions: jsonSurvey.expressions,
        created: surveyRecord.created,
        modified: surveyRecord.modified,
      };

      if (surveyRecord.type == "match") {
        changes.pickLists = jsonSurvey.pickLists.length != surveyRecord.pickLists.length;
        changes.expressions = jsonSurvey.expressions.length != surveyRecord.expressions.length;
      } else {
        changes.pickLists = !!jsonSurvey.pickLists.length;
        changes.expressions = !!jsonSurvey.expressions.length;
      }

      if (jsonSurvey.tbaMetrics?.length) {
        importedSurvey.tbaMetrics = jsonSurvey.tbaMetrics;
      }
    }

    if (jsonSurvey.type == "pit") {
      importedSurvey = {
        id: surveyRecord.id,
        compId,
        name: jsonSurvey.name,
        type: "pit",
        fieldIds: jsonSurvey.fieldIds,
        created: surveyRecord.created,
        modified: surveyRecord.modified,
      };
    }
  }

  function retry() {
    error = "";
    importedSurvey = undefined;
    importedFields = undefined;
    changes = {
      name: false,
      type: false,
      fields: false,
      tbaMetrics: false,
      pickLists: false,
      expressions: false,
    };
  }
</script>

<span>Overwrite "{surveyRecord.name}"</span>

{#if $cameraStore}
  <div class="flex flex-wrap gap-2 text-sm">
    <Button onclick={() => ($tab = "qrfcode")} class={$tab == "qrfcode" ? "font-bold" : "font-light"}>QRF code</Button>
    <Button onclick={() => ($tab = "file")} class={$tab == "file" ? "font-bold" : "font-light"}>File</Button>
  </div>
{/if}

{#if $tab == "qrfcode" && $cameraStore}
  {#if importedSurvey}
    <Button onclick={retry}>
      <Undo2Icon class="text-theme" />
      Retry
    </Button>
  {:else}
    <QRCodeReader {onread} />
  {/if}
{:else}
  <input
    type="file"
    accept=".json,.txt"
    bind:files
    {onchange}
    class="file:text-theme file:mr-3 file:border-none file:bg-neutral-800 file:p-2"
  />
{/if}

{#if importedSurvey}
  <div class="grid grid-cols-3 gap-1">
    <div class="text-sm font-light">Data</div>
    <div class="text-sm font-light">Existing</div>
    <div class="text-sm font-light">Imported</div>

    {#if changes.name}
      <div>Name</div>
      <div>{surveyRecord.name}</div>
      <div>{importedSurvey.name}</div>
    {/if}

    {#if changes.type}
      <div>Type</div>
      <div>{surveyRecord.type}</div>
      <div>{importedSurvey.type}</div>
    {/if}

    {#if changes.fields}
      <div>Fields</div>
      <div>{fieldRecords.length || "-"}</div>
      <div>{importedFields?.size || "-"}</div>
    {/if}

    {#if changes.pickLists}
      <div>Pick Lists</div>
      <div>{(surveyRecord.type == "match" ? surveyRecord.pickLists.length : 0) || "-"}</div>
      <div>{(importedSurvey.type == "match" ? importedSurvey.pickLists.length : 0) || "-"}</div>
    {/if}

    {#if changes.expressions}
      <div>Expressions</div>
      <div>{(surveyRecord.type == "match" ? surveyRecord.expressions.length : 0) || "-"}</div>
      <div>{(importedSurvey.type == "match" ? importedSurvey.expressions.length : 0) || "-"}</div>
    {/if}
  </div>
{/if}

{#if error}
  <span>{error}</span>
{/if}
