<script lang="ts">
  import { compareMatches, getTeamName, matchIdentifierSchema, sessionStorageStore, type MatchIdentifier } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import ViewEntryDialog from "$lib/dialogs/ViewEntryDialog.svelte";
  import { entryStatuses, groupEntries, type Entry, type EntryStatus } from "$lib/entry";
  import { openDialog } from "$lib/dialog";
  import { idb } from "$lib/idb";
  import { targets, type Target } from "$lib/settings";
  import type { PageProps } from "./$types";
  import ImportEntriesDialog from "$lib/dialogs/ImportEntriesDialog.svelte";
  import { ChevronRightIcon, DownloadIcon, NotepadTextIcon, PlusIcon, ShareIcon } from "@lucide/svelte";
  import BulkExportDialog from "$lib/dialogs/BulkExportDialog.svelte";
  import { invalidateAll } from "$app/navigation";
  import NewEntryWidget from "$lib/components/NewEntryWidget.svelte";
  import { z } from "zod";
  import { slide } from "svelte/transition";

  let { data }: PageProps = $props();

  let newEntry = $state(!!sessionStorage.getItem("new-entry"));

  type Group =
    | { by: "survey"; surveyId: string }
    | { by: "match"; match: MatchIdentifier }
    | { by: "scout"; scout: string }
    | { by: "target"; target: Target }
    | { by: "team"; team: string; teamName?: string | undefined }
    | { by: "absent"; absent: boolean }
    | { by: "status"; status: EntryStatus };

  type GroupBy = Group["by"];

  const groupBy = sessionStorageStore<GroupBy>("entries-group", "status");

  const groupedEntries = $derived(groupEntries(data.compRecord, data.surveyRecords, data.entryRecords, $groupBy));

  const toggleStatesSchema = z
    .object({
      status: z.array(z.union(entryStatuses.map((status) => z.literal(status)))),
      survey: z.array(z.string()),
      match: z.array(matchIdentifierSchema),
      team: z.array(z.string()),
      scout: z.array(z.string()),
      target: z.array(z.union(targets.map((target) => z.literal(target)))),
      absent: z.array(z.boolean()),
    })
    .catch({
      status: ["draft", "submitted"],
      survey: [],
      match: [],
      team: [],
      scout: [],
      target: [],
      absent: [],
    });

  function getToggleStates() {
    try {
      return JSON.parse(sessionStorage.getItem("entries-toggle-states") ?? "null");
    } catch {}
  }

  const toggleStates = $state(toggleStatesSchema.parse(getToggleStates()));

  $effect(() => {
    sessionStorage.setItem("entries-toggle-states", JSON.stringify(toggleStates));
  });

  function refresh() {
    idb.put("comps", { ...$state.snapshot(data.compRecord), modified: new Date() }).onsuccess = invalidateAll;
  }

  function onbulkexport(exportedEntries: Entry[]) {
    const tx = idb.transaction(["comps", "entries"], "readwrite");
    const entryStore = tx.objectStore("entries");
    for (const entry of $state.snapshot(exportedEntries)) {
      if (entry.status == "exported") {
        continue;
      }
      entryStore.put({ ...entry, status: "exported", modified: new Date() });
    }
    tx.objectStore("comps").put({ ...$state.snapshot(data.compRecord), modified: new Date() });
    tx.oncomplete = invalidateAll;
  }
</script>

