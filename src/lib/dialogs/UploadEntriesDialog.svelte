<script lang="ts">
  import { parseValueFromString } from "$lib";
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import type { Entry } from "$lib/entry";
  import { objectStore, transaction } from "$lib/idb";
  import type { Survey } from "$lib/survey";

  let {
    data,
  }: {
    data: string;
  } = $props();

  let surveyRecords = $state<IDBRecord<Survey>[]>([]);

  let csvEntries = $state<string[][] | undefined>();
  let selectedSurveyId = $state<number | undefined>();
  let selectedSurveyRecord = $derived(surveyRecords.find((survey) => survey.id == selectedSurveyId));

  let error = $state("");

  export const { onopen, onconfirm }: DialogExports = {
    onopen(open) {
      if (!data.length) {
        error = "No input";
        return open();
      }

      const csv = data.split("\n").map((line) =>
        line
          .trim()
          .split(",")
          .map((value) => value.trim()),
      );

      if (!csv.length || !csv[0].length) {
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
        if (!surveys?.length) {
          error = "No surveys found";
          return open();
        }

        surveyRecords = surveys;
        csvEntries = csv;
        open();
      };
    },
    async onconfirm() {
      if (!csvEntries?.length) return;
      if (!selectedSurveyRecord) return;

      const addTransaction = transaction("entries", "readwrite");
      const entryStore = addTransaction.objectStore("entries");
      addTransaction.onabort = () => {
        error = "Could not upload entries";
      };

      addTransaction.oncomplete = () => {
        closeDialog();
      };

      for (const entryCSV of csvEntries) {
        if (entryCSV[0] == "Team" || entryCSV.length == 0) continue;
        addEntry(entryCSV, entryStore, selectedSurveyRecord);
      }
    },
  };

  function addEntry(entryCSV: string[], entryStore: IDBObjectStore, surveyRecord: IDBRecord<Survey>) {
    let entry: Entry;
    if (surveyRecord.type == "match") {
      entry = {
        surveyId: surveyRecord.id,
        type: surveyRecord.type,
        status: "exported",
        team: entryCSV[0],
        match: parseInt(entryCSV[1]),
        absent: entryCSV[2].toLowerCase() == "true" ? true : false,
        values: entryCSV.slice(3).map(parseValueFromString),
        created: new Date(),
        modified: new Date(),
      };
    } else {
      entry = {
        surveyId: surveyRecord.id,
        type: surveyRecord.type,
        status: "exported",
        team: entryCSV[0],
        values: entryCSV.slice(1).map(parseValueFromString),
        created: new Date(),
        modified: new Date(),
      };
    }

    entryStore.add(entry).onerror = (e) => {
      e.preventDefault();
    };
  }
</script>

{#if csvEntries?.length && surveyRecords.length}
  <span>Upload entries</span>
  <span>Total: {csvEntries.length}</span>
  <label class="flex flex-col">
    To survey
    <select bind:value={selectedSurveyId} class="bg-neutral-800 p-2 capitalize text-theme">
      {#each surveyRecords.toSorted((a, b) => b.modified.getTime() - a.modified.getTime()) as survey (survey.id)}
        <option value={survey.id}>{survey.name}</option>
      {/each}
    </select>
  </label>
{/if}

{#if error}
  <span>{error}</span>
{/if}
