<script lang="ts">
  import { goto } from "$app/navigation";
  import type { DialogExports } from "$lib/dialog";
  import { objectStore } from "$lib/idb";
  import { surveyTypes, type Survey, type SurveyType } from "$lib/survey";

  let name = $state("");
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
          name,
          type,
          fieldIds: [],
          matches: [],
          teams: [],
          expressions: [],
          pickLists: [],
          created: new Date(),
          modified: new Date(),
        };
      } else if (type == "pit") {
        survey = {
          name,
          type,
          fieldIds: [],
          matches: [],
          teams: [],
          created: new Date(),
          modified: new Date(),
        };
      } else {
        error = "Invalid survey type!";
        return;
      }

      const addRequest = objectStore("surveys", "readwrite").add(survey);
      addRequest.onerror = () => {
        error = `Could not add survey: ${addRequest.error?.message}`;
      };

      addRequest.onsuccess = () => {
        const id = addRequest.result;
        if (id == undefined) {
          error = "Could not add survey";
          return;
        }

        goto(`#/survey/${id}/admin`);
      };
    },
  };
</script>

<span>New survey</span>

<label class="flex flex-col">
  Survey name
  <input bind:value={name} class="text-theme bg-neutral-800 p-2" />
</label>
<label class="flex flex-col">
  Survey type
  <select bind:value={type} class="text-theme bg-neutral-800 p-2 capitalize">
    {#each surveyTypes as surveyType}
      <option>{surveyType}</option>
    {/each}
  </select>
</label>

{#if error}
  <span>{error}</span>
{/if}
