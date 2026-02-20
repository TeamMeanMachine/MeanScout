<script lang="ts">
  import { DownloadIcon, PlusIcon, ShareIcon } from "@lucide/svelte";
  import { page } from "$app/state";
  import Anchor from "$lib/components/Anchor.svelte";
  import Button from "$lib/components/Button.svelte";
  import { openDialog } from "$lib/dialog";
  import BulkExportDialog from "$lib/dialogs/BulkExportDialog.svelte";
  import BulkImportDialog from "$lib/dialogs/BulkImportDialog.svelte";
  import { onlineTransfer } from "$lib/online-transfer.svelte";
  import type { LayoutProps } from "./$types";

  let { data, children }: LayoutProps = $props();

  const showingNewPage = $derived(page.route.id == "/comp/[compId]/(main)/(entries)/new");

  const requestMessageCount = $derived(
    onlineTransfer.rtcMessages.filter((m) => m.type == "request" && m.request == "entries").length,
  );
  const responseMessageCount = $derived(onlineTransfer.rtcMessages.filter((m) => m.type == "response").length);
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
      <Anchor route="comp/{data.compRecord.id}/new" class={["w-20 flex-col gap-1!", showingNewPage ? "font-bold" : ""]}>
        <PlusIcon class="text-theme" />
        New
      </Anchor>

      <div class="flex flex-wrap gap-2">
        {#if data.entryRecords.some((e) => e.status != "draft")}
          <Button
            onclick={() => openDialog(BulkExportDialog, { send: "entries", entries: data.entryRecords })}
            class="relative w-20 flex-col gap-1!"
          >
            <ShareIcon class={["text-theme", requestMessageCount ? "animate-bounce" : "animate-none"]} />
            <span class={requestMessageCount ? "animate-pulse" : "animate-none"}>Send</span>
            {#if requestMessageCount}
              <span class="absolute top-0 right-0.5 text-xs font-bold tracking-tighter italic">
                {requestMessageCount}
              </span>
            {/if}
          </Button>
        {/if}
        <Button
          onclick={() => openDialog(BulkImportDialog, { existing: data.all, request: "entries" })}
          class="relative w-20 flex-col gap-1!"
        >
          <DownloadIcon class={["text-theme", responseMessageCount ? "animate-bounce-down" : "animate-none"]} />
          <span class={responseMessageCount ? "animate-pulse" : "animate-none"}>Receive</span>
          {#if responseMessageCount}
            <span class="absolute top-0 right-0.5 text-xs font-bold tracking-tighter italic">
              {responseMessageCount}
            </span>
          {/if}
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
