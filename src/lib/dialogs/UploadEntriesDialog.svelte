<script lang="ts">
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import { csvToEntries } from "$lib/entry";
  import { getDetailedSingleFields, type DetailedSingleField } from "$lib/field";
  import { objectStore, transaction } from "$lib/idb";
  import type { Survey } from "$lib/survey";

  let {
    data,
  }: {
    data: string;
  } = $props();

  let surveyRecords = $state<IDBRecord<Survey>[]>([]);
  let selectedSurveyId = $state<number | undefined>();
  let selectedSurveyRecord = $derived(surveyRecords.find((survey) => survey.id == selectedSurveyId));

  let fields = $state<DetailedSingleField[]>([]);
  $effect(() => getFields(selectedSurveyRecord));

  let entries = $derived(selectedSurveyRecord && fields ? csvToEntries(data, selectedSurveyRecord, fields) : undefined);

  let error = $state("");

  export const { onopen, onconfirm }: DialogExports = {
    onopen(open) {
      if (!data.length) {
        error = "No input";
        return open();
      }

      const surveysRequest = objectStore("surveys").getAll();
      surveysRequest.onerror = () => {
        error = "No surveys found";
        open();
      };

      surveysRequest.onsuccess = () => {
        const surveys = surveysRequest.result;
        if (!surveys.length) {
          error = "No surveys found";
          return open();
        }

        surveyRecords = surveys;
        open();
      };
    },
    async onconfirm() {
      if (!entries?.length) return;
      if (!selectedSurveyRecord) return;

      const addTransaction = transaction("entries", "readwrite");
      const entryStore = addTransaction.objectStore("entries");
      addTransaction.onabort = () => {
        error = "Could not upload entries";
      };

      addTransaction.oncomplete = () => {
        objectStore("surveys", "readwrite").put({ ...$state.snapshot(selectedSurveyRecord), modified: new Date() });
        closeDialog();
      };

      for (const entry of entries) {
        entryStore.add($state.snapshot(entry));
      }
    },
  };

  function getFields(survey: IDBRecord<Survey> | undefined) {
    if (!survey) {
      fields = [];
      return;
    }

    const fieldsRequest = objectStore("fields").index("surveyId").getAll(survey.id);
    fieldsRequest.onsuccess = () => {
      fields = getDetailedSingleFields(survey, fieldsRequest.result);
    };
  }
</script>

{#if entries?.length && selectedSurveyRecord}
  <div class="flex max-h-[500px] flex-col gap-2 overflow-auto">
    <table class="w-full text-left">
      <thead>
        <tr>
          <th class="w-0 p-2">Team</th>
          {#if selectedSurveyRecord.type == "match"}
            <th class="w-0 p-2">Match</th>
            <th class="w-0 p-2">Absent</th>
          {/if}
          <td></td>
        </tr>
      </thead>
      <tbody>
        {#each entries as entry}
          <tr>
            <td class="p-2">{entry.team}</td>
            {#if entry.type == "match"}
              <td class="p-2">{entry.match}</td>
              <td class="p-2">{entry.absent}</td>
            {/if}
            <td></td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
  <span>Entries: {entries.length}</span>
{/if}

{#if surveyRecords.length}
  <label class="flex flex-col">
    To survey
    <select bind:value={selectedSurveyId} class="text-theme bg-neutral-800 p-2 capitalize">
      {#each surveyRecords.toSorted((a, b) => b.modified.getTime() - a.modified.getTime()) as survey (survey.id)}
        <option value={survey.id}>{survey.name}</option>
      {/each}
    </select>
  </label>
{/if}

{#if error}
  <span>Error: {error}</span>
{/if}
