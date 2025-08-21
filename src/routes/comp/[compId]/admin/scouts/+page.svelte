<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import { idb } from "$lib/idb";
  import type { PageProps } from "./$types";
  import CompAdminHeader from "../CompAdminHeader.svelte";
  import { openDialog } from "$lib/dialog";
  import NewScoutsDialog from "$lib/dialogs/NewScoutsDialog.svelte";
  import { PlusIcon } from "@lucide/svelte";

  let { data }: PageProps = $props();
</script>

<div class="flex flex-col gap-6" style="view-transition-name:admin">
  <CompAdminHeader compRecord={data.compRecord} page="scouts" />

  <div class="flex flex-col gap-3">
    {#if !data.compRecord.scouts}
      <Button
        onclick={() => {
          data = {
            ...data,
            compRecord: {
              ...data.compRecord,
              scouts: [],
              modified: new Date(),
            },
          };
          idb.put("comps", $state.snapshot(data.compRecord));
        }}
      >
        Enable scout names and prediction
      </Button>
    {/if}

    {#if data.compRecord.scouts?.length}
      <div class="flex flex-col gap-2">
        {#each [...new Set(data.compRecord.scouts)].toSorted() as scout (scout)}
          <Button
            onclick={() => {
              data = {
                ...data,
                compRecord: {
                  ...data.compRecord,
                  scouts: data.compRecord.scouts?.filter((s) => s != scout),
                  modified: new Date(),
                },
              };
              idb.put("comps", $state.snapshot(data.compRecord));
            }}
          >
            {scout}
          </Button>
        {/each}
      </div>
    {/if}

    {#if data.compRecord.scouts}
      <div
        class="sticky bottom-3 z-20 ml-2 flex flex-col self-start border border-neutral-500 bg-neutral-900 p-2 shadow-2xl"
      >
        <Button
          onclick={() => {
            if (!data.compRecord.scouts) return;
            openDialog(NewScoutsDialog, {
              scouts: data.compRecord.scouts,
              onadd(scouts) {
                data = {
                  ...data,
                  compRecord: {
                    ...data.compRecord,
                    scouts: [...(data.compRecord.scouts || []), ...scouts],
                    modified: new Date(),
                  },
                };
                idb.put("comps", $state.snapshot(data.compRecord));
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
