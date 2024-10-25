<script lang="ts">
  import type { TeamInfo } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import Dialog from "$lib/components/Dialog.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import type { Entry } from "$lib/entry";
  import { countPreviousFields } from "$lib/field";
  import { modeStore } from "$lib/settings";
  import type { Survey } from "$lib/survey";

  let {
    surveyRecord = $bindable(),
    entryRecords,
  }: {
    surveyRecord: IDBRecord<Survey>;
    entryRecords: IDBRecord<Entry>[];
  } = $props();

  let dialog: ReturnType<typeof Dialog>;

  let teamInfo = $state<TeamInfo>({ team: "", entryCount: 0, matchCount: 0, isCustom: false });
  let entries = $state<IDBRecord<Entry>[]>([]);

  export function open(teamOrInfo: string | TeamInfo) {
    if (typeof teamOrInfo == "string") {
      teamInfo.team = teamOrInfo;
    } else {
      teamInfo = teamOrInfo;
    }
    entries = entryRecords.filter(filterEntries).toSorted(sortEntries);
    dialog.open();
  }

  function filterEntries(entry: IDBRecord<Entry>) {
    return entry.status != "draft" && entry.team == teamInfo.team;
  }

  function sortEntries(a: IDBRecord<Entry>, b: IDBRecord<Entry>) {
    if (a.type != "match" || b.type != "match") {
      return 0;
    }

    return b.match - a.match;
  }

  function removeTeam() {
    surveyRecord.teams = surveyRecord.teams.filter((team) => teamInfo.team != team);
    dialog.close();
  }

  function onclose() {
    teamInfo = { team: "", entryCount: 0, matchCount: 0, isCustom: false };
    entries = [];
  }
</script>

<Dialog bind:this={dialog} {onclose}>
  <span>Team {teamInfo.team}</span>
  {#if entries.length}
    <div class="flex max-h-[500px] flex-col gap-2 overflow-auto text-sm">
      <table>
        {#if surveyRecord.type == "match"}
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
          {#if surveyRecord.type == "match" && entries.some((entry) => entry.type == "match" && entry.absent)}
            <tr>
              <th class="sticky left-0 bg-neutral-800 p-2 text-left text-sm">Absent</th>
              {#each entries as entry (entry.id)}
                {#if entry.type == "match"}
                  <td class="p-2 text-center">{entry.absent}</td>
                {/if}
              {/each}
            </tr>
          {/if}
          {#each surveyRecord.fields as field, fieldIndex}
            {@const previousFields = countPreviousFields(fieldIndex, surveyRecord.fields)}
            {#if field.type == "group"}
              {#each field.fields as innerField, innerFieldIndex}
                <tr>
                  <th class="sticky left-0 bg-neutral-800 p-2 text-left text-sm">
                    <span class="font-light">{field.name}</span>
                    <div>{innerField.name}</div>
                  </th>
                  {#each entries as entry (entry.id)}
                    <td class="p-2 text-center">
                      {#if entry.type != "match" || !entry.absent}
                        {entry.values[previousFields + innerFieldIndex]}
                      {/if}
                    </td>
                  {/each}
                </tr>
              {/each}
            {:else}
              <tr>
                <th class="sticky left-0 bg-neutral-800 p-2 text-left text-sm">{field.name}</th>
                {#each entries as entry (entry.id)}
                  <td class="p-2 text-center">
                    {#if entry.type != "match" || !entry.absent}
                      {entry.values[previousFields]}
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
  {#if $modeStore == "admin" && teamInfo.isCustom}
    <Button onclick={removeTeam}>
      <Icon name="trash" />
      Delete
    </Button>
  {/if}
</Dialog>
