<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import Dialog from "$lib/components/Dialog.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import type { Entry, MatchEntry } from "$lib/entry";
  import { flattenFields, getDefaultFieldValue } from "$lib/field";
  import { targetStore } from "$lib/settings";
  import type { Survey } from "$lib/survey";

  let {
    idb,
    surveyRecord = $bindable(),
    entryRecords,
  }: {
    idb: IDBDatabase;
    surveyRecord: IDBRecord<Survey>;
    entryRecords: IDBRecord<Entry>[];
  } = $props();

  const flattenedFields = flattenFields(surveyRecord.fields);

  let dialog: Dialog;

  let prefilledMatch = $state(getPrefilledMatch());
  let prefilledTeam = $derived(getPrefilledTeam(prefilledMatch));

  let team = $state("");
  let match = $state(0);
  let absent = $state(false);
  let error = $state("");

  let suggestedTeams = $derived(getSuggestedTeams(match));

  function onopen() {
    match = prefilledMatch;
    team = prefilledTeam;
  }

  function getPrefilledMatch() {
    return (
      1 +
      Math.max(
        ...entryRecords
          .filter((entry): entry is IDBRecord<MatchEntry> => entry.type == "match")
          .map((entry) => entry.match),
        0,
      )
    );
  }

  function getPrefilledTeam(matchValue: number) {
    if (surveyRecord.type != "match") return "";

    const matchData = surveyRecord.matches.find((match) => match.number == matchValue);
    if (!matchData) return "";

    switch ($targetStore) {
      case "red 1":
        return matchData.red1;
      case "red 2":
        return matchData.red2;
      case "red 3":
        return matchData.red3;
      case "blue 1":
        return matchData.blue1;
      case "blue 2":
        return matchData.blue2;
      case "blue 3":
        return matchData.blue3;
      default:
        return "";
    }
  }

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

  function onconfirm() {
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

    const defaultValues = flattenedFields.map((field) => {
      switch (field.type) {
        case "select":
          return field.values[0];
        default:
          return getDefaultFieldValue(field);
      }
    });

    let entry: Entry;
    if (surveyRecord.type == "match") {
      entry = {
        surveyId: surveyRecord.id,
        type: surveyRecord.type,
        status: absent ? "submitted" : "draft",
        team: $state.snapshot(team),
        match: $state.snapshot(match),
        absent: $state.snapshot(absent),
        values: defaultValues,
        created: new Date(),
        modified: new Date(),
      };
    } else {
      entry = {
        surveyId: surveyRecord.id,
        type: surveyRecord.type,
        status: "draft",
        team: $state.snapshot(team),
        values: defaultValues,
        created: new Date(),
        modified: new Date(),
      };
    }

    const addRequest = idb.transaction("entries", "readwrite").objectStore("entries").add(entry);
    addRequest.onsuccess = () => {
      const id = addRequest.result;
      if (id == undefined) return;

      surveyRecord.modified = new Date();

      if (absent) {
        entryRecords.push({ ...entry, id: id as number });
        dialog.close();
        prefilledMatch = getPrefilledMatch();
      } else {
        location.hash = `/entry/${id}`;
      }
    };
  }

  function onclose() {
    team = "";
    match = 0;
    absent = false;
    error = "";
  }
</script>

<Button onclick={() => dialog.open()}>
  <Icon name="plus" />
  <div class="flex flex-col">
    New entry
    <small>
      {#if prefilledTeam.length}
        Team {prefilledTeam},
      {/if}
      {#if surveyRecord.type == "match" && prefilledMatch}
        Match {prefilledMatch}
      {/if}
    </small>
  </div>
</Button>

<Dialog bind:this={dialog} {onopen} {onconfirm} {onclose}>
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
    <Button onclick={() => (absent = !absent)}>
      {#if absent}
        <Icon name="square-check" />
      {:else}
        <Icon style="regular" name="square" />
      {/if}
      Absent
    </Button>
  {/if}

  {#if error}
    <span>Error: {error}</span>
  {/if}
</Dialog>
