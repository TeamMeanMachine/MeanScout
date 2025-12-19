<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import FieldValueEditor from "$lib/components/FieldValueEditor.svelte";
  import Header from "$lib/components/Header.svelte";
  import { closeDialog, openDialog } from "$lib/dialog";
  import DeleteEntryDialog from "$lib/dialogs/DeleteEntryDialog.svelte";
  import SubmitEntryDialog from "$lib/dialogs/SubmitEntryDialog.svelte";
  import { idb } from "$lib/idb";
  import type { PageData, PageProps } from "./$types";
  import {
    ListOrderedIcon,
    SaveIcon,
    SquareCheckBigIcon,
    SquareIcon,
    Trash2Icon,
    UserSearchIcon,
    UsersIcon,
  } from "@lucide/svelte";
  import { goto } from "$app/navigation";
  import SelectScoutDialog from "$lib/dialogs/SelectScoutDialog.svelte";
  import SelectTeamDialog from "$lib/dialogs/SelectTeamDialog.svelte";
  import { getAllMatches, getTeamName, type MatchIdentifier, type Team } from "$lib";
  import SelectMatchDialog from "$lib/dialogs/SelectMatchDialog.svelte";
  import { slide } from "svelte/transition";

  let { data }: PageProps = $props();

  let entry = $state(structuredClone($state.snapshot(data.entryRecord)));

  let error = $state("");

  const { matches, lastCompletedMatch } = $derived(getAllMatches(data.compRecord, data.thisCompEntries));

  const matchIdentifier = $derived<MatchIdentifier | undefined>(
    entry.type == "match" ? { number: entry.match, set: entry.matchSet, level: entry.matchLevel } : undefined,
  );

  const allTeams = $derived.by(() => {
    const teamSet = new Set<string>();

    data.compRecord.teams.forEach((t) => teamSet.add(t.number));

    if (entry.type == "match") {
      matches.forEach((m) => {
        [m.red1, m.red2, m.red3, m.blue1, m.blue2, m.blue3, ...(m.extraTeams || [])].forEach((t) => {
          if (t) teamSet.add(t);
        });
      });
    }

    data.thisCompEntries.forEach((e) => {
      if (e.surveyId == data.compRecord.id) {
        teamSet.add(e.team);
      }
    });

    return [...teamSet]
      .map((team): Team => ({ number: team, name: getTeamName(team, data.compRecord.teams) || "" }))
      .toSorted((a, b) => a.number.localeCompare(b.number, "en", { numeric: true }));
  });

  const suggestedScouts = $derived(
    new Set([
      ...data.thisCompEntries.map((entry) => entry.scout).filter((scout) => scout !== undefined),
      ...(data.compRecord.scouts || []),
    ])
      .values()
      .toArray()
      .toSorted((a, b) => a.localeCompare(b)),
  );

  async function onchange() {
    entry.modified = new Date();
    data = {
      ...data,
      entryRecord: $state.snapshot(entry),
      surveyRecord: { ...data.surveyRecord, modified: new Date() },
      compRecord: { ...data.compRecord, modified: new Date() },
    } as PageData;
    const changeTx = idb.transaction(["entries", "surveys", "comps"], "readwrite");
    changeTx.objectStore("entries").put($state.snapshot(data.entryRecord));
    changeTx.objectStore("surveys").put($state.snapshot(data.surveyRecord));
    changeTx.objectStore("comps").put($state.snapshot(data.compRecord));
  }
</script>

<Header
  title="{data.title} - {data.surveyRecord.name} - {data.compRecord.name} - MeanScout"
  heading="Entry"
  subheading={data.surveyRecord.name}
  backLink={sessionStorage.getItem("home") || `comp/${data.compRecord.id}`}
/>

