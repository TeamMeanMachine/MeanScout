<script lang="ts">
  import type { PageProps } from "./$types";
  import { afterNavigate, goto, invalidateAll } from "$app/navigation";
  import Anchor from "$lib/components/Anchor.svelte";
  import { allianceTeamLabels, type Team } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import { openDialog } from "$lib/dialog";
  import NewTeamsDialog from "$lib/dialogs/NewTeamsDialog.svelte";
  import { idb } from "$lib/idb";
  import { PlusIcon } from "@lucide/svelte";

  let { data }: PageProps = $props();

  const debounceTimeMillis = 500;
  let debounceTimer: number | undefined = undefined;

  let debouncedSearch = $state(sessionStorage.getItem("team-search") || "");
  const cleanedSearch = $derived(debouncedSearch.trim().toLowerCase().replaceAll(" ", ""));

  const filteredTeams = $derived(data.teams.filter(filterTeam));

  function onsearchinput(value: string) {
    window.clearTimeout(debounceTimer);

    debounceTimer = window.setTimeout(() => {
      debouncedSearch = value;
      sessionStorage.setItem("team-search", debouncedSearch);
    }, debounceTimeMillis);
  }

  function onsearchenter() {
    if (!filteredTeams.length) return;
    goto(`#/comp/${data.compRecord.id}/team/${filteredTeams[0].number}`);
  }

  function filterTeam(team: Team) {
    if (!cleanedSearch) return true;

    return (
      parseInt(team.number) == parseInt(cleanedSearch) ||
      team.name.toLowerCase().replaceAll(" ", "").includes(cleanedSearch)
    );
  }

  afterNavigate(({ from, to }) => {
    if (data.team && from?.route.id != to?.route.id) {
      document.getElementById(data.team.number)?.scrollIntoView({ block: "center", inline: "center" });
    }
  });
</script>

<div class="flex flex-col sticky gap-3 top-0 p-3 pt-6 bg-neutral-900 z-20">
  <div class="flex justify-between flex-wrap items-center">
    <h2 class="font-bold">Teams</h2>
    <Button
      onclick={() => {
        openDialog(NewTeamsDialog, {
          teams: data.compRecord.teams,
          onadd(newTeams) {
            const teams = [...data.compRecord.teams, ...newTeams.map((team) => ({ number: team, name: "" }))].toSorted(
              (a, b) => a.number.localeCompare(b.number, "en", { numeric: true }),
            );
            data = {
              ...data,
              compRecord: { ...data.compRecord, teams, modified: new Date() },
            };
            idb.put("comps", $state.snapshot(data.compRecord)).onsuccess = invalidateAll;
          },
        });
      }}
    >
      <PlusIcon class="text-theme size-5" />
    </Button>
  </div>

  {#if !data.teams.length}
    <span class="text-sm">No data on any teams.</span>
  {:else}
    <label class="flex flex-col">
      <span class="text-xs">Search</span>
      <input
        {@attach (input) => {
          if (sessionStorage.getItem("team-search")) {
            input.focus();
            input.select();
          }
        }}
        value={debouncedSearch}
        oninput={(e) => onsearchinput(e.currentTarget.value)}
        onkeypress={(e) => e.key == "Enter" && onsearchenter()}
        class="text-theme bg-neutral-800 p-2 text-sm"
      />
    </label>
  {/if}
</div>

{#if data.teams.length}
  <div class="flex flex-col gap-2 p-3">
    {#each filteredTeams as team}
      {@const viewing = team.number == data.team?.number}

      {@const allianceWithIndex = data.compRecord.alliances
        ?.map((a, i) => ({ ...a, i }))
        .find((a) => a.teams.includes(team.number))}

      <Anchor route="comp/{data.compRecord.id}/team/{team.number}" class="justify-between">
        <div id={team.number} class="flex flex-col">
          <span class="font-bold {viewing ? 'underline' : ''}">{team.number}</span>
          {#if team.name}
            <span class="text-xs {viewing ? 'font-bold underline' : 'font-light'} text-balance">{team.name}</span>
          {/if}
        </div>
        <div class="flex flex-col text-end">
          {#if allianceWithIndex}
            <div class="truncate text-xs tracking-tighter">
              Alliance {allianceWithIndex.i + 1}<br />
              {allianceTeamLabels[allianceWithIndex.teams.indexOf(team.number)] || "Backup"}
            </div>
          {/if}
        </div>
      </Anchor>
    {/each}
  </div>
{/if}
