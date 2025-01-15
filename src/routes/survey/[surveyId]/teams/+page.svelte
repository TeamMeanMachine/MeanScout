<script lang="ts">
  import type { TeamInfo } from "$lib";
  import { calculateTeamData, normalizeTeamData, type PickList } from "$lib/analysis";
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { openDialog } from "$lib/dialog";
  import ViewTeamDialog from "$lib/dialogs/ViewTeamDialog.svelte";
  import type { Entry } from "$lib/entry";
  import { flushSync, onMount } from "svelte";
  import type { PageData } from "./$types";
  import Header from "$lib/components/Header.svelte";

  let {
    data,
  }: {
    data: PageData;
  } = $props();

  let teamsFromMatches = $derived.by(() => {
    data.surveyRecord;
    return getTeamsFromMatches();
  });
  let matchCountPerTeam = $derived(getMatchCountPerTeam(teamsFromMatches));
  let entriesByTeam = $derived.by(() => {
    data.surveyRecord;
    data.entryRecords;
    return getEntriesByTeam();
  });

  let dataGrid = $state<HTMLDivElement | undefined>();

  let ranksPerPickList = $derived.by(() => {
    if (data.surveyType != "match") return [];
    return data.surveyRecord.pickLists.map(createTeamRanking);
  });

  let sortBy = $state<"team" | number | "done">("team");

  let columns = $derived(data.surveyType == "match" ? data.surveyRecord.pickLists.length : 0);

  let teamInfos = $derived.by(() => {
    const uniqueTeams = [...new Set([...data.surveyRecord.teams.map((team) => team.number), ...teamsFromMatches])];
    return uniqueTeams.map(createTeamInfo).toSorted(sortTeamInfo);
  });

  let displayedCount = $state(10);
  let displayedTeams = $derived(teamInfos.slice(0, displayedCount));

  onMount(() => onscroll());

  $effect(() => {
    if (!dataGrid) return;
    sortBy;
    if (window.scrollY > dataGrid.getBoundingClientRect().top) {
      dataGrid.scrollIntoView();
    }
  });

  function onscroll() {
    if (displayedCount >= teamInfos.length) return;
    if (document.body.offsetHeight <= window.scrollY + window.innerHeight * 2) {
      displayedCount = Math.min(displayedCount + 10, teamInfos.length);
      flushSync();
      onscroll();
    }
  }

  function getTeamsFromMatches() {
    if (data.surveyType != "match" || !data.surveyRecord.matches.length) return [];
    const teamsFromMatches: string[] = [];
    for (const match of data.surveyRecord.matches) {
      teamsFromMatches.push(match.red1, match.red2, match.red3, match.blue1, match.blue2, match.blue3);
    }
    return teamsFromMatches;
  }

  function getMatchCountPerTeam(teamsFromMatches: string[]) {
    const matchCountPerTeam: Record<string, number> = {};
    for (const team of teamsFromMatches) {
      if (team in matchCountPerTeam) {
        matchCountPerTeam[team] += 1;
      } else {
        matchCountPerTeam[team] = 1;
      }
    }
    return matchCountPerTeam;
  }

  function getEntriesByTeam() {
    const entriesByTeam: Record<string, IDBRecord<Entry>[]> = {};
    for (const entry of data.entryRecords) {
      if (entry.team in entriesByTeam) {
        entriesByTeam[entry.team].push(entry);
      } else {
        entriesByTeam[entry.team] = [entry];
      }
    }
    return entriesByTeam;
  }

  function createTeamRanking(pickList: PickList) {
    if (data.surveyType != "match") return {};

    const pickListData: Record<string, number> = {};
    for (const team in entriesByTeam) {
      pickListData[team] = 0;
    }

    for (const { percentage, expressionName } of pickList.weights) {
      const teamData = calculateTeamData(expressionName, data.surveyRecord.expressions, entriesByTeam, data.fields);
      const normalizedTeamData = normalizeTeamData(teamData, percentage);

      for (const team in normalizedTeamData) {
        pickListData[team] += normalizedTeamData[team];
      }
    }

    const normalizedPickListData = normalizeTeamData(pickListData);

    const sortedTeamRankings = Object.keys(pickListData)
      .map((team) => ({ team, percentage: normalizedPickListData[team] }))
      .toSorted((a, b) => b.percentage - a.percentage)
      .map((data, index) => ({ team: data.team, rank: index + 1 }));

    const rankPerTeam: Record<string, number> = {};
    for (const ranking of sortedTeamRankings) {
      rankPerTeam[ranking.team] = ranking.rank;
    }
    return rankPerTeam;
  }

  function createTeamInfo(team: string): TeamInfo {
    const matchingEntries = data.entryRecords.filter((entry) => entry.status != "draft" && entry.team == team);

    let pickListRanks: number[] | undefined = undefined;
    if (ranksPerPickList.length) {
      pickListRanks = ranksPerPickList.map((pickList) => pickList[team]);
    }

    return {
      number: team,
      name: data.surveyRecord.teams.find((t) => t.number == team)?.name || "",
      entryCount: matchingEntries.length,
      matchCount: matchCountPerTeam[team] ?? 0,
      isCustom: data.surveyRecord.teams.some((t) => t.number == team),
      pickListRanks,
    };
  }

  function sortTeamInfo(a: TeamInfo, b: TeamInfo) {
    const teamCompare = a.number.localeCompare(b.number, "en", { numeric: true });
    const doneCompare = a.entryCount / a.matchCount - b.entryCount / b.matchCount;

    if (typeof sortBy == "number" && a.pickListRanks?.length && b.pickListRanks?.length) {
      const aRank = a.pickListRanks[sortBy];
      const bRank = b.pickListRanks[sortBy];

      if (aRank == 0 && bRank > 0) return 1;
      if (aRank > 0 && bRank == 0) return -1;
      return aRank - bRank;
    }

    if (sortBy == "done") return doneCompare || teamCompare;
    return teamCompare;
  }

  function getOrdinal(n: number) {
    if (n % 10 == 1 && n % 100 != 11) return "st";
    if (n % 10 == 2 && n % 100 != 12) return "nd";
    if (n % 10 == 3 && n % 100 != 13) return "rd";
    return "th";
  }
