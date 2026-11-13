<script lang="ts">
  import { ChevronRightIcon, NotepadTextIcon, ShareIcon, SquarePenIcon } from "@lucide/svelte";
  import { slide } from "svelte/transition";
  import { z } from "zod";
  import { goto } from "$app/navigation";
  import type { PageProps } from "./$types";
  import { getTeamName, rerunAllContextLoads } from "#lib";
  import Button from "#lib/components/Button.svelte";
  import { openDialog } from "#lib/dialog.ts";
  import BulkExportDialog from "#lib/dialogs/BulkExportDialog.svelte";
  import SelectMatchDialog from "#lib/dialogs/SelectMatchDialog.svelte";
  import SelectScoutDialog from "#lib/dialogs/SelectScoutDialog.svelte";
  import ViewEntryDialog from "#lib/dialogs/ViewEntryDialog.svelte";
  import { entryStatuses, type Entry, type EntryGroupInfo } from "#lib/entry.ts";
  import { idb } from "#lib/idb.ts";
  import { compareMatches, matchIdentifierSchema } from "#lib/match.ts";
  import { targets } from "#lib/settings.ts";

  let { data }: PageProps = $props();

  const toggleStatesSchema = z
    .object({
      status: z.array(z.union(entryStatuses.map((status) => z.literal(status)))),
      survey: z.array(z.string()),
      match: z.array(matchIdentifierSchema),
      team: z.array(z.string()),
      scout: z.array(z.object({ name: z.string(), team: z.string().optional() })),
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
    idb.put("comps", { ...$state.snapshot(data.compRecord), modified: Date.now() }).onsuccess = rerunAllContextLoads;
  }
</script>

<div class="mt-14.25 flex grow flex-col space-y-6 overflow-x-hidden px-3 py-6 max-lg:mb-16.25 lg:ml-80">
  <div class="flex flex-col">
    <h2 class="font-bold">Entries</h2>
    <span class="text-xs font-light">Grouped by <span class="capitalize">{data.groupBy}</span></span>
  </div>

  {#if data.groupedEntries.by == "survey"}
    <div class="flex flex-col space-y-6" in:slide={{ delay: 50 }}>
      {#each data.groupedEntries.groups as { surveyId, entries }}
        {@const toggled = toggleStates.survey.includes(surveyId)}
        {@render entryGroup({ by: "survey", surveyId }, entries, toggled, () => {
          if (toggled) toggleStates.survey = toggleStates.survey.filter((val) => val != surveyId);
          else toggleStates.survey.push(surveyId);
        })}
      {/each}
    </div>
  {:else if data.groupedEntries.by == "match"}
    <div class="flex flex-col space-y-6" in:slide={{ delay: 50 }}>
      {#each data.groupedEntries.groups as { match, entries }}
        {@const toggled = toggleStates.match.some((m) => compareMatches(m, match) == 0)}
        {@render entryGroup({ by: "match", match }, entries, toggled, () => {
          if (toggled) toggleStates.match = toggleStates.match.filter((m) => compareMatches(m, match) != 0);
          else toggleStates.match.push(match);
        })}
      {/each}
    </div>
  {:else if data.groupedEntries.by == "scout"}
    <div class="flex flex-col space-y-6" in:slide={{ delay: 50 }}>
      {#each data.groupedEntries.groups as { scout, entries }}
        {@const toggled = toggleStates.scout.some((s) => s.name == scout.name && s.team == scout.team)}
        {@render entryGroup({ by: "scout", scout }, entries, toggled, () => {
          if (toggled)
            toggleStates.scout = toggleStates.scout.filter(
              (val) => !(val.name == scout.name && val.team == scout.team),
            );
          else toggleStates.scout.push(scout);
        })}
      {/each}
    </div>
  {:else if data.groupedEntries.by == "target"}
    <div class="flex flex-col space-y-6" in:slide={{ delay: 50 }}>
      {#each data.groupedEntries.groups as { target, entries }}
        {@const toggled = toggleStates.target.includes(target)}
        {@render entryGroup({ by: "target", target }, entries, toggled, () => {
          if (toggled) toggleStates.target = toggleStates.target.filter((val) => val != target);
          else toggleStates.target.push(target);
        })}
      {/each}
    </div>
  {:else if data.groupedEntries.by == "team"}
    <div class="flex flex-col space-y-6" in:slide={{ delay: 50 }}>
      {#each data.groupedEntries.groups as { team, teamName, isUnrecognized, entries }}
        {@const toggled = toggleStates.team.includes(team)}
        {@render entryGroup({ by: "team", team, teamName, isUnrecognized }, entries, toggled, () => {
          if (toggled) toggleStates.team = toggleStates.team.filter((val) => val != team);
          else toggleStates.team.push(team);
        })}
      {/each}
    </div>
  {:else if data.groupedEntries.by == "absent"}
    <div class="flex flex-col space-y-6" in:slide={{ delay: 50 }}>
      {#each data.groupedEntries.groups as { absent, entries }}
        {@const toggled = toggleStates.absent.includes(absent)}
        {@render entryGroup({ by: "absent", absent }, entries, toggled, () => {
          if (toggled) toggleStates.absent = toggleStates.absent.filter((val) => val != absent);
          else toggleStates.absent.push(absent);
        })}
      {/each}
    </div>
  {:else}
    <div class="flex flex-col space-y-6" in:slide={{ delay: 50 }}>
      {#each data.groupedEntries.groups as { status, entries }}
        {@const toggled = toggleStates.status.includes(status)}
        {@render entryGroup({ by: "status", status }, entries, toggled, () => {
          if (toggled) toggleStates.status = toggleStates.status.filter((val) => val != status);
          else toggleStates.status.push(status);
        })}
      {/each}
    </div>
  {/if}
</div>

{#snippet entryGroup(groupInfo: EntryGroupInfo, entries: Entry[], toggled: boolean, toggle: () => void)}
  <div class="flex flex-col">
    <div class="flex gap-2">
      <Button onclick={toggle} class="grow">
        <ChevronRightIcon class="text-theme transition-[rotate] {toggled ? 'rotate-90' : 'rotate-0'}" />

        <div class="flex grow items-center justify-between gap-x-1">
          {#if groupInfo.by == "survey"}
            <span class={toggled ? "font-bold" : "font-light"}>
              {data.surveyRecords.find((s) => s.id == groupInfo.surveyId)?.name}
            </span>
          {:else if groupInfo.by == "match"}
            <span class={toggled ? "font-bold" : "font-light"}>
              {#if groupInfo.match.level && groupInfo.match.level != "qm"}
                {groupInfo.match.level}{groupInfo.match.set || 1}-{groupInfo.match.number}
              {:else}
                {groupInfo.match.number}
              {/if}
            </span>
          {:else if groupInfo.by == "scout"}
            <div class={["flex flex-col", toggled ? "font-bold" : "font-light"]}>
              {groupInfo.scout.name || "No name"}
              {#if groupInfo.scout.team}
                <span class="text-xs font-light">{groupInfo.scout.team}</span>
              {/if}
            </div>
          {:else if groupInfo.by == "target"}
            <span class="capitalize {toggled ? 'font-bold' : 'font-light'}">{groupInfo.target}</span>
          {:else if groupInfo.by == "team"}
            <div class="flex flex-col">
              <span class="font-bold">{groupInfo.team}</span>
              {#if groupInfo.teamName}
                <span class="text-xs {toggled ? 'font-bold' : 'font-light'}">{groupInfo.teamName}</span>
              {/if}
            </div>
          {:else if groupInfo.by == "absent"}
            <span class="capitalize {toggled ? 'font-bold' : 'font-light'}">{groupInfo.absent}</span>
          {:else}
            <span class="capitalize {toggled ? 'font-bold' : 'font-light'}">{groupInfo.status}</span>
          {/if}

          <div class="flex gap-0.5 text-sm">
            {entries.length}<NotepadTextIcon class="size-4" />
          </div>
        </div>
      </Button>

      <Button onclick={() => openDialog(BulkExportDialog, { send: "entries", entries })}>
        <ShareIcon class="size-5 text-theme" />
      </Button>
    </div>

    {#if toggled}
      <div class="mt-2 flex flex-col gap-2" transition:slide>
        {@render bulkEditButton(groupInfo, entries)}

        {#each entries as entry (entry.id)}
          {@const survey = data.surveyRecords.find((survey) => survey.id == entry.surveyId)}

          <Button
            onclick={() => {
              if (entry.status == "draft") {
                goto(`#/entry/${entry.id}`);
              } else {
                openDialog(ViewEntryDialog, {
                  compRecord: data.compRecord,
                  surveyRecord: survey!,
                  fieldRecords: data.fieldRecords,
                  entryRecord: entry,
                  onchange: refresh,
                });
              }
            }}
            class="gap-x-4"
          >
            {#if entry.type == "match" && data.groupedEntries.by != "match"}
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
            {:else if entry.type == "pit" && data.groupedEntries.by != "survey" && data.groupedEntries.by != "target"}
              <div class="flex w-9 flex-col">
                <span class="text-sm">Pit</span>
              </div>
            {/if}

            {#if data.groupedEntries.by != "team"}
              <div class="flex w-32 max-w-full flex-col">
                <span class="overflow-hidden text-xs font-light text-nowrap text-ellipsis">
                  {getTeamName(entry.team, data.compRecord.teams) || "Team"}
                </span>
                <span>{entry.team}</span>
              </div>
            {/if}

            {#if data.groupedEntries.by != "scout" && entry.scout}
              <div class="flex w-24 max-w-full flex-col">
                <span class="text-xs font-light text-wrap">
                  Scout
                  {#if entry.scoutTeam}
                    ({entry.scoutTeam})
                  {/if}
                </span>
                <span class="overflow-hidden text-nowrap text-ellipsis">{entry.scout}</span>
              </div>
            {/if}

            <div class="flex flex-col">
              {#if data.groupedEntries.by != "absent" && entry.type == "match" && entry.absent}
                <span class="text-xs">Absent</span>
              {/if}

              {#if data.groupedEntries.by != "status" && entry.status != "submitted"}
                <span class="text-xs capitalize">{entry.status}</span>
              {/if}
            </div>
          </Button>
        {/each}
      </div>
    {/if}
  </div>
{/snippet}

{#snippet bulkEditButton(groupInfo: EntryGroupInfo, entries: Entry[])}
  <Button
    onclick={() => {
      if (groupInfo.by == "scout") {
        openDialog(SelectScoutDialog, {
          scouts: data.suggestedScouts,
          prefilled: groupInfo.scout.name,
          prefilledTeam: groupInfo.scout.team || "",
          editingBulk: true,
          onselect(scout, team) {},
        });
      } else if (groupInfo.by == "match") {
        openDialog(SelectMatchDialog, {
          matches: data.matches,
          prefilled: groupInfo.match,
          onselect(selected) {},
        });
      }
    }}
    class="self-start text-sm"
  >
    <SquarePenIcon class="size-5 text-theme" />
    Bulk edit
  </Button>
{/snippet}
