<script lang="ts">
  import { calculateTeamData, normalizeTeamData, type Expression } from "$lib/analysis";
  import Dialog from "$lib/components/Dialog.svelte";
  import type { Entry } from "$lib/entry";

  let {
    entriesByTeam,
    expressions,
  }: {
    entriesByTeam: Record<string, IDBRecord<Entry>[]>;
    expressions: Expression[];
  } = $props();

  let dialog: Dialog;

  let expression = $state<Expression>({ name: "", type: "average", inputs: [] });
  let sortedTeamData = $state<{ team: string; percentage: number; value: number }[]>([]);
  let error = $state("");

  export function open(index: number) {
    expression = expressions[index];

    const teamData = calculateTeamData(expression.name, expressions, entriesByTeam);
    const normalizedTeamData = normalizeTeamData(teamData);

    sortedTeamData = Object.keys(normalizedTeamData)
      .map((team) => ({ team, percentage: normalizedTeamData[team], value: teamData[team] }))
      .toSorted((a, b) => b.value - a.value);

    dialog.open();
  }

  function onclose() {
    expression = { name: "", type: "average", inputs: [] };
    sortedTeamData = [];
    error = "";
  }
</script>

<Dialog bind:this={dialog} {onclose}>
  <span>{expression.name}</span>

  {#if sortedTeamData.length}
    <div class="flex max-h-[500px] flex-col gap-2 overflow-auto p-1">
      <table class="w-full text-right">
        <thead>
          <tr>
            <th class="p-2">Rank</th>
            <th class="p-2">Team</th>
            <th class="p-2">Value</th>
            <th class="p-2">Percent</th>
          </tr>
        </thead>
        <tbody>
          {#each sortedTeamData as teamValue, i}
            <tr>
              <td class="p-2">{i + 1}</td>
              <td class="p-2">{teamValue.team}</td>
              <td class="p-2">{teamValue.value.toFixed(2)}</td>
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
