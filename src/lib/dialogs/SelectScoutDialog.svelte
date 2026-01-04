<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import { slide } from "svelte/transition";

  let {
    scouts,
    prefilled,
    onselect,
  }: {
    scouts: string[];
    prefilled: string;
    onselect(scout: string): void;
  } = $props();

  let selectedScout = $state($state.snapshot(prefilled));
  let error = $state("");

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      if (error) return;

      selectedScout = selectedScout.trim();

      if (!selectedScout) {
        error = "No name inputted";
        return;
      }

      onselect(selectedScout);
      closeDialog();
    },
  };
</script>

<div class="flex flex-col">
  <label class="mb-3 flex flex-col">
    <span>Input your name</span>
    <input
      bind:value={selectedScout}
      oninput={() => {
        if (!selectedScout) error = "No name inputted";
        else error = "";
      }}
      class="bg-neutral-800 p-2 text-theme"
    />
  </label>

  {#if scouts.length}
    <div class="flex flex-col gap-3">
      {#if error}
        <span class="text-sm font-bold">Error: {error}</span>
      {:else}
        <span class="text-sm">Or, select your name below</span>
      {/if}

      <div class="@container -m-1 flex max-h-[400px] flex-col gap-2 overflow-auto p-1">
        {#each scouts as scout}
          {@const selected = scout == selectedScout}

          <Button
            onclick={() => {
              onselect(scout);
              closeDialog();
            }}
          >
            <div class="flex flex-col">
              <span class={[selected && "font-bold underline"]}>{scout}</span>
            </div>
          </Button>
        {/each}
      </div>
    </div>
  {:else if error}
    <span class="text-sm font-bold" transition:slide>Error: {error}</span>
  {/if}
</div>
