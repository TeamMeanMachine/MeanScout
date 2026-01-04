<script lang="ts">
  import { PlusIcon, SearchIcon } from "@lucide/svelte";
  import { afterNavigate, goto } from "$app/navigation";
  import { allianceTeamLabels, rerunAllContextLoads, type Team } from "$lib";
  import Anchor from "$lib/components/Anchor.svelte";
  import Button from "$lib/components/Button.svelte";
  import { openDialog } from "$lib/dialog";
  import NewTeamsDialog from "$lib/dialogs/NewTeamsDialog.svelte";
  import { idb } from "$lib/idb";
  import type { LayoutProps } from "./$types";

  let { data, children }: LayoutProps = $props();

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
    goto(`#/comp/${data.compRecord.id}/teams/${filteredTeams[0].number}`);
  }

  function filterTeam(team: Team) {
    if (!cleanedSearch) return true;

    return (
      parseInt(team.number) == parseInt(cleanedSearch) ||
      team.name.toLowerCase().replaceAll(" ", "").includes(cleanedSearch)
    );
  }

  afterNavigate(({ from, to }) => {
    if (!data.team) return;
    const [fromId, toId] = [from?.route.id, to?.route.id];
    if (fromId == toId) return;
    if (fromId?.startsWith("/comp/[compId]/(main)/teams") && toId?.startsWith("/comp/[compId]/(main)/teams")) return;

    document.getElementById(data.team.number)?.scrollIntoView({ block: "center", inline: "center" });
  });
</script>

<div
  class={[
    "lg:fixed lg:top-[57px] lg:h-[calc(100vh-57px)] lg:w-80 lg:overflow-y-auto lg:overscroll-y-contain lg:border-r lg:border-neutral-600",
    "max-lg:mx-auto max-lg:w-full max-lg:max-w-(--breakpoint-lg)",
    data.team ? "max-lg:hidden" : "max-lg:mb-[65px]",
  ]}
>
  <div class={["flex flex-col gap-3 bg-neutral-900 px-3 py-6", "sticky top-[57px] z-20 lg:top-0", "max-lg:mt-[57px]"]}>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 class="grow font-bold">Teams</h2>

      <div class="flex items-center gap-3">
        {#if data.teams.length}
          <label
            class={[
              "flex cursor-text items-center gap-2 bg-neutral-800 p-2 text-sm text-theme outline-neutral-300",
              "focus-within:z-10 focus-within:outline-2",
            ]}
          >
            <SearchIcon class="size-5 text-theme" />
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
              class="w-full max-w-32 min-w-8 font-bold outline-0"
            />
          </label>
        {:else}
          <span class="text-xs">No teams.</span>
        {/if}

        <Button
          onclick={() => {
            openDialog(NewTeamsDialog, {
              teams: data.compRecord.teams,
              onadd(newTeams) {
                const teams = [
                  ...data.compRecord.teams,
                  ...newTeams.map((team) => ({ number: team, name: "" })),
                ].toSorted((a, b) => a.number.localeCompare(b.number, "en", { numeric: true }));
                data = {
                  ...data,
                  compRecord: { ...data.compRecord, teams, modified: new Date() },
                };
                idb.put("comps", $state.snapshot(data.compRecord)).onsuccess = rerunAllContextLoads;
              },
            });
          }}
        >
          <PlusIcon class="size-5 text-theme" />
        </Button>
      </div>
    </div>
  </div>

  {#if data.teams.length}
    <div class="mb-6 flex flex-col gap-2 px-3 pt-1">
      {#each filteredTeams as team}
        {@const viewing = team.number == data.team?.number}

        {@const allianceWithIndex = data.compRecord.alliances
          ?.map((a, i) => ({ ...a, i }))
          .find((a) => a.teams.includes(team.number))}

        <Anchor route="comp/{data.compRecord.id}/teams/{team.number}" class="justify-between">
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
</div>

{@render children()}
