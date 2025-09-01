<script lang="ts">
  import Sortable from "sortablejs";
  import Button from "$lib/components/Button.svelte";
  import { openDialog } from "$lib/dialog";
  import EditFieldDialog from "$lib/dialogs/EditFieldDialog.svelte";
  import NewFieldDialog from "$lib/dialogs/NewFieldDialog.svelte";
  import { fieldIcons, fieldTypes, type Field, type GroupField } from "$lib/field";
  import { idb } from "$lib/idb";
  import type { PageProps } from "./$types";
  import { invalidateAll } from "$app/navigation";

  let { data }: PageProps = $props();

  let surveyRecord = $state($state.snapshot(data.survey.record));

  let topLevelFields = $derived(
    surveyRecord.fieldIds.map((id) => data.fieldRecords.find((f) => f.id == id)).filter((f) => f !== undefined),
  );

  let groups = $derived(
    surveyRecord.fieldIds
      .map((id) => data.fieldRecords.find((f) => f.id == id))
      .filter((f) => f !== undefined && f.type == "group"),
  );
  let groupSelect = $state("");

  let sortUpdateQueue: Function[] = [];
  let sortUpdateTimeout: number | undefined = undefined;

  $effect(() => {
    if (!groups || !groupSelect || !groups.some((g) => g.id == groupSelect)) {
      groupSelect = "";
    }
  });

  function createSortable(list: HTMLElement, groupId?: string) {
    const sortable = new Sortable(list, {
      group: {
        name: "fields",
        pull(to, _, dragEl) {
          if (dragEl.classList.contains("group")) {
            return to.el.classList.contains("top-level");
          }
          return true;
        },
        put(to, _, dragEl) {
          if (groups.length && !dragEl.classList.contains("group") && to.el.classList.contains("top-level")) {
            return false;
          }
          if (dragEl.classList.contains("group")) {
            return to.el.classList.contains("top-level");
          }
          return true;
        },
      },
      onEnd(event) {
        if (event.to.classList.contains("group-list") && event.to.dataset.id) {
          groupSelect = event.to.dataset.id;
        } else if (!event.item.classList.contains("group")) {
          groupSelect = "";
        } else if (event.item.classList.contains("group") && event.item.dataset.id) {
          groupSelect = event.item.dataset.id;
        }
      },
      handle: ".handle",
      delay: 250,
      delayOnTouchOnly: true,
      animation: 150,
      fallbackOnBody: true,
      store: {
        get: () => [],
        set(sortable) {
          const order = sortable.toArray();
          if (groupId) {
            const group = data.fieldRecords.find((f) => f.id == groupId);
            if (!group || group.type != "group") {
              console.error(`group ${groupId} not found`);
              return;
            }
            sortUpdateQueue.push(() => {
              group.fieldIds = order;
              idb.put("fields", $state.snapshot(group));
            });
            if (!sortUpdateTimeout) sortUpdateTimeout = window.setTimeout(updateAndRefresh, 10);
          } else {
            sortUpdateQueue.push(() => {
              surveyRecord.fieldIds = order;
            });
            if (!sortUpdateTimeout) sortUpdateTimeout = window.setTimeout(updateAndRefresh, 10);
          }
        },
      },
    });

    $effect(() => {
      return () => {
        sortable.destroy();
      };
    });
  }

  function updateAndRefresh() {
    window.clearTimeout(sortUpdateTimeout);
    sortUpdateTimeout = undefined;

    if (sortUpdateQueue.length) {
      for (const update of sortUpdateQueue) {
        update();
      }
      sortUpdateQueue = [];
    }

    surveyRecord.modified = new Date();
    idb.put("surveys", $state.snapshot(surveyRecord)).onsuccess = invalidateAll;
  }

  function onclickTopLevelField(field: Field) {
    if (field.type == "group") {
      groupSelect = field.id;
    } else {
      groupSelect = "";
    }

    openDialog(EditFieldDialog, {
      surveyRecord,
      fieldRecords: data.fieldRecords,
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
        groupSelect = id;
      },
      ondelete() {
        surveyRecord.fieldIds = surveyRecord.fieldIds.filter((id) => field.id != id);
        groupSelect = "";
        updateAndRefresh();
      },
    });
  }

  function onclickNestedField(nestedField: Field, field: GroupField) {
    groupSelect = field.id;

    openDialog(EditFieldDialog, {
      surveyRecord,
      fieldRecords: data.fieldRecords,
      field: structuredClone($state.snapshot(nestedField)),
      parentField: structuredClone($state.snapshot(field)),
      onedit: updateAndRefresh,
      onmove: updateAndRefresh,
      onduplicate: updateAndRefresh,
      ondelete: updateAndRefresh,
    });
  }
