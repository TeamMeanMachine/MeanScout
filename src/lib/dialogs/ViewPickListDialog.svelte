<script lang="ts">
  import { calculateTeamData, normalizeTeamData, type PickList } from "$lib/analysis";
  import Button from "$lib/components/Button.svelte";
  import Dialog from "$lib/components/Dialog.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import type { MatchEntry } from "$lib/entry";
  import { modeStore } from "$lib/settings";
  import type { MatchSurvey } from "$lib/survey";
  import DeletePickListDialog from "./DeletePickListDialog.svelte";
  import UpsertPickListDialog from "./UpsertPickListDialog.svelte";

  let {
    surveyRecord = $bindable(),
    upsertPickListDialog,
    deletePickListDialog,
    entriesByTeam,
  }: {
    surveyRecord: IDBRecord<MatchSurvey>;
    upsertPickListDialog: UpsertPickListDialog | undefined;
    deletePickListDialog: DeletePickListDialog | undefined;
    entriesByTeam: Record<string, IDBRecord<MatchEntry>[]>;
  } = $props();

  let dialog: Dialog;

  let pickListIndex = $state(-1);
  let pickList = $state<PickList>({ name: "New pick list", weights: [] });
  let sortedTeamData = $state<{ team: string; percentage: number }[]>([]);

  export function open(index: number) {
    pickListIndex = index;
    refresh();
    dialog.open();
  }

  export function refresh() {
    pickList = surveyRecord.pickLists[pickListIndex];

    const pickListData: Record<string, number> = {};
    for (const team in entriesByTeam) {
      pickListData[team] = 0;
    }

    for (const { percentage, expressionName } of pickList.weights) {
      const teamData = calculateTeamData(expressionName, surveyRecord.expressions, entriesByTeam);
      const normalizedTeamData = normalizeTeamData(teamData, percentage);

      for (const team in normalizedTeamData) {
        pickListData[team] += normalizedTeamData[team];
      }
    }

    const normalizedPickListData = normalizeTeamData(pickListData);

    sortedTeamData = Object.keys(normalizedPickListData)
      .map((team) => ({ team, percentage: normalizedPickListData[team] }))
      .toSorted((a, b) => b.percentage - a.percentage);
  }

  export function close() {
    dialog.close();
  }

  function onclose() {
    pickListIndex = -1;
    pickList = { name: "New pick list", weights: [] };
    sortedTeamData = [];
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

  {#if $modeStore == "admin"}
    <div class="flex flex-wrap gap-2">
      <Button onclick={() => upsertPickListDialog?.editPickList(pickListIndex)}>
        <Icon name="pen" />
        Edit
      </Button>
      <Button onclick={() => deletePickListDialog?.open(pickListIndex)}>
        <Icon name="trash" />
        Delete
      </Button>
    </div>
  {/if}
</Dialog>
