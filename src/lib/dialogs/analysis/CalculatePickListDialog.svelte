<script lang="ts">
  import type { Entry } from "$lib";
  import { calculateTeamData, normalizeTeamData, type Expression, type PickList } from "$lib/analysis";
  import Dialog from "$lib/components/Dialog.svelte";

  export let pickLists: PickList[];
  export let entriesByTeam: Record<string, IDBRecord<Entry>[]>;
  export let expressions: Expression[];

  let dialog: Dialog;
  let pickList: PickList = { name: "New pick list", weights: [] };
  let sortedTeamData: { team: string; percentage: number }[] = [];
  let error = "";

  export function open(index: number) {
    pickList = pickLists[index];

    const pickListData: Record<string, number> = {};
    for (const team in entriesByTeam) {
      pickListData[team] = 0;
    }

    for (const { percentage, expressionName } of pickList.weights) {
      const teamData = calculateTeamData(expressionName, expressions, entriesByTeam);
      const normalizedTeamData = normalizeTeamData(teamData, percentage);

      for (const team in normalizedTeamData) {
        pickListData[team] += normalizedTeamData[team];
      }
    }

    const normalizedPickListData = normalizeTeamData(pickListData);

    sortedTeamData = Object.keys(normalizedPickListData)
      .map((team) => ({ team, percentage: normalizedPickListData[team] }))
      .toSorted((a, b) => b.percentage - a.percentage);

    dialog.open();
  }

  function onClose() {
    pickList = { name: "New pick list", weights: [] };
    sortedTeamData = [];
    error = "";
  }
</script>

<Dialog bind:this={dialog} on:close={onClose}>
  <span>{pickList.name}</span>

  {#if sortedTeamData.length}
    <div class="dialog-overflow">
      <table class="team-rank-table">
        <tr>
          <th>Rank</th>
          <th>Team</th>
          <th>Percent</th>
        </tr>
        {#each sortedTeamData as teamValue, i}
          <tr>
            <td>{i + 1}</td>
            <td>{teamValue.team}</td>
            <td>{teamValue.percentage.toFixed(2)}%</td>
          </tr>
        {/each}
      </table>
    </div>
  {/if}

  {#if error}
    <span>Error: {error}</span>
  {/if}
</Dialog>
