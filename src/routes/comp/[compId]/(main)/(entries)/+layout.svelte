<script lang="ts">
  import { DownloadIcon, PlusIcon, ShareIcon } from "@lucide/svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { rerunAllContextLoads } from "$lib";
  import Anchor from "$lib/components/Anchor.svelte";
  import Button from "$lib/components/Button.svelte";
  import { openDialog } from "$lib/dialog";
  import BulkExportDialog from "$lib/dialogs/BulkExportDialog.svelte";
  import ImportEntriesDialog from "$lib/dialogs/ImportEntriesDialog.svelte";
  import type { Entry } from "$lib/entry";
  import { idb } from "$lib/idb";
  import type { LayoutProps } from "./$types";

  let { data, children }: LayoutProps = $props();

  const showingNewPage = $derived(page.route.id == "/comp/[compId]/(main)/(entries)/new");

  function onbulkexport(exportedEntries: Entry[]) {
    const tx = idb.transaction(["comps", "entries"], "readwrite");
    const entryStore = tx.objectStore("entries");
    for (const entry of $state.snapshot(exportedEntries)) {
      if (entry.status == "exported") {
        continue;
      }
      entryStore.put({ ...entry, status: "exported", modified: new Date() });
    }
    tx.objectStore("comps").put({ ...$state.snapshot(data.compRecord), modified: new Date() });
    tx.oncomplete = rerunAllContextLoads;
  }

  function refresh() {
    idb.put("comps", { ...$state.snapshot(data.compRecord), modified: new Date() }).onsuccess = rerunAllContextLoads;
  }
</script>

<div
  class={[
    "lg:fixed lg:top-[57px] lg:h-[calc(100vh-57px)] lg:w-80 lg:overflow-y-auto lg:overscroll-y-contain lg:border-r lg:border-neutral-600",
    "max-lg:mx-auto max-lg:w-full max-lg:max-w-(--breakpoint-lg)",
    data.groupBy || showingNewPage ? "max-lg:hidden" : "max-lg:mb-[65px]",
  ]}
>
  <div class="flex flex-col gap-3 px-3 py-6 max-lg:mt-[57px]">
    <h2 class="font-bold">Entries</h2>

    <div class="flex flex-wrap justify-between gap-3 text-sm">
      <Button
        onclick={() => {
          if (showingNewPage) {
            sessionStorage.removeItem("new-entry");
            goto(`#/comp/${data.compRecord.id}`);
          } else {
            goto(`#/comp/${data.compRecord.id}/new`);
          }
        }}
        class={["w-20 flex-col gap-1!", showingNewPage ? "font-bold" : ""]}
      >
        <PlusIcon class="text-theme transition-[rotate] {showingNewPage ? 'rotate-45' : 'rotate-0'}" />
        {showingNewPage ? "Cancel" : "New"}
      </Button>

      <div class="flex flex-wrap gap-2">
        {#if data.entryRecords.some((e) => e.status != "draft")}
          <Button
            onclick={() => {
              const entries = data.entryRecords.filter((e) => e.status != "draft");
              openDialog(BulkExportDialog, {
                entries,
                onexport: () => onbulkexport(entries),
              });
            }}
            class="w-20 flex-col gap-1!"
          >
            <ShareIcon class="text-theme" />
            Send
          </Button>
        {/if}
        <Button
          onclick={() => {
            openDialog(ImportEntriesDialog, {
              surveyRecords: data.surveyRecords,
              existingEntries: data.entryRecords,
              onimport: refresh,
            });
          }}
          class="w-20 flex-col gap-1!"
        >
          <DownloadIcon class="text-theme" />
          Receive
        </Button>
      </div>
    </div>

    {#if data.entryRecords.length}
      <div class="flex flex-col gap-2">
        {#each ["status", "survey", "match", "team", "scout", "target", "absent"] as group}
          <Anchor
            route="comp/{data.compRecord.id}/entries/{group}"
            class={data.groupBy == group ? "font-bold" : "font-light"}
          >
            Group by <span class="capitalize">{group}</span>
          </Anchor>
        {/each}
      </div>
    {/if}
  </div>
</div>

{@render children()}
