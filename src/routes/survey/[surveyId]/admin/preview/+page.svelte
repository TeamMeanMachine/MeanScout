<script lang="ts">
  import FieldValueEditor from "$lib/components/FieldValueEditor.svelte";
  import { getDefaultFieldValue, getDetailedNestedFields } from "$lib/field";
  import AdminHeader from "../AdminHeader.svelte";
  import type { PageData } from "./$types";

  let {
    data,
  }: {
    data: PageData;
  } = $props();

  let { detailedFields, detailedInnerFields } = $state(
    getDetailedNestedFields(data.surveyRecord.fieldIds, data.fieldRecords),
  );
</script>

<div class="flex flex-col gap-6" style="view-transition-name:admin">
  <AdminHeader surveyRecord={data.surveyRecord} page="preview" />

  {#if data.surveyRecord.fieldIds.length}
    <div class="flex flex-col gap-4">
      <div class="flex flex-col">
        {#if data.surveyRecord.type == "match"}
          <span><small>Match</small> <strong>##</strong></span>
        {/if}
        <span><small>Team</small> <strong>####</strong></span>
      </div>

      <div class="flex flex-col flex-wrap gap-3">
        {#each data.surveyRecord.fieldIds as fieldId}
          {@const detailedField = detailedFields.get(fieldId)}

          {#if detailedField?.type == "group"}
            <div class="flex w-full flex-col gap-1">
              <h2 class="font-bold">{detailedField.field.name}</h2>

              <div class="mb-4 flex flex-wrap items-end gap-x-6 gap-y-3">
                {#each detailedField.field.fieldIds as innerFieldId}
                  {@const detailedInnerField = detailedInnerFields.get(innerFieldId)}

                  {#if detailedInnerField}
                    <FieldValueEditor
                      field={detailedInnerField.field}
                      value={getDefaultFieldValue(detailedInnerField.field)}
                    />
                  {/if}
                {/each}
              </div>
            </div>
          {:else if detailedField}
            <FieldValueEditor field={detailedField.field} value={getDefaultFieldValue(detailedField.field)} />
          {/if}
        {/each}
      </div>
    </div>
  {:else}
    To preview an entry, go create some fields.
  {/if}
</div>