<div class="flex flex-col space-y-6 mx-auto max-w-(--breakpoint-lg) w-full mt-[57px] px-3 py-6 max-lg:mb-[65px]">
  <div class="flex flex-col gap-3">
    <div class="flex flex-col gap-1">
      <h2 class="font-bold">Entries</h2>

      <div class="flex flex-wrap justify-between gap-3 text-sm">
        <Button
          onclick={() => {
            newEntry = !newEntry;
            if (!newEntry) sessionStorage.removeItem("new-entry");
          }}
          class={["w-20 flex-col gap-1!", newEntry ? "font-bold" : ""]}
        >
          <PlusIcon class="text-theme transition-[rotate] {newEntry ? 'rotate-45' : 'rotate-0'}" />
          {newEntry ? "Cancel" : "New"}
        </Button>

        <div class="flex flex-wrap gap-2">
          {#if data.entryRecords.some((e) => e.status != "draft")}
            <Button
              onclick={() => {
                const entries = data.entryRecords.filter((e) => e.status != "draft");
                openDialog(BulkExportDialog, {
                  entries,
                  onexport: () => onbulkexport(entries),
                });
              }}
              class="w-20 flex-col gap-1!"
            >
              <ShareIcon class="text-theme" />
              Send
            </Button>
          {/if}
          <Button
            onclick={() => {
              openDialog(ImportEntriesDialog, {
                surveyRecords: data.surveyRecords,
                existingEntries: data.entryRecords,
                onimport: refresh,
              });
            }}
            class="w-20 flex-col gap-1!"
          >
            <DownloadIcon class="text-theme" />
            Receive
          </Button>
        </div>
      </div>
    </div>
  </div>

  {#if newEntry}
    <div class="flex flex-col space-y-4 border border-neutral-600 p-3 pt-0" transition:slide>
      <NewEntryWidget pageData={data} />
    </div>
  {/if}

  {#if !data.entryRecords.length}
    <span class="text-sm">No entries.</span>
  {:else}
    <select bind:value={$groupBy} class="text-theme min-w-0 grow bg-neutral-800 p-2">
      <option value="status">Group by Status</option>
      <option value="survey">Group by Survey</option>
      <option value="match">Group by Match</option>
      <option value="team">Group by Team</option>
      <option value="scout">Group by Scout</option>
      <option value="target">Group by Target</option>
      <option value="absent">Group by Absent</option>
    </select>

    {#if groupedEntries.by == "survey"}
      <div class="flex flex-col space-y-6" in:slide={{ delay: 50 }}>
        {#each groupedEntries.groups as { surveyId, entries }}
          {@const toggled = toggleStates.survey.includes(surveyId)}
          {@render entryGroup({ by: "survey", surveyId }, entries, toggled, () => {
            if (toggled) toggleStates.survey = toggleStates.survey.filter((val) => val != surveyId);
            else toggleStates.survey.push(surveyId);
          })}
        {/each}
      </div>
    {:else if groupedEntries.by == "match"}
      <div class="flex flex-col space-y-6" in:slide={{ delay: 50 }}>
        {#each groupedEntries.groups as { match, entries }}
          {@const toggled = toggleStates.match.some((m) => compareMatches(m, match) == 0)}
          {@render entryGroup({ by: "match", match }, entries, toggled, () => {
            if (toggled) toggleStates.match = toggleStates.match.filter((m) => compareMatches(m, match) != 0);
            else toggleStates.match.push(match);
          })}
        {/each}
      </div>
    {:else if groupedEntries.by == "scout"}
      <div class="flex flex-col space-y-6" in:slide={{ delay: 50 }}>
        {#each groupedEntries.groups as { scout, entries }}
          {@const toggled = toggleStates.scout.includes(scout)}
          {@render entryGroup({ by: "scout", scout }, entries, toggled, () => {
            if (toggled) toggleStates.scout = toggleStates.scout.filter((val) => val != scout);
            else toggleStates.scout.push(scout);
          })}
        {/each}
      </div>
    {:else if groupedEntries.by == "target"}
      <div class="flex flex-col space-y-6" in:slide={{ delay: 50 }}>
        {#each groupedEntries.groups as { target, entries }}
          {@const toggled = toggleStates.target.includes(target)}
          {@render entryGroup({ by: "target", target }, entries, toggled, () => {
            if (toggled) toggleStates.target = toggleStates.target.filter((val) => val != target);
            else toggleStates.target.push(target);
          })}
        {/each}
      </div>
    {:else if groupedEntries.by == "team"}
      <div class="flex flex-col space-y-6" in:slide={{ delay: 50 }}>
        {#each groupedEntries.groups as { team, teamName, entries }}
          {@const toggled = toggleStates.team.includes(team)}
          {@render entryGroup({ by: "team", team, teamName }, entries, toggled, () => {
            if (toggled) toggleStates.team = toggleStates.team.filter((val) => val != team);
            else toggleStates.team.push(team);
          })}
        {/each}
      </div>
    {:else if groupedEntries.by == "absent"}
      <div class="flex flex-col space-y-6" in:slide={{ delay: 50 }}>
        {#each groupedEntries.groups as { absent, entries }}
          {@const toggled = toggleStates.absent.includes(absent)}
          {@render entryGroup({ by: "absent", absent }, entries, toggled, () => {
            if (toggled) toggleStates.absent = toggleStates.absent.filter((val) => val != absent);
            else toggleStates.absent.push(absent);
          })}
        {/each}
      </div>
    {:else}
      <div class="flex flex-col space-y-6" in:slide={{ delay: 50 }}>
        {#each groupedEntries.groups as { status, entries }}
          {@const toggled = toggleStates.status.includes(status)}
          {@render entryGroup({ by: "status", status }, entries, toggled, () => {
            if (toggled) toggleStates.status = toggleStates.status.filter((val) => val != status);
            else toggleStates.status.push(status);
          })}
        {/each}
      </div>
    {/if}
  {/if}
</div>

{#snippet entryGroup(group: Group, entries: Entry[], toggled: boolean, toggle: () => void)}
  <div class="flex flex-col space-y-2">
    <div class="flex gap-2">
      <Button onclick={toggle} class="grow">
        <ChevronRightIcon class="text-theme transition-[rotate] {toggled ? 'rotate-90' : 'rotate-0'}" />

        <div class="flex grow items-center justify-between gap-x-1">
          {#if group.by == "survey"}
            <span class={toggled ? "font-bold" : "font-light"}>
              {data.surveyRecords.find((s) => s.id == group.surveyId)?.name}
            </span>
          {:else if group.by == "match"}
            <span class={toggled ? "font-bold" : "font-light"}>
              {#if group.match.level && group.match.level != "qm"}
                {group.match.level}{group.match.set || 1}-{group.match.number}
              {:else}
                {group.match.number}
              {/if}
            </span>
          {:else if group.by == "scout"}
            <span class={toggled ? "font-bold" : "font-light"}>{group.scout || "No name"}</span>
          {:else if group.by == "target"}
            <span class="capitalize {toggled ? 'font-bold' : 'font-light'}">{group.target}</span>
          {:else if group.by == "team"}
            <div class="flex flex-col">
              <span class="font-bold">{group.team}</span>
              {#if group.teamName}
                <span class="text-xs {toggled ? 'font-bold' : 'font-light'}">{group.teamName}</span>
              {/if}
            </div>
          {:else if group.by == "absent"}
            <span class="capitalize {toggled ? 'font-bold' : 'font-light'}">{group.absent}</span>
          {:else}
            <span class="capitalize {toggled ? 'font-bold' : 'font-light'}">{group.status}</span>
          {/if}

          <div class="flex gap-0.5 text-sm">
            {entries.length}<NotepadTextIcon class="size-4" />
          </div>
        </div>
      </Button>

      <Button
        onclick={() => {
          openDialog(BulkExportDialog, {
            entries,
            onexport: () => onbulkexport(entries),
          });
        }}
      >
        <ShareIcon class="text-theme size-5" />
      </Button>
    </div>

    {#if toggled}
      <div class="flex flex-col gap-2" transition:slide>
        {#each entries as entry (entry.id)}
          {@const survey = data.surveyRecords.find((survey) => survey.id == entry.surveyId)}

          <Button
            onclick={() => {
              openDialog(ViewEntryDialog, {
                compRecord: data.compRecord,
                surveyRecord: survey!,
                fieldRecords: data.fieldRecords,
                entryRecord: entry,
                onchange: refresh,
              });
            }}
            class="gap-x-4"
          >
            {#if entry.type == "match" && groupedEntries.by != "match"}
              <div class="flex w-9 flex-col text-nowrap">
                <span class="text-xs font-light">Match</span>
                <div>
                  {#if entry.matchLevel && entry.matchLevel != "qm"}
                    <span class="text-xs">{entry.matchLevel}{entry.matchSet || 1}-{entry.match}</span>
                  {:else}
                    {entry.match}
                  {/if}
                </div>
              </div>
            {:else if entry.type == "pit" && groupedEntries.by != "survey" && groupedEntries.by != "target"}
              <div class="flex w-9 flex-col">
                <span class="text-sm">Pit</span>
              </div>
            {/if}

            {#if groupedEntries.by != "team"}
              <div class="flex w-32 max-w-full flex-col">
                <span class="overflow-hidden text-xs font-light text-nowrap text-ellipsis">
                  {getTeamName(entry.team, data.compRecord.teams) || "Team"}
                </span>
                <span>{entry.team}</span>
              </div>
            {/if}

            {#if groupedEntries.by != "scout" && entry.scout}
              <div class="flex w-24 max-w-full flex-col">
                <span class="text-xs font-light text-wrap">Scout</span>
                <span class="overflow-hidden text-nowrap text-ellipsis">{entry.scout}</span>
              </div>
            {/if}

            <div class="flex flex-col">
              {#if groupedEntries.by != "absent" && entry.type == "match" && entry.absent}
                <span class="text-xs">Absent</span>
              {/if}

              {#if groupedEntries.by != "status" && entry.status != "submitted"}
                <span class="text-xs capitalize">{entry.status}</span>
              {/if}
            </div>
          </Button>
        {/each}
      </div>
    {/if}
  </div>
{/snippet}
