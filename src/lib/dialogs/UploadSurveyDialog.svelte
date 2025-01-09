<script lang="ts">
  import type { DialogExports } from "$lib/dialog";
  import { addField, type Field } from "$lib/field";
  import { transaction } from "$lib/idb";
  import { tbaAuthKeyStore } from "$lib/settings";
  import { jsonToSurvey, surveySchema, type Survey } from "$lib/survey";
  import { tbaEventExists } from "$lib/tba";

  let {
    data,
  }: {
    data: string;
  } = $props();

  let importedSurvey = $state<Survey | undefined>();
  let importedFields: Map<number, Field> | undefined = undefined;
  let error = $state("");

  export const { onopen, onconfirm }: DialogExports = {
    async onopen(open) {
      const jsonResult = jsonToSurvey(data);
      if (!jsonResult.success) {
        error = jsonResult.error;
        return open();
      }

      const schemaResult = surveySchema.safeParse(jsonResult.survey);
      if (!schemaResult.success) {
        error = schemaResult.error.toString();
        return open();
      }

      if (
        schemaResult.data.tbaEventKey?.length &&
        $tbaAuthKeyStore &&
        !(await tbaEventExists(schemaResult.data.tbaEventKey, $tbaAuthKeyStore))
      ) {
        error = "Could not upload survey: TBA event key is invalid";
        return open();
      }

      importedSurvey = schemaResult.data;
      importedFields = jsonResult.fields;
      open();
    },
    async onconfirm() {
      if (!importedSurvey) return;

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

        location.hash = `/survey/${id}`;
      };
    },
  };
</script>

{#if importedSurvey}
  <span>Upload survey?</span>

  <span><small>Name</small> <strong>{importedSurvey.name}</strong></span>
  <span><small>Type</small> <strong>{importedSurvey.type}</strong></span>
  {#if importedSurvey.tbaEventKey}
    <span><small>TBA Event Key</small> <strong>{importedSurvey.tbaEventKey}</strong></span>
  {/if}
{/if}

{#if error}
  <span>{error}</span>
{/if}
