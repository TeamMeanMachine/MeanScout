<script lang="ts">
  import { calculateTeamData, normalizeTeamData, type Expression, type PickList } from "$lib/analysis";
  import Dialog from "$lib/components/Dialog.svelte";
  import type { Entry } from "$lib/entry";

  let {
    pickLists,
    entriesByTeam,
    expressions,
  }: {
    pickLists: PickList[];
    entriesByTeam: Record<string, IDBRecord<Entry>[]>;
    expressions: Expression[];
  } = $props();

  let dialog: Dialog;

  let pickList = $state<PickList>({ name: "New pick list", weights: [] });
  let sortedTeamData = $state<{ team: string; percentage: number }[]>([]);
  let error = $state("");

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

  function onclose() {
    pickList = { name: "New pick list", weights: [] };
    sortedTeamData = [];
    error = "";
  }
</script>

<Dialog bind:this={dialog} {onclose}>
  <span>{pickList.name}</span>

  {#if sortedTeamData.length}
    <div class="flex max-h-[500px] flex-col gap-2 overflow-auto p-1">
      <table class="w-full text-right">
        <thead>
          <tr>
            <th class="p-2">Rank</th>
            <th class="p-2">Team</th>
            <th class="p-2">Percent</th>
          </tr>
        </thead>
        <tbody>
          {#each sortedTeamData as teamValue, i}
            <tr>
              <td class="p-2">{i + 1}</td>
              <td class="p-2">{teamValue.team}</td>
              <td class="p-2">{teamValue.percentage.toFixed(2)}%</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  {#if error}
    <span>Error: {error}</span>
  {/if}
</Dialog>
