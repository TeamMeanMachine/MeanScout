<script lang="ts">
  import type { TeamInfo } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { closeDialog } from "$lib/dialog";
  import type { Entry } from "$lib/entry";
  import { getDetailedNestedFields } from "$lib/field";
  import { modeStore } from "$lib/settings";
  import type { PageData } from "../../routes/survey/[surveyId]/$types";

  let {
    data,
    teamInfo,
    ondelete,
  }: {
    data: PageData;
    teamInfo: TeamInfo;
    ondelete?: () => void;
  } = $props();

  const { detailedFields, detailedInnerFields } = getDetailedNestedFields(
    data.surveyRecord.fieldIds,
    data.fieldRecords,
  );

  let entries = data.entryRecords.filter(filterEntries).toSorted(sortEntries);

  function filterEntries(entry: IDBRecord<Entry>) {
    return entry.status != "draft" && entry.team == teamInfo.number;
  }

  function sortEntries(a: IDBRecord<Entry>, b: IDBRecord<Entry>) {
    if (a.type != "match" || b.type != "match") {
      return 0;
    }

    return b.match - a.match;
  }
</script>

<div class="flex flex-col">
  <span>Team {teamInfo.number}</span>
  {#if teamInfo.name}
    <small>{teamInfo.name}</small>
  {/if}
</div>

{#if entries.length}
  <div class="flex max-h-[500px] flex-col gap-2 overflow-auto text-sm">
    <table>
      {#if data.surveyType == "match"}
        <thead class="sticky top-0 z-10 bg-neutral-800">
          <tr>
            <th class="sticky left-0 z-10 w-0 bg-neutral-800 p-2 text-left text-sm">Match</th>
            {#each entries as entry (entry.id)}
              {#if entry.type == "match"}
                <th class="p-2 text-center">{entry.match}</th>
              {/if}
            {/each}
          </tr>
        </thead>
      {/if}

      <tbody>
        {#if data.surveyType == "match" && entries.some((entry) => entry.type == "match" && entry.absent)}
          <tr>
            <th class="sticky left-0 bg-neutral-800 p-2 text-left text-sm">Absent</th>
            {#each entries as entry (entry.id)}
              {#if entry.type == "match"}
                <td class="p-2 text-center">{entry.absent}</td>
              {/if}
            {/each}
          </tr>
        {/if}

        {#each data.surveyRecord.fieldIds as fieldId}
          {@const fieldDetails = detailedFields.get(fieldId)}

          {#if fieldDetails?.type == "group"}
            {#each fieldDetails.field.fieldIds as innerFieldId}
              {@const innerFieldDetails = detailedInnerFields.get(innerFieldId)}

              {#if innerFieldDetails}
                <tr>
                  <th class="sticky left-0 bg-neutral-800 p-2 text-left text-sm">
                    <span class="font-light">{fieldDetails.field.name}</span>
                    <div>{innerFieldDetails.field.name}</div>
                  </th>

                  {#each entries as entry (entry.id)}
                    <td class="p-2 text-center">
                      {#if entry.type != "match" || !entry.absent}
                        {entry.values[innerFieldDetails.valueIndex]}
                      {/if}
                    </td>
                  {/each}
                </tr>
              {/if}
            {/each}
          {:else if fieldDetails}
            <tr>
              <th class="sticky left-0 bg-neutral-800 p-2 text-left text-sm">{fieldDetails.field.name}</th>

              {#each entries as entry (entry.id)}
                <td class="p-2 text-center">
                  {#if entry.type != "match" || !entry.absent}
                    {entry.values[fieldDetails.valueIndex]}
                  {/if}
                </td>
              {/each}
            </tr>
          {/if}
        {/each}
      </tbody>
    </table>
  </div>
{/if}

{#if $modeStore == "admin" && teamInfo.isCustom && ondelete}
  <Button
    onclick={() => {
      ondelete();
      closeDialog();
    }}
  >
    <Icon name="trash" />
    Delete
  </Button>
{/if}
