<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import QRCodeDisplay from "$lib/components/QRCodeDisplay.svelte";
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import { entryAsCSV, type Entry } from "$lib/entry";
  import { flattenFields, getDefaultFieldValue } from "$lib/field";
  import { objectStore } from "$lib/idb";
  import { targetStore } from "$lib/settings";
  import type { Survey } from "$lib/survey";

  let {
    surveyRecord,
    entryRecords,
    prefilledTeam,
    prefilledMatch,
  }: {
    surveyRecord: IDBRecord<Survey>;
    entryRecords: IDBRecord<Entry>[];
    prefilledTeam: string;
    prefilledMatch: number;
  } = $props();

  const flattenedFields = flattenFields(surveyRecord.fields);

  const defaultValues = flattenedFields.map((field) => {
    switch (field.type) {
      case "select":
        return field.values[0];
      default:
        return getDefaultFieldValue(field);
    }
  });

  let team = $state(prefilledTeam);
  let match = $state(prefilledMatch);
  let absent = $state(false);
  let error = $state("");

  let suggestedTeams = $derived(getSuggestedTeams(match));

  let isExporting = $state(false);

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      team = team.trim();

      const teamHasInvalidFormat = !/^\d{1,5}[A-Z]?$/.test(team);
      const teamIsNotListed = suggestedTeams.length && !suggestedTeams.includes(team);

      if (teamHasInvalidFormat) {
        error = "invalid value for team";
        return;
      }

      if (teamIsNotListed) {
        error = "team is not listed";
        return;
      }

      if (surveyRecord.type == "match") {
        if (!/\d{1,3}/.test(`${match}`)) {
          error = "invalid value for match";
          return;
        }

        if (surveyRecord.matches.length && !surveyRecord.matches.some((m) => m.number == match)) {
          error = "match is not listed";
          return;
        }
      }

      let entry: Entry;
      if (surveyRecord.type == "match") {
        entry = {
          surveyId: surveyRecord.id,
          type: surveyRecord.type,
          status: absent ? (isExporting ? "exported" : "submitted") : "draft",
          team,
          match,
          absent,
          values: defaultValues,
          created: new Date(),
          modified: new Date(),
        };
      } else {
        entry = {
          surveyId: surveyRecord.id,
          type: surveyRecord.type,
          status: "draft",
          team,
          values: defaultValues,
          created: new Date(),
          modified: new Date(),
        };
      }

      const addRequest = objectStore("entries", "readwrite").add($state.snapshot(entry));
      addRequest.onerror = () => {
        error = "Could not create new entry";
      };

      addRequest.onsuccess = () => {
        const id = addRequest.result;
        if (id == undefined) {
          error = "Could not create new entry";
          return;
        }

        surveyRecord.modified = new Date();

        if (absent) {
          entryRecords.push({ ...entry, id: id as number });
          closeDialog();
        } else {
          location.hash = `/entry/${id}`;
        }
      };
    },
  };

  function getSuggestedTeams(matchValue: number) {
    const teamSet = new Set<string>();

    if (surveyRecord.type == "match") {
      const matchData = surveyRecord.matches.find((match) => match.number == matchValue);

      if (matchData) {
        switch ($targetStore) {
          case "red 1":
            teamSet.add(matchData.red1);
            break;
          case "red 2":
            teamSet.add(matchData.red2);
            break;
          case "red 3":
            teamSet.add(matchData.red3);
            break;
          case "blue 1":
            teamSet.add(matchData.blue1);
            break;
          case "blue 2":
            teamSet.add(matchData.blue2);
            break;
          case "blue 3":
            teamSet.add(matchData.blue3);
            break;
          default:
            teamSet.add(matchData.red1);
            teamSet.add(matchData.red2);
            teamSet.add(matchData.red3);
            teamSet.add(matchData.blue1);
            teamSet.add(matchData.blue2);
            teamSet.add(matchData.blue3);
        }
      }
    }

    surveyRecord.teams.forEach((team) => teamSet.add(team));

    return [...teamSet].toSorted((a, b) => parseInt(a) - parseInt(b));
  }
</script>

<span>New entry</span>

<datalist id="teams-list">
  {#each suggestedTeams as team}
    <option value={team}></option>
  {/each}
</datalist>
<label class="flex flex-col">
  Team
  <input list="teams-list" bind:value={team} class="bg-neutral-800 p-2 text-theme" />
</label>

{#if surveyRecord.type == "match"}
  <label class="flex flex-col">
    Match
    <input type="number" bind:value={match} class="bg-neutral-800 p-2 text-theme" />
  </label>
  <Button
    onclick={() => {
      absent = !absent;
      isExporting = false;
    }}
  >
    {#if absent}
      <Icon name="square-check" />
    {:else}
      <Icon style="regular" name="square" />
    {/if}
    Absent
  </Button>

  {#if absent}
    <Button onclick={() => (isExporting = !isExporting)}>
      {#if isExporting}
        <Icon name="xmark" />
        Don't export
      {:else}
        <Icon name="share-from-square" />
        Export
      {/if}
    </Button>

    {#if isExporting}
      {@const absentEntryCSV = entryAsCSV({
        surveyId: surveyRecord.id,
        type: surveyRecord.type,
        status: "submitted",
        team,
        match,
        absent: true,
        values: defaultValues,
        created: new Date(),
        modified: new Date(),
      })}
      {#key absentEntryCSV}
        <QRCodeDisplay data={absentEntryCSV} />
      {/key}
    {/if}
  {/if}
{/if}

{#if error}
  <span>Error: {error}</span>
{/if}
