<script lang="ts">
  import type { Match, TeamInfo } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import Dialog from "$lib/components/Dialog.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import type { MatchEntry } from "$lib/entry";
  import { modeStore } from "$lib/settings";
  import type { MatchSurvey } from "$lib/survey";
  import DeleteMatchDialog from "./DeleteMatchDialog.svelte";
  import UpsertMatchDialog from "./UpsertMatchDialog.svelte";
  import ViewTeamDialog from "./ViewTeamDialog.svelte";

  let {
    surveyRecord = $bindable(),
    entryRecords,
    ranksPerPickList,
    upsertMatchDialog,
    deleteMatchDialog,
  }: {
    surveyRecord: IDBRecord<MatchSurvey>;
    entryRecords: IDBRecord<MatchEntry>[];
    ranksPerPickList: Record<string, number>[];
    upsertMatchDialog: UpsertMatchDialog | undefined;
    deleteMatchDialog: DeleteMatchDialog | undefined;
  } = $props();

  let dialog: Dialog;

  let viewTeamDialog = $state<ViewTeamDialog | undefined>();

  let match = $state<Match>({
    number: 0,
    red1: "",
    red2: "",
    red3: "",
    blue1: "",
    blue2: "",
    blue3: "",
  });
  let teamInfos = $state<TeamInfo[]>([]);

  export function open(newMatch: Match, newTeamInfos: TeamInfo[]) {
    match = structuredClone($state.snapshot(newMatch));
    teamInfos = structuredClone($state.snapshot(newTeamInfos));
    dialog.open();
  }

  export function close() {
    dialog.close();
  }

  function getOrdinal(n: number) {
    if (n % 10 == 1 && n % 100 != 11) {
      return "st";
    }

    if (n % 10 == 2 && n % 100 != 12) {
      return "nd";
    }

    if (n % 10 == 3 && n % 100 != 13) {
      return "rd";
    }

    return "th";
  }

  function onclose() {
    match = {
      number: 0,
      red1: "",
      red2: "",
      red3: "",
      blue1: "",
      blue2: "",
      blue3: "",
    };
    teamInfos = [];
  }
</script>

<ViewTeamDialog bind:this={viewTeamDialog} {surveyRecord} {entryRecords} />

{#snippet teamRow(team: string, alliance: string)}
  {@const teamInfo = teamInfos.find((teamInfo) => teamInfo.team == team)}
  {@const entry = entryRecords.find((e) => e.status != "draft" && e.match == match.number && e.team == team)}
  {#if teamInfo}
    <tr
      tabindex="0"
      role="button"
      onclick={() => viewTeamDialog?.open(teamInfo)}
      onkeydown={(e) => {
        if (e.key == " " || e.key == "Enter") {
          e.preventDefault();
          viewTeamDialog?.open(teamInfo);
        }
      }}
      class="button cursor-pointer bg-neutral-800"
    >
      <td class="p-2 text-{alliance}">{teamInfo.team}</td>
      {#if teamInfo.pickListRanks?.length}
        {#each teamInfo.pickListRanks as pickListRank}
          <td class="p-2">
            {#if pickListRank > 0}
              {pickListRank}<small class="font-light">{getOrdinal(pickListRank)}</small>
            {/if}
          </td>
        {/each}
      {/if}
      <td class="p-2">
        {#if entry}
          <Icon name="check" />
        {/if}
      </td>
      <td></td>
    </tr>
  {/if}
{/snippet}

<Dialog bind:this={dialog} {onclose}>
  <div class="flex flex-col">
    <span>Match {match.number}</span>
    <table class="border-separate border-spacing-y-2 text-center">
      <thead class="text-nowrap">
        <tr>
          <th class="w-0 p-2">Team</th>
          {#if ranksPerPickList.length}
            {#each surveyRecord.pickLists as pickList}
              <th class="w-0 p-2">{pickList.name}</th>
            {/each}
          {/if}
          <th class="w-0 p-2">Done</th>
          <td></td>
        </tr>
      </thead>
      <tbody>
        {#each [match.red1, match.red2, match.red3] as team}
          {@render teamRow(team, "red")}
        {/each}
        {#each [match.blue1, match.blue2, match.blue3] as team}
          {@render teamRow(team, "blue")}
        {/each}
      </tbody>
    </table>
  </div>

  {#if $modeStore == "admin"}
    <Button onclick={() => upsertMatchDialog?.editMatch(match.number)}>
      <Icon name="pen" />
      Edit
    </Button>
    <Button onclick={() => deleteMatchDialog?.open(match.number)}>
      <Icon name="trash" />
      Delete
    </Button>
  {/if}
</Dialog>
