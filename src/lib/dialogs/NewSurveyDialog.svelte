<script lang="ts">
  import type { DialogExports } from "$lib/dialog";
  import { surveyTypes, type Survey, type SurveyType } from "$lib/survey";

  let {
    idb,
  }: {
    idb: IDBDatabase;
  } = $props();

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
          fields: [],
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
          fields: [],
          teams: [],
          created: new Date(),
          modified: new Date(),
        };
      } else {
        error = "Invalid survey type!";
        return;
      }

      const addRequest = idb.transaction("surveys", "readwrite").objectStore("surveys").add(survey);
      addRequest.onerror = () => {
        error = `Could not add survey: ${addRequest.error?.message}`;
      };

      addRequest.onsuccess = () => {
        const id = addRequest.result;
        if (id == undefined) {
          error = "Could not add survey";
          return;
        }

        location.hash = `/survey/${id}`;
      };
    },
  };
</script>

<span>New survey</span>

<label class="flex flex-col">
  Survey name
  <input bind:value={name} class="bg-neutral-800 p-2 text-theme" />
</label>
<label class="flex flex-col">
  Survey type
  <select bind:value={type} class="bg-neutral-800 p-2 capitalize text-theme">
    {#each surveyTypes as surveyType}
      <option>{surveyType}</option>
    {/each}
  </select>
</label>

{#if error}
  <span>{error}</span>
{/if}
