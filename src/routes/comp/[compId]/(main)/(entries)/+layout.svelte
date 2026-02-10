<script lang="ts">
  import { DownloadIcon, PlusIcon, ShareIcon } from "@lucide/svelte";
  import { page } from "$app/state";
  import Anchor from "$lib/components/Anchor.svelte";
  import { onlineTransfer } from "$lib/online-transfer.svelte";
  import type { LayoutProps } from "./$types";

  let { data, children }: LayoutProps = $props();

  const showingNewPage = $derived(page.route.id == "/comp/[compId]/(main)/(entries)/new");
  const showingSendPage = $derived(page.route.id == "/comp/[compId]/(main)/(entries)/send");
  const showingReceivePage = $derived(page.route.id == "/comp/[compId]/(main)/(entries)/receive");

  const showingSubpage = $derived(showingNewPage || showingSendPage || showingReceivePage);

  const requestMessageCount = $derived(
    onlineTransfer.rtcMessages.filter((m) => m.type == "request" && m.request == "entries").length,
  );
  const responseMessageCount = $derived(
    onlineTransfer.rtcMessages.filter((m) => m.type == "response" && m.entries?.length).length,
  );
</script>

<div
  class={[
    "lg:fixed lg:top-[57px] lg:h-[calc(100vh-57px)] lg:w-80 lg:overflow-y-auto lg:overscroll-y-contain lg:border-r lg:border-neutral-600",
    "max-lg:mx-auto max-lg:w-full max-lg:max-w-(--breakpoint-lg)",
    data.groupBy || showingSubpage ? "max-lg:hidden" : "max-lg:mb-[65px]",
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
          <Anchor
            route="comp/{data.compRecord.id}/send"
            class={["relative w-20 flex-col gap-1!", showingSendPage ? "font-bold" : ""]}
          >
            <ShareIcon class="text-theme" />
            Send
            {#if requestMessageCount}
              <span class="absolute top-0 right-0.5 text-xs font-bold tracking-tighter italic">
                {requestMessageCount}
              </span>
            {/if}
          </Anchor>
        {/if}
        <Anchor
          route="comp/{data.compRecord.id}/receive"
          class={["relative w-20 flex-col gap-1!", showingReceivePage ? "font-bold" : ""]}
        >
          <DownloadIcon class="text-theme" />
          Receive
          {#if responseMessageCount}
            <span class="absolute top-0 right-0.5 text-xs font-bold tracking-tighter italic">
              {responseMessageCount}
            </span>
          {/if}
        </Anchor>
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
