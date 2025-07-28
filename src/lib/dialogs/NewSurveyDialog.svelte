<script lang="ts">
  import { goto } from "$app/navigation";
  import Button from "$lib/components/Button.svelte";
  import type { DialogExports } from "$lib/dialog";
  import { idb } from "$lib/idb";
  import { surveyTypes, type Survey, type SurveyType } from "$lib/survey";
  import { CircleCheckBigIcon, CircleIcon } from "@lucide/svelte";

  let {
    compId,
  }: {
    compId: string;
  } = $props();

  let name = $state("Match Survey");
  let type = $state<SurveyType>("match");
  let error = $state("");

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
          id: idb.generateId(),
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
          id: idb.generateId(),
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
        goto(`#/survey/${survey.id}/admin`);
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
  <input bind:value={name} class="text-theme bg-neutral-800 p-2" />
</label>

{#if error}
  <span>{error}</span>
{/if}
