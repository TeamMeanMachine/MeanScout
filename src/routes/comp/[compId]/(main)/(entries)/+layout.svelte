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

  const drafts = $derived(data.entryRecords.filter((e) => e.status == "draft"));
  const unexported = $derived(data.entryRecords.filter((e) => e.status == "submitted"));
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
            <ShareIcon
              class={["text-theme", onlineTransfer.requestsFromClients.size ? "animate-bounce" : "animate-none"]}
            />
            <span class={onlineTransfer.requestsFromClients.size ? "animate-pulse" : "animate-none"}>Send</span>
            {#if onlineTransfer.requestsFromClients.size}
              <span class="absolute top-0 right-0.5 text-xs font-bold tracking-tighter italic">
                {onlineTransfer.requestsFromClients.size}
              </span>
            {/if}
          </Button>
        {/if}
        <Button
          onclick={() => openDialog(BulkImportDialog, { existing: data.all, request: "entries" })}
          class="relative w-20 flex-col gap-1!"
        >
          <DownloadIcon
            class={["text-theme", onlineTransfer.dataFromClients.size ? "animate-bounce-down" : "animate-none"]}
          />
          <span class={onlineTransfer.dataFromClients.size ? "animate-pulse" : "animate-none"}>Receive</span>
          {#if onlineTransfer.dataFromClients.size}
            <span class="absolute top-0 right-0.5 text-xs font-bold tracking-tighter italic">
              {onlineTransfer.dataFromClients.size}
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
            <div class="flex flex-col">
              <span>Group by <span class="capitalize">{group}</span></span>
              {#if group == "status" && (drafts.length || unexported.length)}
                <div class="flex gap-2 text-xs font-bold">
                  {#if drafts.length}
                    <span>Drafts: {drafts.length}</span>
                  {/if}
                  {#if unexported.length}
                    <span>Ready to export: {unexported.length}</span>
                  {/if}
                </div>
              {/if}
            </div>
          </Anchor>
        {/each}
      </div>
    {/if}
  </div>
</div>

{@render children()}
