<script lang="ts">
  import { CircleCheckBigIcon, CircleIcon, LoaderIcon } from "@lucide/svelte";
  import Button from "$lib/components/Button.svelte";
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import { teamStore } from "$lib/settings";
  import { tbaEventExists, tbaGetTeamEvents } from "$lib/tba";
  import { onMount } from "svelte";

  let {
    tbaEventKey,
    onedit,
  }: {
    tbaEventKey?: string | undefined;
    onedit: (tbaEventKey: string) => void;
  } = $props();

  let event = $state(tbaEventKey ?? "");
  let error = $state("");
  let events = $state<{ name: string; key: string }[]>([]);

  let isLoadingEvents = $state(!!$teamStore);

  onMount(() => {
    if (!$teamStore) return;
    tbaGetTeamEvents($teamStore)
      .then((response) => {
        if (response.events) {
          events = response.events;
        } else if (response.error) {
          error = response.error;
        }
      })
      .finally(() => (isLoadingEvents = false));
  });

  export const { onconfirm }: DialogExports = {
    async onconfirm() {
      event = event.trim();

      if (!event) {
        onedit(event);
        closeDialog();
        return;
      }

      const eventNotFound = events.every((e) => e.key != event);

      if (eventNotFound && !(await tbaEventExists(event))) {
        error = "could not find event";
        return;
      }

      onedit(event);
      closeDialog();
    },
  };
</script>

<div class="flex flex-wrap justify-between gap-2">
  <span>Choose TBA event</span>
  {#if isLoadingEvents}
    <LoaderIcon class="animate-spin text-theme" />
  {/if}
</div>

{#if events.length}
  <div class="-m-1 flex max-h-[500px] flex-col gap-2 overflow-auto p-1">
    {#each events as { name, key }}
      {@const font = event == key ? "font-bold" : "font-light"}
      <Button onclick={() => (event = key)} class={font}>
        {#if event == key}
          <CircleCheckBigIcon class="size-5 text-theme" />
        {:else}
          <CircleIcon class="size-5 text-theme" />
        {/if}
        <span class="text-sm">{name}</span>
      </Button>
    {/each}
  </div>
{/if}

{#if !isLoadingEvents}
  <label class="flex flex-col">
    <span>Event key</span>
    <input bind:value={event} class="bg-neutral-800 p-2 text-theme" />
    <span class="pt-1 text-xs">Tip: you can input any TBA event key.</span>
  </label>
{/if}

{#if error}
  <span>Error: {error}</span>
{/if}
