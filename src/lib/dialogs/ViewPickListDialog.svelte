<script lang="ts">
  import { calculateTeamData, normalizeTeamData, type PickList } from "$lib/analysis";
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { closeDialog, openDialog, type DialogExports } from "$lib/dialog";
  import type { MatchEntry } from "$lib/entry";
  import type { DetailedSingleField } from "$lib/field";
  import { modeStore } from "$lib/settings";
  import type { MatchSurvey } from "$lib/survey";
  import DeletePickListDialog from "./DeletePickListDialog.svelte";
  import EditPickListDialog from "./EditPickListDialog.svelte";

  let {
    surveyRecord,
    fields,
    entriesByTeam,
    pickList,
    index,
    canEdit = false,
    onupdate,
    ondelete,
  }: {
    surveyRecord: IDBRecord<MatchSurvey>;
    fields: DetailedSingleField[];
    entriesByTeam: Record<string, IDBRecord<MatchEntry>[]>;
    pickList: PickList;
    index: number;
    canEdit?: boolean;
    onupdate?: (pickList: PickList) => void;
    ondelete?: () => void;
  } = $props();

  let sortedTeamData = $state<{ team: string; percentage: number }[]>([]);
  let text = $derived(
    sortedTeamData
      .map((teamValue, index) => `${index + 1}\t${teamValue.team}\t${teamValue.percentage.toFixed(2)}%`)
      .join("\n"),
  );

  export const { onopen }: DialogExports = {
    onopen(open) {
      refresh();
      open();
    },
  };

  function refresh() {
    pickList = surveyRecord.pickLists[index];

    const pickListData: Record<string, number> = {};
    for (const team in entriesByTeam) {
      pickListData[team] = 0;
    }

    for (const { percentage, expressionName } of pickList.weights) {
      const teamData = calculateTeamData(expressionName, surveyRecord.expressions, entriesByTeam, fields);
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
</script>

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

  <div class="flex gap-3">
    {#if "canShare" in navigator}
      <Button onclick={() => navigator.share({ text })} class="grow basis-0">
        <Icon name="share" />
        Share
      </Button>
    {/if}

    {#if "clipboard" in navigator}
      <Button onclick={() => navigator.clipboard.writeText(text)} class="grow basis-0">
        <Icon name="copy" />
        Copy
      </Button>
    {/if}
  </div>
{/if}

{#if $modeStore == "admin" && canEdit}
  <Button
    onclick={() => {
      openDialog(EditPickListDialog, {
        surveyRecord,
        index,
        onupdate(pickList) {
          onupdate?.(pickList);
          refresh();
        },
      });
    }}
  >
    <Icon name="pen" />
    Edit
  </Button>
  <Button
    onclick={() => {
      openDialog(DeletePickListDialog, {
        ondelete() {
          ondelete?.();
          closeDialog();
        },
      });
    }}
  >
    <Icon name="trash" />
    Delete
  </Button>
{/if}