</script>

<svelte:window {onscroll} />

<Header
  title="Teams - {data.surveyRecord.name} - MeanScout"
  heading={[
    { type: "sm", text: data.surveyRecord.name },
    { type: "h1", text: "Teams" },
  ]}
  backLink="survey/{data.surveyRecord.id}"
/>

<div class="flex flex-col gap-2" style="view-transition-name:teams">
  {#if teamInfos.length}
    <div class="flex flex-col">
      <small>
        Sorting by
        {#if data.surveyType == "match" && typeof sortBy == "number"}
          {data.surveyRecord.pickLists[sortBy].name}
        {:else}
          {sortBy}
        {/if}
      </small>

      <div
        bind:this={dataGrid}
        class="grid gap-y-2 pt-1"
        style="grid-template-columns: minmax(auto, max-content) repeat({columns + 1}, min-content) minmax(0, auto)"
      >
        <div class="sticky top-0 z-20 col-span-full grid grid-cols-subgrid bg-neutral-900 py-2">
          <div class="col-span-full grid grid-cols-subgrid gap-x-2">
            <Button onclick={() => (sortBy = "team")} class={sortBy == "team" ? "font-bold" : "font-light"}>
              Team
            </Button>
            {#if ranksPerPickList.length && data.surveyType == "match"}
              {#each data.surveyRecord.pickLists as pickList, i}
                <Button
                  onclick={() => (sortBy = i)}
                  class="{sortBy == i ? 'font-bold' : 'font-light'} text-nowrap text-xs"
                >
                  {pickList.name}
                </Button>
              {/each}
            {/if}
            <Button
              onclick={() => (sortBy = "done")}
              class="{sortBy == 'done' ? 'font-bold' : 'font-light'} justify-center"
            >
              Done
            </Button>
          </div>
        </div>

        {#each displayedTeams as teamInfo (teamInfo.number)}
          <Button
            onclick={() => openDialog(ViewTeamDialog, { data, teamInfo })}
            class="col-span-full grid grid-cols-subgrid text-center"
          >
            <div class="flex flex-col text-left">
              {#if teamInfo.name}
                <span class="font-bold">{teamInfo.number}</span>
                <small class="max-h-10 overflow-hidden font-light">
                  {teamInfo.name.replaceAll("Robotics", "").replaceAll("Team", "")}
                </small>
              {:else}
                {teamInfo.number}
              {/if}
            </div>
            {#if teamInfo.pickListRanks?.length}
              {#each teamInfo.pickListRanks as pickListRank}
                <div>
                  {#if pickListRank > 0}
                    {pickListRank}<small class="font-light">{getOrdinal(pickListRank)}</small>
                  {/if}
                </div>
              {/each}
            {/if}
            <div>
              {#if data.surveyType == "match" && data.surveyRecord.matches.length && teamInfo.matchCount}
                {teamInfo.entryCount}<small class="font-light">/{teamInfo.matchCount}</small>
              {:else}
                {teamInfo.entryCount}
              {/if}
            </div>
          </Button>
        {/each}
      </div>

      {#if displayedTeams.length < teamInfos.length}
        <Button onclick={() => (displayedCount += 10)}>
          <Icon name="arrow-down" />
          Show more
        </Button>
      {/if}
    </div>
  {:else}
    <span>
      No teams.
      {#if data.surveyType == "match" && data.surveyRecord.matches.length}
        Note that teams from matches are used depending on the selected target.
      {:else}
        Any team value is allowed.
      {/if}
    </span>
  {/if}
</div>
