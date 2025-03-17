<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import { sessionStorageStore } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import QRCodeReader from "$lib/components/QRCodeReader.svelte";
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import { addField, type Field } from "$lib/field";
  import { transaction } from "$lib/idb";
  import { cameraStore } from "$lib/settings";
  import { importSurvey, surveySchema, type Survey } from "$lib/survey";
  import { Undo2Icon } from "@lucide/svelte";

  let {
    surveyRecord,
    fieldRecords,
    entryCount,
  }: {
    surveyRecord: IDBRecord<Survey>;
    fieldRecords: IDBRecord<Field>[];
    entryCount: number;
  } = $props();

  const tab = sessionStorageStore<"qrfcode" | "file">("import-data-tab", $cameraStore ? "qrfcode" : "file");

  let files = $state<FileList | undefined>();
  let importedSurvey = $state<Survey | undefined>();
  let importedFields: Map<number, Field> | undefined = undefined;
  let error = $state("");

  export const { onconfirm }: DialogExports = {
    async onconfirm() {
      if (!importedSurvey) {
        error = "No input";
        return;
      }

      if (importedSurvey.name != surveyRecord.name) {
        error = "Different survey names";
        return;
      }

      if (importedSurvey.type != surveyRecord.type) {
        error = "Different survey types";
        return;
      }

      if (entryCount && (importedFields?.size || 0) != fieldRecords.length) {
        error = "Different field counts aren't allowed with entries present";
        return;
      }

      const importTransaction = transaction(["surveys", "fields"], "readwrite");
      importTransaction.onabort = () => {
        error = "Could not overwrite survey";
      };

      importTransaction.oncomplete = () => {
        invalidateAll();
        closeDialog();
      };

      const surveyStore = importTransaction.objectStore("surveys");
      const fieldStore = importTransaction.objectStore("fields");

      const overwriteRequest = surveyStore.put({
        ...$state.snapshot(importedSurvey),
        id: surveyRecord.id,
        modified: new Date(),
      });

      overwriteRequest.onsuccess = async () => {
        if (importedFields?.size && importedSurvey?.fieldIds.length) {
          const newIds: number[] = [];
          const oldNewMap = new Map<number, number>();

          for (const fieldId of importedSurvey.fieldIds) {
            try {
              const addedFieldId = await addField(fieldStore, importedFields, oldNewMap, fieldId, surveyRecord.id);
              newIds.push(addedFieldId);
              oldNewMap.set(fieldId, addedFieldId);
            } catch (error) {
              importTransaction.abort();
              console.error(fieldId, error);
              return;
            }
          }

          importedSurvey.fieldIds = newIds;
          if (importedSurvey.type == "match") {
            importedSurvey.expressions = importedSurvey.expressions.map((e) => {
              if (e.input.from == "fields") {
                e.input.fieldIds = e.input.fieldIds.map((oldId) => oldNewMap.get(oldId) || oldId);
              }
              return e;
            });
          }

          surveyStore.put({
            ...$state.snapshot(importedSurvey),
            id: surveyRecord.id,
            modified: new Date(),
          });

          for (const field of fieldRecords) {
            fieldStore.delete(field.id);
          }
        }
      };
    },
  };

  async function onchange() {
    if (!files?.length) {
      return;
    }

    onread(await files[0].text());
  }

  function onread(data: string) {
    const jsonResult = importSurvey(data);
    if (!jsonResult.success) {
      error = jsonResult.error;
      return;
    }

    const schemaResult = surveySchema.safeParse(jsonResult.survey);
    if (!schemaResult.success) {
      error = schemaResult.error.toString();
      return;
    }

    importedSurvey = schemaResult.data;
    importedFields = jsonResult.fields;
  }

  function retry() {
    error = "";
    importedSurvey = undefined;
    importedFields = undefined;
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
    {@render preview()}

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

  {#if importedSurvey}
    {@render preview()}
  {/if}
{/if}

{#snippet preview()}
  <span><small>Name</small> <strong>{importedSurvey?.name}</strong></span>
  <span><small>Type</small> <strong>{importedSurvey?.type}</strong></span>
  {#if importedSurvey?.tbaEventKey}
    <span><small>TBA Event Key</small> <strong>{importedSurvey.tbaEventKey}</strong></span>
  {/if}
{/snippet}

{#if error}
  <span>{error}</span>
{/if}
