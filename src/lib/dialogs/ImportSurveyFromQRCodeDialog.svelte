<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import QRCodeReader from "$lib/components/QRCodeReader.svelte";
  import type { DialogExports } from "$lib/dialog";
  import { addField, type Field } from "$lib/field";
  import { transaction } from "$lib/idb";
  import { tbaAuthKeyStore } from "$lib/settings";
  import { importSurveyCompressed, surveySchema, type Survey } from "$lib/survey";
  import { tbaEventExists } from "$lib/tba";

  let importedSurvey = $state<Survey | undefined>();
  let importedFields: Map<number, Field> | undefined = undefined;
  let error = $state("");

  export const { onconfirm }: DialogExports = {
    async onconfirm() {
      if (!importedSurvey) {
        error = "No input";
        return;
      }

      if (
        importedSurvey.tbaEventKey?.length &&
        $tbaAuthKeyStore &&
        !(await tbaEventExists(importedSurvey.tbaEventKey))
      ) {
        error = "TBA event key is invalid";
        return;
      }

      const importTransaction = transaction(["surveys", "fields"], "readwrite");
      importTransaction.onabort = () => {
        error = "Could not import survey";
      };

      const surveyStore = importTransaction.objectStore("surveys");
      const fieldStore = importTransaction.objectStore("fields");

      const addRequest = surveyStore.add($state.snapshot(importedSurvey));

      addRequest.onsuccess = async () => {
        const id = addRequest.result as number;

        if (importedFields?.size && importedSurvey?.fieldIds.length) {
          const newIds: number[] = [];
          const oldNewMap = new Map<number, number>();

          for (const fieldId of importedSurvey.fieldIds) {
            try {
              const addedFieldId = await addField(fieldStore, importedFields, oldNewMap, fieldId, id);
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
                e.input.fieldIds = e.input.fieldIds.map((oldId) => {
                  const newId = oldNewMap.get(oldId);
                  if (newId) {
                    return newId;
                  }
                  return oldId;
                });
              }
              return e;
            });
          }
          surveyStore.put({ ...$state.snapshot(importedSurvey), id });
        }

        location.hash = `/survey/${id}/admin`;
      };
    },
  };

  async function onread(data: Uint8Array) {
    const jsonResult = await importSurveyCompressed(data);
    console.log(jsonResult);
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

<span>Import survey</span>

{#if importedSurvey}
  <span><small>Name</small> <strong>{importedSurvey.name}</strong></span>
  <span><small>Type</small> <strong>{importedSurvey.type}</strong></span>
  {#if importedSurvey.tbaEventKey}
    <span><small>TBA Event Key</small> <strong>{importedSurvey.tbaEventKey}</strong></span>
  {/if}
  <Button onclick={retry}>
    <Icon name="arrow-rotate-left" />
    Retry
  </Button>
{:else}
  <QRCodeReader {onread} />
{/if}

{#if error}
  <span>{error}</span>
{/if}
