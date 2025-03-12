<script lang="ts">
  import Sortable from "sortablejs";
  import Button from "$lib/components/Button.svelte";
  import { openDialog } from "$lib/dialog";
  import NewFieldDialog from "$lib/dialogs/NewFieldDialog.svelte";
  import ViewFieldDialog from "$lib/dialogs/ViewFieldDialog.svelte";
  import { fieldIcons, getDetailedNestedFields } from "$lib/field";
  import { objectStore, transaction } from "$lib/idb";
  import AdminHeader from "../AdminHeader.svelte";
  import type { PageData } from "./$types";
  import { onMount } from "svelte";
  import { GroupIcon, PlusIcon } from "@lucide/svelte";

  let {
    data,
  }: {
    data: PageData;
  } = $props();

  let { detailedFields, detailedInnerFields } = $state(
    getDetailedNestedFields(data.surveyRecord.fieldIds, data.fieldRecords),
  );

  let mainList: HTMLDivElement;

  onMount(() => createSortable(mainList));

  function createSortable(list: HTMLElement) {
    if (data.disabled) return;

    const sortable = new Sortable(list, {
      group: "fields",
      handle: ".handle",
      delay: 250,
      delayOnTouchOnly: true,
      onStart,
      onEnd,
      animation: 150,
      fallbackOnBody: true,
      swapThreshold: 0.65,
    });

    $effect(() => {
      return () => {
        sortable.destroy();
      };
    });
  }

  function onStart(event: Sortable.SortableEvent) {
    if (event.item.classList.contains("group")) {
      mainList.querySelectorAll(".group-fields").forEach((group) => {
        (group as HTMLElement).classList.add("hidden");
      });
    }
  }

  function onEnd(event: Sortable.SortableEvent) {
    mainList.querySelectorAll(".group-fields").forEach((group) => {
      (group as HTMLElement).classList.remove("hidden");
    });

    const oldIndex = event.oldIndex;
    const newIndex = event.newIndex;
    if (oldIndex == undefined || newIndex == undefined) {
      return;
    }

    const oldParent = detailedFields.get(Number(event.from.dataset.id));
    const newParent = detailedFields.get(Number(event.to.dataset.id));
    if (oldParent?.field.id == newParent?.field.id && oldIndex == newIndex) {
      return;
    }

    if (oldParent?.type == "single" || newParent?.type == "single") {
      return;
    }

    if (!oldParent && !newParent) {
      const fieldIds = structuredClone($state.snapshot(data.surveyRecord.fieldIds));
      fieldIds.splice(newIndex, 0, ...fieldIds.splice(oldIndex, 1));
      data = { ...data, surveyRecord: { ...data.surveyRecord, fieldIds } } as PageData;
      refresh();
    } else if (oldParent && newParent) {
      if (oldParent.field.id == newParent.field.id) {
        const fieldIds = structuredClone($state.snapshot(oldParent.field.fieldIds));
        fieldIds.splice(newIndex, 0, ...fieldIds.splice(oldIndex, 1));
        objectStore("fields", "readwrite").put({ ...$state.snapshot(oldParent.field), fieldIds }).onsuccess = refresh;
      } else {
        const oldFieldIds = structuredClone($state.snapshot(oldParent.field.fieldIds));
        const ids = oldFieldIds.splice(oldIndex, 1);
        const newFieldIds = structuredClone($state.snapshot(newParent.field.fieldIds));
        newFieldIds.splice(newIndex, 0, ...ids);
        const moveTransaction = transaction("fields", "readwrite");
        moveTransaction.oncomplete = refresh;
        const fieldStore = moveTransaction.objectStore("fields");
        fieldStore.put({ ...$state.snapshot(oldParent.field), fieldIds: oldFieldIds });
        fieldStore.put({ ...$state.snapshot(newParent.field), fieldIds: newFieldIds });
      }
    } else if (!oldParent && newParent) {
      const fieldIds = structuredClone($state.snapshot(data.surveyRecord.fieldIds));
      const ids = fieldIds.splice(oldIndex, 1);
      const newFieldIds = structuredClone($state.snapshot(newParent.field.fieldIds));
      newFieldIds.splice(newIndex, 0, ...ids);
      const moveTransaction = transaction(["surveys", "fields"], "readwrite");
      moveTransaction.oncomplete = refresh;
      data = { ...data, surveyRecord: { ...data.surveyRecord, fieldIds } } as PageData;
      moveTransaction.objectStore("surveys").put($state.snapshot(data.surveyRecord));
      moveTransaction.objectStore("fields").put({ ...$state.snapshot(newParent.field), fieldIds: newFieldIds });
    } else if (oldParent && !newParent) {
      const oldFieldIds = structuredClone($state.snapshot(oldParent.field.fieldIds));
      const ids = oldFieldIds.splice(oldIndex, 1);
      const fieldIds = structuredClone($state.snapshot(data.surveyRecord.fieldIds));
      fieldIds.splice(newIndex, 0, ...ids);
      const moveTransaction = transaction(["surveys", "fields"], "readwrite");
      moveTransaction.oncomplete = refresh;
      data = { ...data, surveyRecord: { ...data.surveyRecord, fieldIds } } as PageData;
      moveTransaction.objectStore("surveys").put($state.snapshot(data.surveyRecord));
      moveTransaction.objectStore("fields").put({ ...$state.snapshot(oldParent.field), fieldIds: oldFieldIds });
    }
  }

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

