<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import { objectStore } from "$lib/idb";
  import type { PageData } from "./$types";
  import AdminHeader from "../AdminHeader.svelte";
  import { openDialog } from "$lib/dialog";
  import NewScoutsDialog from "$lib/dialogs/NewScoutsDialog.svelte";
  import { PlusIcon } from "@lucide/svelte";

  let {
    data,
  }: {
    data: PageData;
  } = $props();
</script>

<div class="flex flex-col gap-6" style="view-transition-name:admin">
  <AdminHeader surveyRecord={data.surveyRecord} page="scouts" />

  <div class="flex flex-col gap-3">
    {#if !data.surveyRecord.scouts}
      <Button
        onclick={() => {
          data = {
            ...data,
            surveyRecord: {
              ...data.surveyRecord,
              scouts: [],
              modified: new Date(),
            },
          } as PageData;
          objectStore("surveys", "readwrite").put($state.snapshot(data.surveyRecord));
        }}
      >
        Enable scout names and prediction
      </Button>
    {/if}

    {#if data.surveyRecord.scouts?.length}
      <div class="flex flex-col gap-2">
        {#each [...new Set(data.surveyRecord.scouts)].toSorted() as scout (scout)}
          <Button
            onclick={() => {
              data = {
                ...data,
                surveyRecord: {
                  ...data.surveyRecord,
                  scouts: data.surveyRecord.scouts?.filter((s) => s != scout),
                  modified: new Date(),
                },
              } as PageData;
              objectStore("surveys", "readwrite").put($state.snapshot(data.surveyRecord));
            }}
          >
            {scout}
          </Button>
        {/each}
      </div>
    {/if}

    {#if data.surveyRecord.scouts}
      <div
        class="sticky bottom-3 z-20 ml-2 flex flex-col self-start border border-neutral-500 bg-neutral-900 p-2 shadow-2xl"
      >
        <Button
          onclick={() => {
            if (!data.surveyRecord.scouts) return;
            openDialog(NewScoutsDialog, {
              scouts: data.surveyRecord.scouts,
              onadd(scouts) {
                data = {
                  ...data,
                  surveyRecord: {
                    ...data.surveyRecord,
                    scouts: [...(data.surveyRecord.scouts || []), ...scouts],
                    modified: new Date(),
                  },
                } as PageData;
                objectStore("surveys", "readwrite").put($state.snapshot(data.surveyRecord));
              },
            });
          }}
          class="text-sm"
        >
          <PlusIcon class="text-theme size-5" />
          New scout(s)
        </Button>
      </div>
    {/if}
  </div>
</div>
