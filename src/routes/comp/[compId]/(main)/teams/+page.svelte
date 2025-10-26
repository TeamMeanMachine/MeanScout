<script lang="ts">
  import type { PageProps } from "./$types";
  import { goto } from "$app/navigation";
  import Anchor from "$lib/components/Anchor.svelte";
  import { allianceTeamLabels, type Team } from "$lib";

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
      team.number == parseInt(cleanedSearch).toString() ||
      team.name.toLowerCase().replaceAll(" ", "").includes(cleanedSearch)
    );
  }
</script>

<div class="flex flex-col gap-6">
  {#if !data.teams.length}
    <div class="flex flex-col gap-3">
      <h2 class="font-bold">Teams</h2>
      <span class="text-sm">No data on any teams.</span>
    </div>
  {:else}
    <div class="flex flex-col gap-2">
      <h2 class="font-bold">Teams</h2>
      <label class="flex flex-col text-sm">
        Search
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
          class="text-theme bg-neutral-800 p-2"
        />
      </label>
    </div>

    <div class="flex flex-col gap-2">
      {#each filteredTeams as team}
        {@const allianceWithIndex = data.compRecord.alliances
          ?.map((a, i) => ({ ...a, i }))
          .find((a) => a.teams.includes(team.number))}

        <Anchor route="comp/{data.compRecord.id}/team/{team.number}" class="flex-nowrap! justify-between">
          <div class="flex flex-col">
            <span class="font-bold">{team.number}</span>
            {#if team.name}
              <span class="text-xs font-light text-balance">{team.name}</span>
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
</div>
