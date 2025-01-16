<script lang="ts">
  import type { DialogExports } from "$lib/dialog";
  import { addField, type Field } from "$lib/field";
  import { transaction } from "$lib/idb";
  import { tbaAuthKeyStore } from "$lib/settings";
  import { importSurvey, surveySchema, type Survey } from "$lib/survey";
  import { tbaEventExists } from "$lib/tba";

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

      if (
        importedSurvey.tbaEventKey?.length &&
        $tbaAuthKeyStore &&
        !(await tbaEventExists(importedSurvey.tbaEventKey, $tbaAuthKeyStore))
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
              return;
            }
          }

          importedSurvey.fieldIds = newIds;
          if (importedSurvey.type == "match") {
            importedSurvey.expressions = importedSurvey.expressions.map((e) => {
              e.inputs = e.inputs.map((i) => {
                if (i.from == "field" && oldNewMap.has(i.fieldId)) {
                  const newId = oldNewMap.get(i.fieldId);
                  if (newId) {
                    i.fieldId = newId;
                  }
                }
                return i;
              });
              return e;
            });
          }
          surveyStore.put({ ...$state.snapshot(importedSurvey), id });
        }

        location.hash = `/survey/${id}/admin`;
      };
    },
  };

  async function onchange() {
    if (!files?.length) {
      return;
    }

    const jsonResult = importSurvey(await files[0].text());
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
</script>

<span>Import survey</span>

<input
  type="file"
  accept=".json,.txt"
  bind:files
  {onchange}
  class="file:mr-3 file:border-none file:bg-neutral-800 file:p-2 file:text-theme"
/>

{#if importedSurvey}
  <span><small>Name</small> <strong>{importedSurvey.name}</strong></span>
  <span><small>Type</small> <strong>{importedSurvey.type}</strong></span>
  {#if importedSurvey.tbaEventKey}
    <span><small>TBA Event Key</small> <strong>{importedSurvey.tbaEventKey}</strong></span>
  {/if}
{/if}

{#if error}
  <span>{error}</span>
{/if}
