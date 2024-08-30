<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import Header from "$lib/components/Header.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { modeStore } from "$lib/settings";
  import type { Survey } from "$lib/survey";

  let {
    idb,
    surveyRecord,
  }: {
    idb: IDBDatabase;
    surveyRecord: IDBRecord<Survey>;
  } = $props();

  $effect(() => {
    idb.transaction("surveys", "readwrite").objectStore("surveys").put($state.snapshot(surveyRecord));
  });

  let teamInput = $state("");

  function addTeam() {
    if (teamInput.trim() && !surveyRecord.teams.includes(teamInput.trim())) {
      surveyRecord.teams = [...surveyRecord.teams, teamInput.trim()];
      surveyRecord.modified = new Date();
      teamInput = "";
    }
  }

  function deleteTeam(team: string) {
    surveyRecord.teams = surveyRecord.teams.filter((t) => t.trim() != team.trim());
    surveyRecord.modified = new Date();
  }
</script>

<Header backLink="survey/{surveyRecord.id}">
  <small>{surveyRecord.name}</small>
  <h1 class="font-bold">Teams</h1>
</Header>

{#if $modeStore == "admin"}
  <div class="flex items-end gap-2 p-3">
    <label class="flex flex-col">
      New team
      <input
        bind:value={teamInput}
        onkeydown={(e) => e.key == "Enter" && addTeam()}
        class="w-48 bg-neutral-800 p-2 text-theme"
      />
    </label>
    <Button disabled={!teamInput.trim().length || surveyRecord.teams.includes(teamInput.trim())} onclick={addTeam}>
      <Icon name="plus" />
      Add
    </Button>
  </div>
{/if}

<div class="flex flex-col gap-2 p-3">
  <h2 class="font-bold">Teams</h2>
  {#if surveyRecord.teams.length}
    <div class="flex gap-2">
      {#if $modeStore == "admin"}
        {#each surveyRecord.teams.toSorted((a, b) => a.localeCompare(b, "en", { numeric: true })) as team}
          <Button onclick={() => deleteTeam(team)}>
            {team}
          </Button>
        {/each}
      {:else}
        {surveyRecord.teams.toSorted((a, b) => a.localeCompare(b, "en", { numeric: true })).join(", ")}
      {/if}
    </div>
  {:else}
    <span>
      No teams.
      {#if surveyRecord.type == "match" && surveyRecord.matches.length}
        Note that teams from matches are used depending on the selected target.
      {:else}
        Any team value is allowed.
      {/if}
    </span>
  {/if}
</div>