</script>

<div class="flex flex-col gap-6">
  {#if data.disabled}
    <span class="text-sm">
      Can't edit fields: {data.survey.entryRecords.length}
      {data.survey.entryRecords.length == 1 ? "entry" : "entries"} exist.
    </span>
  {:else}
    {#if surveyRecord.fieldIds.length}
      <!--
        Janky way to fix compatibility issues with SortableJS and Svelte.
        This will destroy and recreate instances of sortable objects when anything changes.
        It will also destroy any leftovers that Svelte doesn't act upon (e.g. clones, ghost elements).
      -->
      {#key [surveyRecord.fieldIds, data.fieldRecords, topLevelFields]}
        <div use:createSortable class="top-level flex flex-col gap-6 pb-3">
          {#each topLevelFields as field (field.id)}
            {@const Icon = fieldIcons[field.type]}

            <div data-id={field.id} class={["flex flex-col gap-3", field.type == "group" && "group"]}>
              {#if field.type == "group"}
                <div class="flex flex-col">
                  <h2 class={groupSelect == field.id ? "font-bold" : "font-light"}>{field.name}</h2>

                  <div class="flex w-full gap-3">
                    <Button onclick={() => onclickTopLevelField(field)} class="handle">
                      <Icon class="text-theme" />
                    </Button>

                    <!--
                      Prevents "illegal invocation" errors and flashes of partial sort updates.
                      I thought using the top level key block would do the job for the nested fields,
                      but that's not the case.
                    -->
                    {#key field.fieldIds}
                      {@const nestedFields = field.fieldIds
                        .map((id) => data.fieldRecords.find((f) => f.id == id))
                        .filter((f) => f !== undefined)}

                      <div
                        use:createSortable={field.id}
                        data-id={field.id}
                        class="group-list flex grow flex-wrap gap-2"
                      >
                        {#each nestedFields as nestedField (nestedField.id)}
                          {@const NestedIcon = fieldIcons[nestedField.type]}

                          <div data-id={nestedField.id} class="flex flex-col">
                            <Button
                              onclick={() => onclickNestedField(nestedField, field)}
                              class="handle self-start text-sm"
                            >
                              <NestedIcon class="text-theme" />
                              {nestedField.name}
                            </Button>
                          </div>
                        {/each}
                      </div>
                    {/key}
                  </div>
                </div>
              {:else}
                <Button onclick={() => onclickTopLevelField(field)} class="handle self-start text-sm">
                  <Icon class="text-theme" />
                  {field.name}
                </Button>
              {/if}
            </div>
          {/each}
        </div>
      {/key}
    {/if}

    <div class="sticky bottom-3 z-20 flex flex-col self-start border border-neutral-500 bg-neutral-900 p-2 shadow-2xl">
      <span class="w-full text-sm">New</span>

      <div class="flex flex-wrap gap-2">
        {#each fieldTypes as fieldType}
          {@const Icon = fieldIcons[fieldType]}
          <Button
            onclick={() => {
              const groups =
                fieldType == "group"
                  ? undefined
                  : surveyRecord.fieldIds
                      .map((id) => data.fieldRecords.find((f) => f.id == id))
                      .filter((f) => f !== undefined && f.type == "group");

              const fixedGroupSelect = groups?.length
                ? groups.some((g) => g.id == groupSelect)
                  ? groupSelect
                  : groups[0].id
                : "";

              openDialog(NewFieldDialog, {
                surveyRecord,
                type: fieldType,
                groups,
                groupSelect: fixedGroupSelect,
                oncreate(id, parentId) {
                  if (!parentId) {
                    surveyRecord.fieldIds = [...surveyRecord.fieldIds, id];
                  }
                  updateAndRefresh();
                  if (fieldType == "group") {
                    groupSelect = id;
                  } else if (parentId) {
                    groupSelect = parentId;
                  } else {
                    groupSelect = "";
                  }
                },
              });
            }}
            class="flex-col sm:min-w-16"
          >
            <Icon class="text-theme" />
            <span class="hidden text-xs capitalize sm:block">{fieldType}</span>
          </Button>
        {/each}
      </div>
    </div>

    <span class="text-xs">Tip: you can drag and drop fields and groups!</span>
  {/if}
</div>
