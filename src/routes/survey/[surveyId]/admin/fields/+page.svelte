<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { openDialog } from "$lib/dialog";
  import NewFieldDialog from "$lib/dialogs/NewFieldDialog.svelte";
  import ViewFieldDialog from "$lib/dialogs/ViewFieldDialog.svelte";
  import { fieldIcons, getDetailedNestedFields } from "$lib/field";
  import { objectStore, transaction } from "$lib/idb";
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

  function refresh() {
    data = {
      ...data,
      surveyRecord: { ...data.surveyRecord, modified: new Date() },
    } as PageData;
    objectStore("surveys", "readwrite").put($state.snapshot(data.surveyRecord));

    const refreshTransaction = transaction("fields");
    refreshTransaction.onabort = () => {
      location.reload();
    };

    const fieldsRequest = refreshTransaction.objectStore("fields").index("surveyId").getAll(data.surveyRecord.id);
    fieldsRequest.onsuccess = () => {
      ({ detailedFields, detailedInnerFields } = getDetailedNestedFields(
        data.surveyRecord.fieldIds,
        fieldsRequest.result,
      ));
    };
  }
</script>

<AdminHeader surveyRecord={data.surveyRecord} page="fields" />

{#if data.disabled}
  <span>
    Can't edit fields: {data.entryRecords.length}
    {data.entryRecords.length == 1 ? "entry" : "entries"} exist.
  </span>
{/if}

{#if data.surveyRecord.fieldIds.length}
  <div class="flex flex-col gap-4">
    {#each data.surveyRecord.fieldIds as fieldId}
      {@const detailedField = detailedFields.get(fieldId)}

      {#if detailedField?.type == "group"}
        <div class="flex flex-col gap-2">
          <h2 class="font-bold">{detailedField.field.name}</h2>

          {#if !data.disabled}
            <Button
              disabled={data.disabled}
              onclick={() => {
                openDialog(ViewFieldDialog, {
                  surveyRecord: data.surveyRecord,
                  detailedFields,
                  detailedInnerFields,
                  field: structuredClone($state.snapshot(detailedField.field)),
                  onedit: refresh,
                  onmove(index, by) {
                    const fieldIds = structuredClone($state.snapshot(data.surveyRecord.fieldIds));
                    fieldIds.splice(index + by, 0, ...fieldIds.splice(index, 1));
                    data = {
                      ...data,
                      surveyRecord: { ...data.surveyRecord, fieldIds },
                    } as PageData;
                    refresh();
                  },
                  onduplicate(index, id) {
                    data = {
                      ...data,
                      surveyRecord: {
                        ...data.surveyRecord,
                        fieldIds: data.surveyRecord.fieldIds.toSpliced(index + 1, 0, id),
                      },
                    } as PageData;
                    refresh();
                  },
                  ondelete() {
                    data = {
                      ...data,
                      surveyRecord: {
                        ...data.surveyRecord,
                        fieldIds: data.surveyRecord.fieldIds.filter((id) => detailedField.field.id != id),
                      },
                    } as PageData;
                    refresh();
                  },
                });
              }}
            >
              <Icon name={fieldIcons["group"]} />
              Group
            </Button>
          {/if}

          {#each detailedField.field.fieldIds as innerFieldId}
            {@const detailedInnerField = detailedInnerFields.get(innerFieldId)}

            {#if detailedInnerField}
              <Button
                disabled={data.disabled}
                onclick={() => {
                  openDialog(ViewFieldDialog, {
                    surveyRecord: data.surveyRecord,
                    detailedFields,
                    detailedInnerFields,
                    field: structuredClone($state.snapshot(detailedInnerField.field)),
                    parentField: structuredClone($state.snapshot(detailedField.field)),
                    onedit: refresh,
                    onmove: refresh,
                    onduplicate: refresh,
                    ondelete: refresh,
                  });
                }}
              >
                <Icon name={fieldIcons[detailedInnerField.field.type]} />
                <div class="flex flex-col">
                  {detailedInnerField.field.name}
                  <small class="capitalize">{detailedInnerField.field.type}</small>
                </div>
              </Button>
            {/if}
          {/each}

          {#if !data.disabled}
            <Button
              disabled={data.disabled}
              onclick={() => {
                openDialog(NewFieldDialog, {
                  surveyRecord: data.surveyRecord,
                  parentField: structuredClone($state.snapshot(detailedField.field)),
                  type: "field",
                  oncreate: refresh,
                });
              }}
            >
              <Icon name="plus" />
              New {detailedField.field.name} field
            </Button>
          {/if}
        </div>
      {:else if detailedField}
        <Button
          disabled={data.disabled}
          onclick={() => {
            openDialog(ViewFieldDialog, {
              surveyRecord: data.surveyRecord,
              detailedFields,
              detailedInnerFields,
              field: structuredClone($state.snapshot(detailedField.field)),
              onedit: refresh,
              onmove(index, by) {
                const fieldIds = structuredClone($state.snapshot(data.surveyRecord.fieldIds));
                fieldIds.splice(index + by, 0, ...fieldIds.splice(index, 1));
                data = {
                  ...data,
                  surveyRecord: { ...data.surveyRecord, fieldIds },
                } as PageData;
                refresh();
              },
              onduplicate(index, id) {
                data = {
                  ...data,
                  surveyRecord: {
                    ...data.surveyRecord,
                    fieldIds: data.surveyRecord.fieldIds.toSpliced(index + 1, 0, id),
                  },
                } as PageData;
                refresh();
              },
              ondelete() {
                data = {
                  ...data,
                  surveyRecord: {
                    ...data.surveyRecord,
                    fieldIds: data.surveyRecord.fieldIds.filter((id) => detailedField.field.id != id),
                  },
                } as PageData;
                refresh();
              },
            });
          }}
        >
          <Icon name={fieldIcons[detailedField.field.type]} />
          <div class="flex flex-col">
            {detailedField.field.name}
            <small class="capitalize">{detailedField.field.type}</small>
          </div>
        </Button>
      {/if}
    {/each}
  </div>
{/if}

{#if !data.disabled}
  <div class="flex flex-wrap gap-2">
    <Button
      onclick={() => {
        openDialog(NewFieldDialog, {
          surveyRecord: data.surveyRecord,
          type: "group",
          oncreate(id) {
            data = {
              ...data,
              surveyRecord: {
                ...data.surveyRecord,
                fieldIds: [...data.surveyRecord.fieldIds, id],
              },
            } as PageData;
            refresh();
          },
        });
      }}
    >
      <Icon name="plus" />
      New group
    </Button>
    <Button
      onclick={() => {
        openDialog(NewFieldDialog, {
          surveyRecord: data.surveyRecord,
          type: "field",
          oncreate(id) {
            data = {
              ...data,
              surveyRecord: {
                ...data.surveyRecord,
                fieldIds: [...data.surveyRecord.fieldIds, id],
              },
            } as PageData;
            refresh();
          },
        });
      }}
    >
      <Icon name="plus" />
      New field
    </Button>
  </div>
{/if}
