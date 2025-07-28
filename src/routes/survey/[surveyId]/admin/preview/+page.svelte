<script lang="ts">
  import FieldValueEditor from "$lib/components/FieldValueEditor.svelte";
  import { getDefaultFieldValue } from "$lib/field";
  import SurveyAdminHeader from "../SurveyAdminHeader.svelte";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
</script>

<div class="flex flex-col gap-6" style="view-transition-name:admin">
  <SurveyAdminHeader compRecord={data.compRecord} surveyRecord={data.surveyRecord} page="preview" />

  {#if data.fieldRecords.length}
    <div class="flex flex-col gap-4">
      <div class="flex flex-wrap gap-x-6 gap-y-3">
        {#if data.surveyRecord.type == "match"}
          <div class="flex flex-col">
            <span class="text-xs">Match</span>
            <span class="font-bold">##</span>
          </div>
        {/if}
        <div class="flex flex-col">
          <span class="text-xs">Team</span>
          <span class="font-bold">####</span>
        </div>
      </div>

      <div class="flex flex-col flex-wrap gap-3">
        {#each data.fieldsWithDetails.topLevel as { field } (field.id)}
          {#if field.type == "group"}
            {@const nestedFields = field.fieldIds
              .map((id) => data.fieldRecords.find((f) => f.id == id))
              .filter((f) => f !== undefined && f.type != "group")}

            <div class="flex w-full flex-col gap-2">
              <h2 class="font-bold">{field.name}</h2>

              <div class="mb-4 flex flex-wrap items-end gap-x-6 gap-y-3">
                {#each nestedFields as nestedField (nestedField.id)}
                  <FieldValueEditor field={nestedField} value={getDefaultFieldValue(nestedField)} />
                {/each}
              </div>
            </div>
          {:else}
            <FieldValueEditor {field} value={getDefaultFieldValue(field)} />
          {/if}
        {/each}
      </div>
    </div>
  {:else}
    <span class="text-sm">To preview your entry layout, go create some fields.</span>
  {/if}
</div>