<div class="flex flex-col gap-6" style="view-transition-name:admin">
  <AdminHeader surveyRecord={data.surveyRecord} page="fields" />

  {#if data.disabled}
    <span>
      Can't edit fields: {data.entryRecords.length}
      {data.entryRecords.length == 1 ? "entry" : "entries"} exist.
    </span>
  {/if}

  <div bind:this={mainList} class="flex flex-col gap-4">
    {#if data.surveyRecord.fieldIds.length}
      {#key data.surveyRecord.fieldIds}
        {#each data.surveyRecord.fieldIds as fieldId (fieldId)}
          {@const detailedField = detailedFields.get(fieldId)}

          {#if detailedField?.type == "group"}
            <div data-id={fieldId} class="group flex flex-col gap-2">
              <h2 class="font-bold">{detailedField.field.name}</h2>

              {#if !data.disabled}
                <Button
                  disabled={data.disabled}
                  onclick={() => {
                    openDialog(ViewFieldDialog, {
                      surveyRecord: data.surveyRecord,
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
                  class="handle"
                >
                  <GroupIcon class="text-theme" />
                  Group
                </Button>
              {/if}

              <div use:createSortable data-id={fieldId} class="group-fields flex flex-col gap-2">
                {#key detailedField.field.fieldIds}
                  {#each detailedField.field.fieldIds as innerFieldId (innerFieldId)}
                    {@const detailedInnerField = detailedInnerFields.get(innerFieldId)}

                    {#if detailedInnerField}
                      {@const Icon = fieldIcons[detailedInnerField.field.type]}
                      <div data-parent-id={fieldId} data-id={innerFieldId} class="single flex flex-col">
                        <Button
                          disabled={data.disabled}
                          onclick={() => {
                            openDialog(ViewFieldDialog, {
                              surveyRecord: data.surveyRecord,
                              detailedInnerFields,
                              field: structuredClone($state.snapshot(detailedInnerField.field)),
                              parentField: structuredClone($state.snapshot(detailedField.field)),
                              onedit: refresh,
                              onmove: refresh,
                              onduplicate: refresh,
                              ondelete: refresh,
                            });
                          }}
                          class="handle"
                        >
                          <Icon class="text-theme" />
                          <div class="flex flex-col">
                            {detailedInnerField.field.name}
                            <small class="capitalize">{detailedInnerField.field.type}</small>
                          </div>
                        </Button>
                      </div>
                    {/if}
                  {/each}
                {/key}
              </div>

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
                  class="group-fields"
                >
                  <PlusIcon class="text-theme" />
                  New {detailedField.field.name} field
                </Button>
              {/if}
            </div>
          {:else if detailedField}
            {@const Icon = fieldIcons[detailedField.field.type]}

            <div data-id={fieldId} class="single flex flex-col">
              <Button
                disabled={data.disabled}
                onclick={() => {
                  openDialog(ViewFieldDialog, {
                    surveyRecord: data.surveyRecord,
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
                class="handle"
              >
                <Icon class="text-theme" />
                <div class="flex flex-col">
                  {detailedField.field.name}
                  <small class="capitalize">{detailedField.field.type}</small>
                </div>
              </Button>
            </div>
          {/if}
        {/each}
      {/key}
    {:else}
      No fields.
    {/if}
  </div>

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
        <PlusIcon class="text-theme" />
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
        <PlusIcon class="text-theme" />
        New field
      </Button>
    </div>
  {/if}
</div>
