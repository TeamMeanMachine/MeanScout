<script lang="ts">
  import { getOrdinal, type TeamInfo } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import { openDialog } from "$lib/dialog";
  import ViewTeamDialog from "$lib/dialogs/ViewTeamDialog.svelte";
  import type { MatchEntry } from "$lib/entry";
  import type { PageData } from "./$types";
  import Header from "$lib/components/Header.svelte";

  let {
    data,
  }: {
    data: PageData;
  } = $props();

  let sortBy = $state<"team" | number | "done">("team");

  let teamInfos = $derived.by(() => {
    sortBy;
    const uniqueTeams = [...new Set([...data.surveyRecord.teams.map((team) => team.number), ...data.teamsFromMatches])];
    return uniqueTeams.map(createTeamInfo).toSorted(sortTeamInfo);
  });

  function createTeamInfo(team: string): TeamInfo {
    const matchingEntries = data.entryRecords.filter((entry) => entry.status != "draft" && entry.team == team);

    let pickListRanks: number[] | undefined = undefined;
    if (data.surveyType == "match" && data.ranksPerPickList.length) {
      pickListRanks = data.ranksPerPickList.map((pickList) => pickList[team]);
    }

    let expressionRanks: number[] | undefined = undefined;
    if (data.surveyType == "match" && data.ranksPerExpression.length) {
      expressionRanks = data.ranksPerExpression.map((expression) => expression[team]);
    }

    return {
      number: team,
      name: data.surveyRecord.teams.find((t) => t.number == team)?.name || "",
      entryCount: matchingEntries.length,
      matchCount: data.matchCountPerTeam[team] ?? 0,
      isCustom: data.surveyRecord.teams.some((t) => t.number == team),
      pickListRanks,
      expressionRanks,
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
</script>

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
        class="grid gap-y-2 pt-1"
        style="grid-template-columns: minmax(auto, max-content) repeat({data.columns + 1}, min-content) minmax(0, auto)"
      >
        <div class="sticky top-0 z-20 col-span-full grid grid-cols-subgrid bg-neutral-900 py-2">
          <div class="col-span-full grid grid-cols-subgrid gap-x-2">
            <Button onclick={() => (sortBy = "team")} class={sortBy == "team" ? "font-bold" : "font-light"}>
              Team
            </Button>
            {#if data.surveyType == "match" && data.ranksPerPickList.length}
              {#each data.surveyRecord.pickLists as pickList, i}
                <Button
                  onclick={() => (sortBy = i)}
                  class="{sortBy == i ? 'font-bold' : 'font-light'} text-xs text-nowrap"
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

        {#each teamInfos as teamInfo (teamInfo.number)}
          <Button
            onclick={() =>
              openDialog(ViewTeamDialog, {
                data,
                teamInfo,
                entriesByTeam: data.entriesByTeam as Record<string, IDBRecord<MatchEntry>[]>,
              })}
            class="col-span-full grid grid-cols-subgrid text-center!"
          >
            <div class="flex flex-col text-left">
              {#if teamInfo.name}
                <small class="max-h-10 overflow-hidden font-light">{teamInfo.name}</small>
                <span class="font-bold">{teamInfo.number}</span>
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
