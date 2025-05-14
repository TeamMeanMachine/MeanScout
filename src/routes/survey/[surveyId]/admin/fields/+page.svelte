<script lang="ts">
  import Sortable from "sortablejs";
  import Button from "$lib/components/Button.svelte";
  import { openDialog } from "$lib/dialog";
  import NewFieldDialog from "$lib/dialogs/NewFieldDialog.svelte";
  import ViewFieldDialog from "$lib/dialogs/ViewFieldDialog.svelte";
  import { fieldIcons, getDetailedNestedFields, type Field } from "$lib/field";
  import { objectStore, transaction } from "$lib/idb";
  import AdminHeader from "../AdminHeader.svelte";
  import type { PageData } from "./$types";
  import { GroupIcon, PlusIcon } from "@lucide/svelte";

  let {
    data,
  }: {
    data: PageData;
  } = $props();

  let surveyRecord = $state($state.snapshot(data.surveyRecord));

  let { detailedFields, detailedInnerFields } = $state(
    getDetailedNestedFields(surveyRecord.fieldIds, data.fieldRecords),
  );

  let mainList = $state<HTMLElement>();

  function createSortable(list: HTMLElement, groupId?: number) {
    if (data.disabled) return;

    if (!groupId) mainList = list;

    const sortable = new Sortable(list, {
      group: "fields",
      handle: ".handle",
      delay: 250,
      delayOnTouchOnly: true,
      onStart(event) {
        if (event.item.classList.contains("group")) {
          mainList?.querySelectorAll(".group-fields").forEach((group) => {
            (group as HTMLElement).classList.add("hidden");
          });
        }
      },
      onEnd() {
        mainList?.querySelectorAll(".group-fields").forEach((group) => {
          (group as HTMLElement).classList.remove("hidden");
        });
      },
      animation: 150,
      fallbackOnBody: true,
      swapThreshold: 0.65,
      store: {
        get: () => [],
        set(sortable) {
          const order = sortable.toArray().map((id) => Number(id));
          if (groupId) {
            const group = detailedFields.get(groupId);
            if (!group || group.type != "group") {
              console.error(`group ${groupId} not found`);
              return;
            }
            group.field.fieldIds = order;
            objectStore("fields", "readwrite").put($state.snapshot(group.field));
            updateAndRefresh();
          } else {
            surveyRecord.fieldIds = order;
            updateAndRefresh();
          }
        },
      },
    });

    $effect(() => {
      return () => {
        sortable.destroy();
        if (!groupId) mainList = undefined;
      };
    });
  }

  function updateAndRefresh() {
    surveyRecord.modified = new Date();
    objectStore("surveys", "readwrite").put($state.snapshot(surveyRecord));

    const refreshTransaction = transaction("fields");
    refreshTransaction.onabort = () => {
      location.reload();
    };

    const fieldsRequest = refreshTransaction.objectStore("fields").index("surveyId").getAll(surveyRecord.id);
    fieldsRequest.onsuccess = () => {
      ({ detailedFields, detailedInnerFields } = getDetailedNestedFields(surveyRecord.fieldIds, fieldsRequest.result));
    };
  }

  function onclickField(field: IDBRecord<Field>) {
    openDialog(ViewFieldDialog, {
      surveyRecord,
      detailedInnerFields,
      field: structuredClone($state.snapshot(field)),
      onedit: updateAndRefresh,
      onmove(index, by) {
        const fieldIds = structuredClone($state.snapshot(surveyRecord.fieldIds));
        fieldIds.splice(index + by, 0, ...fieldIds.splice(index, 1));
        surveyRecord.fieldIds = fieldIds;
        updateAndRefresh();
      },
      onduplicate(index, id) {
        surveyRecord.fieldIds = surveyRecord.fieldIds.toSpliced(index + 1, 0, id);
        updateAndRefresh();
      },
      ondelete() {
        surveyRecord.fieldIds = surveyRecord.fieldIds.filter((id) => field.id != id);
        updateAndRefresh();
      },
    });
  }
