<script lang="ts">
  import { CircleCheckBigIcon, CircleIcon } from "@lucide/svelte";
  import { goto } from "$app/navigation";
  import Button from "$lib/components/Button.svelte";
  import type { DialogExports } from "$lib/dialog";
  import { idb } from "$lib/idb";
  import { surveyTypes, type Survey, type SurveyType } from "$lib/survey";

  let {
    compId,
  }: {
    compId: string;
  } = $props();

  let name = $state("Match Survey");
  let type = $state<SurveyType>("match");
  let id = $state("");
  let error = $state("");

  $effect(() => {
    id = compId + "-" + type;
  });

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      name = name.trim();
      if (!name) {
        error = "Name can't be blank!";
        return;
      }

      let survey: Survey;
      if (type == "match") {
        survey = {
          id,
          compId,
          name,
          type,
          fieldIds: [],
          expressions: [],
          pickLists: [],
          created: new Date(),
          modified: new Date(),
        };
      } else if (type == "pit") {
        survey = {
          id,
          compId,
          name,
          type,
          fieldIds: [],
          created: new Date(),
          modified: new Date(),
        };
      } else {
        error = "Invalid survey type!";
        return;
      }

      const addRequest = idb.add("surveys", survey);
      addRequest.onerror = () => {
        error = `Could not add survey: ${addRequest.error?.message}`;
      };

      addRequest.onsuccess = () => {
        goto(`#/survey/${survey.id}`);
      };
    },
  };
</script>

<span>New survey</span>

<div class="flex flex-col">
  <div class="flex flex-wrap gap-2">
    {#each surveyTypes as surveyType}
      <Button
        onclick={() => {
          type = surveyType;
          if (!name || name == "Match Survey" || name == "Pit Survey") {
            name = type == "pit" ? "Pit Survey" : "Match Survey";
          }
        }}
      >
        {#if type == surveyType}
          <CircleCheckBigIcon class="text-theme" />
        {:else}
          <CircleIcon class="text-theme" />
        {/if}
        <span class="capitalize {type == surveyType ? 'font-bold' : 'font-light'}">{surveyType}</span>
      </Button>
    {/each}
  </div>
</div>
<label class="flex flex-col">
  Name
  <input bind:value={name} class="bg-neutral-800 p-2 text-theme" />
</label>

<div class="flex flex-wrap items-end gap-2 text-sm">
  <label class="flex grow flex-col">
    ID
    <input bind:value={id} class="bg-neutral-800 p-2 text-theme" />
  </label>
  <div class="flex gap-2">
    <Button onclick={() => (id = compId + "-" + type)}>
      <span class={id == compId + "-" + type ? "font-bold" : "font-light"}>Default</span>
    </Button>
    <Button onclick={() => (id = idb.generateId({ randomChars: 0 }))}>
      <span class={id != compId + "-" + type ? "font-bold" : "font-light"}>Random</span>
    </Button>
  </div>
</div>

{#if error}
  <span>{error}</span>
{/if}
