<script lang="ts">
  import { CheckIcon, CircleCheckBigIcon, CircleIcon, LoaderIcon, XIcon } from "@lucide/svelte";
  import Button from "$lib/components/Button.svelte";
  import { Dialog } from "$lib/dialog";
  import { teamStore } from "$lib/settings";
  import { TBA } from "$lib/tba";
  import type { components } from "$lib/tba/schema";
  import { onMount, untrack } from "svelte";

  let {
    current,
    onselect,
  }: {
    current?: string | undefined;
    onselect: (tbaEvent?: components["schemas"]["Event"] | undefined) => void;
  } = $props();

  const ctx = Dialog.getContext();

  // svelte-ignore state_referenced_locally
  let key = $state(current ?? "");
  let error = $state("");
  let tbaEvents = $state<components["schemas"]["Event"][]>([]);

  let loading = $state(!!$teamStore);

  onMount(() => {
    if (!$teamStore) return;
    TBA.GET("/team/{team_key}/events", { params: { path: { team_key: `frc${parseInt($teamStore)}` } } })
      .then((response) => {
        const lastYear = new Date().getFullYear() - 1;
        const events = response.data?.filter((e) => e.year >= lastYear).toReversed();
        if (events?.length) {
          tbaEvents = events;
        } else if (response.error) {
          error = response.error.Error;
        }
      })
      .finally(() => (loading = false));
  });

  export const { onformsubmit }: Dialog.Exports = {
    onformsubmit() {
      key = key.trim();
      if (!key) {
        onselect();
        ctx.close();
        return;
      }

      let event = tbaEvents.find((e) => e.key === key);
      if (event) {
        onselect(event);
        ctx.close();
        return;
      }

      loading = true;
      TBA.GET("/event/{event_key}", { params: { path: { event_key: key } } })
        .then((response) => {
          if (!response.data) {
            error = "could not find event";
            return;
          }
          onselect(response.data);
          ctx.close();
        })
        .catch(() => (error = "could not find event"))
        .finally(() => (loading = false));
    },
  };
</script>

<div class="flex items-center justify-between border-b border-neutral-600 p-3">
  <div class="flex gap-2">
    <span class="font-bold">Choose TBA event</span>
    {#if loading}
      <LoaderIcon class="animate-spin text-theme" />
    {/if}
  </div>
  <Button onclick={ctx.close}>
    <XIcon class="size-5 text-theme" />
  </Button>
</div>

<div class="flex h-52 flex-col gap-2 overflow-y-auto border-b border-neutral-600 p-3">
  {#each tbaEvents as tbaEvent (tbaEvent.key)}
    {const selected = $derived(key == tbaEvent.key)}
    {const font = $derived(selected ? "font-bold" : "font-light")}
    <Button
      {@attach (btn) => {
        untrack(() => selected) && btn.scrollIntoView({ block: "center", inline: "center" });
      }}
      onclick={() => {
        if (selected) {
          onformsubmit();
        }
        key = tbaEvent.key;
      }}
      class={font}
    >
      {#if selected}
        <CircleCheckBigIcon class="size-5 text-theme" />
      {:else}
        <CircleIcon class="size-5 text-neutral-500" />
      {/if}
      <div class="flex flex-col">
        <span class="text-sm">{tbaEvent.year} {tbaEvent.short_name || tbaEvent.name}</span>
        <span class="text-xs font-light">{tbaEvent.event_type_string}</span>
      </div>
    </Button>
  {/each}
  {#if !$teamStore}
    <span class="text-xs font-light">Enter your team in settings to get event suggestions</span>
  {/if}
</div>

<div class="flex flex-col gap-2 p-3">
  <label class="flex flex-col">
    <span>Event key</span>
    <input bind:value={key} class="bg-neutral-800 p-2 text-theme" />
    <span class="pt-1 text-xs">Tip: you can input any TBA event key.</span>
  </label>

  {#if error}
    <span>Error: {error}</span>
  {/if}
</div>

<div class="border-t border-neutral-600 p-3">
  <Button type="submit">
    <CheckIcon class="text-theme" /> Select
  </Button>
</div>