</script>

<div class="flex flex-col gap-6" style="view-transition-name:admin">
  <AdminHeader {surveyRecord} page="fields" />

  {#if data.disabled}
    <span>
      Can't edit fields: {data.entryRecords.length}
      {data.entryRecords.length == 1 ? "entry" : "entries"} exist.
    </span>
  {/if}

  {#if surveyRecord.fieldIds.length}
    {#key surveyRecord.fieldIds}
      {@const fields = surveyRecord.fieldIds.map((id) => detailedFields.get(id)).filter((f) => f !== undefined)}

      <div use:createSortable class="flex flex-col gap-4">
        {#each fields as { field } (field.id)}
          <div data-id={field.id} class="{field.type} flex flex-col gap-2">
            {#if field.type == "group"}
              <h2 class="font-bold">{field.name}</h2>

              {#if !data.disabled}
                <Button disabled={data.disabled} onclick={() => onclickField(field)} class="handle">
                  <GroupIcon class="text-theme" />
                  Group
                </Button>
              {/if}

              {#key field.fieldIds}
                {@const innerFields = field.fieldIds
                  .map((id) => detailedInnerFields.get(id))
                  .filter((f) => f !== undefined)}

                <div use:createSortable={field.id} data-id={field.id} class="group-fields flex flex-col gap-2">
                  {#each innerFields as innerField (innerField.field.id)}
                    {@const Icon = fieldIcons[innerField.field.type]}

                    <div data-id={innerField.field.id} class="single flex flex-col">
                      <Button
                        disabled={data.disabled}
                        onclick={() => {
                          openDialog(ViewFieldDialog, {
                            surveyRecord: surveyRecord,
                            detailedInnerFields,
                            field: structuredClone($state.snapshot(innerField.field)),
                            parentField: structuredClone($state.snapshot(field)),
                            onedit: updateAndRefresh,
                            onmove: updateAndRefresh,
                            onduplicate: updateAndRefresh,
                            ondelete: updateAndRefresh,
                          });
                        }}
                        class="handle"
                      >
                        <Icon class="text-theme" />
                        <div class="flex flex-col">
                          {innerField.field.name}
                          <small class="capitalize">{innerField.field.type}</small>
                        </div>
                      </Button>
                    </div>
                  {/each}
                </div>
              {/key}

              {#if !data.disabled}
                <Button
                  disabled={data.disabled}
                  onclick={() => {
                    openDialog(NewFieldDialog, {
                      surveyRecord: surveyRecord,
                      parentField: structuredClone($state.snapshot(field)),
                      type: "field",
                      oncreate: updateAndRefresh,
                    });
                  }}
                  class="group-fields"
                >
                  <PlusIcon class="text-theme" />
                  New {field.name} field
                </Button>
              {/if}
            {:else}
              {@const Icon = fieldIcons[field.type]}

              <Button disabled={data.disabled} onclick={() => onclickField(field)} class="handle">
                <Icon class="text-theme" />
                <div class="flex flex-col">
                  {field.name}
                  <small class="capitalize">{field.type}</small>
                </div>
              </Button>
            {/if}
          </div>
        {/each}
      </div>
    {/key}
  {:else}
    No fields.
  {/if}

  {#if !data.disabled}
    <div class="flex flex-wrap gap-2">
      <Button
        onclick={() => {
          openDialog(NewFieldDialog, {
            surveyRecord: surveyRecord,
            type: "group",
            oncreate(id) {
              surveyRecord.fieldIds = [...surveyRecord.fieldIds, id];
              updateAndRefresh();
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
            surveyRecord: surveyRecord,
            type: "field",
            oncreate(id) {
              surveyRecord.fieldIds = [...surveyRecord.fieldIds, id];
              updateAndRefresh();
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