<div class="mx-auto mt-[69px] mb-3 w-full max-w-(--breakpoint-lg) p-3">
  <div class="flex gap-4 mb-6 max-sm:flex-col">
    {#if data.compRecord.scouts || entry.scout}
      <Button
        onclick={() => {
          openDialog(SelectScoutDialog, {
            scouts: suggestedScouts,
            prefilled: entry.scout || "",
            onselect(scout) {
              entry.scout = scout;
              onchange();
              localStorage.setItem("scout", scout);
            },
          });
        }}
        class="grow truncate"
      >
        <UserSearchIcon class="text-theme" />
        {#if entry.scout}
          <div class="flex flex-col grow truncate sm:w-32">
            <span class="text-xs font-light">Scout</span>
            <span class="truncate">{entry.scout}</span>
          </div>
        {:else}
          <div class="flex flex-col grow">
            <span class="text-xs font-light">Scout</span>
            Add
          </div>
        {/if}
      </Button>
    {/if}

    {#if entry.type == "match" && matchIdentifier}
      <Button
        onclick={() => {
          if (!matchIdentifier) return;
          openDialog(SelectMatchDialog, {
            matches,
            lastCompletedMatch,
            prefilled: matchIdentifier,
            onselect(match) {
              entry.match = match.number;
              entry.matchSet = match.set;
              entry.matchLevel = match.level || "qm";
              onchange();
              closeDialog();
            },
          });
        }}
        class="grow"
      >
        <ListOrderedIcon class="text-theme" />
        <div class="flex flex-col sm:w-16">
          <span class="text-xs font-light">Match</span>
          <span class="font-bold text-nowrap">
            {#if entry.matchLevel && entry.matchLevel != "qm"}
              {entry.matchLevel}{entry.matchSet || 1}-{entry.match}
            {:else}
              {entry.match}
            {/if}
          </span>
        </div>
      </Button>
    {/if}

    <Button
      onclick={() => {
        openDialog(SelectTeamDialog, {
          teams: allTeams,
          prefilled: entry.team,
          onselect(team) {
            entry.team = team;
            onchange();
          },
        });
      }}
      class="truncate grow"
    >
      <UsersIcon class="text-theme" />
      <div class="flex grow flex-col truncate sm:w-32">
        <span class="text-xs font-light truncate">{getTeamName(entry.team, allTeams) || "Team"}</span>
        <span class="font-bold">{entry.team}</span>
      </div>
    </Button>

    {#if entry.type == "match"}
      <Button
        onclick={() => {
          entry.absent = !entry.absent;
          onchange();
        }}
        class="grow"
      >
        {#if entry.absent}
          <SquareCheckBigIcon class="text-theme" />
        {:else}
          <SquareIcon class="text-theme" />
        {/if}
        <div class="flex flex-col sm:w-28">
          <span class={entry.absent ? "font-bold" : "font-light"}>Absent</span>
          <span class="text-xs font-light">Robot no-showed</span>
        </div>
      </Button>
    {/if}
  </div>

  {#if entry.type != "match" || !entry.absent}
    <div class="flex flex-col gap-6 mb-6" transition:slide>
      {#each data.fieldsWithDetails.topLevel as fieldDetails (fieldDetails.field.id)}
        {#if fieldDetails.type == "group"}
          {@const nestedFields = fieldDetails.field.fieldIds
            .map((id) => data.fieldsWithDetails.nested.find((f) => f.field.id == id))
            .filter((f) => f !== undefined)}

          <div class="flex w-full flex-col gap-2">
            <h2 class="font-bold">{fieldDetails.field.name}</h2>

            <div class="flex mb-2 flex-wrap items-end gap-x-6 gap-y-3">
              {#each nestedFields as nestedFieldDetails (nestedFieldDetails.field.id)}
                <FieldValueEditor
                  field={nestedFieldDetails.field}
                  bind:value={entry.values[nestedFieldDetails.valueIndex]}
                  {onchange}
                />
              {/each}
            </div>
          </div>
        {:else}
          <FieldValueEditor field={fieldDetails.field} bind:value={entry.values[fieldDetails.valueIndex]} {onchange} />
        {/if}
      {/each}
    </div>
  {/if}

  <div class="mb-4 flex flex-wrap justify-between gap-2">
    <Button
      onclick={() => {
        for (let i = 0; i < entry.values.length; i++) {
          const value = entry.values[i];
          if (typeof value !== typeof data.defaultValues[i]) {
            error = `Invalid value for ${data.fieldsWithDetails.orderedSingle[i].field.name}`;
            return;
          }
        }

        openDialog(SubmitEntryDialog, {
          orderedSingleFields: data.fieldsWithDetails.orderedSingle,
          entryRecord: entry,
          onsubmit() {
            const tx = idb.transaction(["comps", "surveys"], "readwrite");
            tx.objectStore("surveys").put({ ...$state.snapshot(data.surveyRecord), modified: new Date() });
            tx.objectStore("comps").put({ ...$state.snapshot(data.compRecord), modified: new Date() });
            tx.oncomplete = () => {
              goto(`#/comp/${data.compRecord.id}`, { invalidateAll: true });
            };
          },
        });
      }}
      class="font-bold"
    >
      <SaveIcon class="text-theme" />
      Submit
    </Button>

    <Button
      onclick={() =>
        openDialog(DeleteEntryDialog, {
          entryRecord: data.entryRecord,
          ondelete() {
            const tx = idb.transaction(["comps", "surveys"], "readwrite");
            tx.objectStore("surveys").put({ ...$state.snapshot(data.surveyRecord), modified: new Date() });
            tx.objectStore("comps").put({ ...$state.snapshot(data.compRecord), modified: new Date() });
            tx.oncomplete = () => {
              goto(`#/comp/${data.compRecord.id}`, { invalidateAll: true, replaceState: true });
            };
          },
        })}
    >
      <Trash2Icon class="text-theme" />
    </Button>

    {#if error}
      <span class="w-full">Error: {error}</span>
    {/if}
  </div>
</div>
