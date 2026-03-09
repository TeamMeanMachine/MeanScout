<script lang="ts">
  import { ChevronRightIcon } from "@lucide/svelte";
  import type { Entry } from "$lib/entry";
  import type { AllData } from "$lib/idb";
  import type { ImportedData } from "$lib/import.svelte";
  import { compareMatches } from "$lib/match";
  import type { ClientInfo } from "$lib/online-transfer.svelte";
  import Button from "./Button.svelte";

  let {
    imported,
    existing,
    overwriteDuplicateEntries,
    client,
  }: {
    imported: ImportedData;
    existing: AllData;
    overwriteDuplicateEntries: boolean;
    client?: ClientInfo;
  } = $props();

  let viewEntries = $state(false);

  const importedIds = $derived({
    comps: new Set(imported.comps?.map((c) => c.id)),
    surveys: new Set(imported.surveys?.map((s) => s.id)),
    fields: new Set(imported.fields?.map((f) => f.id)),
    entries: new Set(imported.entries?.map((e) => e.id)),
  });

  const existingIds = $derived({
    comps: new Set(existing.comps?.map((c) => c.id)),
    surveys: new Set(existing.surveys?.map((s) => s.id)),
    fields: new Set(existing.fields?.map((f) => f.id)),
    entries: new Set(existing.entries?.map((e) => e.id)),
  });

  const duplicateIds = $derived({
    comps: importedIds.comps.intersection(existingIds.comps),
    surveys: importedIds.surveys.intersection(existingIds.surveys),
    fields: importedIds.fields.intersection(existingIds.fields),
    entries: importedIds.entries.intersection(existingIds.entries),
  });

  function sortEntries(a: Entry, b: Entry) {
    const duplicateCompare = Number(duplicateIds.entries.has(a.id)) - Number(duplicateIds.entries.has(b.id));
    const teamCompare = a.team.localeCompare(b.team, "en", { numeric: true });
    const typeCompare = Number(a.type == "match") - Number(b.type == "match");
    const matchCompare = a.type == "match" && b.type == "match" ? compareMatches(b, a) : 0;
    const scoutCompare = a.scout?.localeCompare(b.scout || "") || 0;
    return duplicateCompare || typeCompare || matchCompare || teamCompare || scoutCompare;
  }
</script>

{#if client}
  <span>
    From: {client.name}
    {#if client.team}
      <span class="text-xs font-light">({client.team})</span>
    {/if}
  </span>
{/if}

<div class="-m-1 flex max-h-[500px] flex-col gap-2 overflow-auto p-1">
  {#if imported.comps?.length || imported.surveys?.length || imported.fields?.length}
    <div class="grid items-center gap-x-3 gap-y-1 text-sm" style="grid-template-columns:min-content auto auto">
      <div class="text-xs font-light">Configs</div>
      <div class="text-xs font-light">Existing</div>
      <div class="text-xs font-light">{client ? "Incoming" : "Imported"}</div>

      {#each imported.comps as importedComp}
        {@const existingComp = existing.comps?.find((c) => c.id == importedComp.id)}
        {#if existingComp}
          <div class="text-base">Comp</div>
          <div class="text-base">{existingComp.name}</div>
          <div class="text-base">{importedComp.name}</div>

          <div class="text-xs font-light text-nowrap">Event Key</div>
          <div>{existingComp.tbaEventKey || "-"}</div>
          <div>{importedComp.tbaEventKey || "-"}</div>

          <div class="text-xs font-light">Matches</div>
          <div>{existingComp.matches.length || "-"}</div>
          <div>{importedComp.matches.length || "-"}</div>

          <div class="text-xs font-light">Teams</div>
          <div>{existingComp.teams.length || "-"}</div>
          <div>{importedComp.teams.length || "-"}</div>

          <div class="text-xs font-light">Scouts</div>
          <div>{existingComp.scouts?.length || "-"}</div>
          <div>{importedComp.scouts?.length || "-"}</div>
        {:else}
          <div class="text-base">New comp</div>
          <div class="text-base"></div>
          <div class="text-base">{importedComp.name}</div>

          <div class="text-xs font-light text-nowrap">Event Key</div>
          <div></div>
          <div>{importedComp.tbaEventKey || "-"}</div>

          <div class="text-xs font-light">Matches</div>
          <div></div>
          <div>{importedComp.matches.length || "-"}</div>

          <div class="text-xs font-light">Teams</div>
          <div></div>
          <div>{importedComp.teams.length || "-"}</div>

          <div class="text-xs font-light">Scouts</div>
          <div></div>
          <div>{importedComp.scouts?.length || "-"}</div>
        {/if}
      {/each}

      {#each imported.surveys as importedSurvey}
        {@const existingSurvey = existing.surveys?.find((s) => s.id == importedSurvey.id)}
        {@const existingSurveyFields = existing.fields?.filter((f) => f.surveyId == importedSurvey.id)}
        {@const importedSurveyFields = imported.fields?.filter((f) => f.surveyId == importedSurvey.id)}

        {#if existingSurvey}
          <div class="text-base">Survey</div>
          <div class="text-base">{existingSurvey.name}</div>
          <div class="text-base">{importedSurvey.name}</div>

          <div class="text-xs font-light">Fields</div>
          <div>{existingSurveyFields?.length || "-"}</div>
          <div>{importedSurveyFields?.length || "-"}</div>

          {#if existingSurvey.type == "match" && importedSurvey.type == "match"}
            <div class="text-xs font-light">Pick Lists</div>
            <div>{existingSurvey.pickLists.length}</div>
            <div>{importedSurvey.pickLists.length}</div>

            <div class="text-xs font-light">Expressions</div>
            <div>{existingSurvey.expressions.length}</div>
            <div>{importedSurvey.expressions.length}</div>
          {/if}
        {:else}
          <div class="text-base">New survey</div>
          <div class="text-base"></div>
          <div class="text-base">{importedSurvey.name}</div>

          <div class="text-xs font-light">Fields</div>
          <div>{existingSurveyFields?.length || "-"}</div>
          <div>{importedSurveyFields?.length || "-"}</div>

          {#if importedSurvey.type == "match"}
            <div class="text-xs font-light">Pick Lists</div>
            <div></div>
            <div>{importedSurvey.pickLists.length}</div>

            <div class="text-xs font-light">Expressions</div>
            <div></div>
            <div>{importedSurvey.expressions.length}</div>
          {/if}
        {/if}
      {/each}
    </div>
  {/if}

  {#if imported.entries?.length}
    {@const someMatchSurveys = [...(existing.surveys || []), ...(imported.surveys || [])].some(
      (survey) => survey.type == "match",
    )}

    <div class="flex flex-col gap-2">
      <Button onclick={() => (viewEntries = !viewEntries)}>
        <ChevronRightIcon class="text-theme transition-[rotate] {viewEntries ? 'rotate-90' : 'rotate-0'}" />
        <div class="flex flex-col">
          <span
            class={duplicateIds.entries.size &&
            !overwriteDuplicateEntries &&
            imported.entries.length == duplicateIds.entries.size
              ? "line-through opacity-60"
              : ""}
          >
            {client ? "Incoming" : "Imported"} entries: {imported.entries.length}
          </span>
          {#if duplicateIds.entries.size}
            <span class={["text-xs font-light", !overwriteDuplicateEntries && "line-through opacity-60"]}>
              Duplicates: {duplicateIds.entries.size}
            </span>
          {/if}
        </div>
      </Button>

      {#if viewEntries}
        <table class="w-full text-left">
          <thead>
            <tr>
              <th class="w-0 p-2 text-center">Team</th>
              {#if someMatchSurveys}
                <th class="w-0 p-2">Match</th>
                <th class="w-0 p-2">Absent</th>
              {/if}
              {#if duplicateIds.entries.size}
                <th class="w-0 p-2">Duplicate</th>
              {/if}
              <td></td>
            </tr>
          </thead>
          <tbody>
            {#each imported.entries.toSorted(sortEntries) as importedEntry}
              {@const isSkipping = !overwriteDuplicateEntries && duplicateIds.entries.has(importedEntry.id)}

              <tr class={isSkipping ? "line-through opacity-60" : ""}>
                <td class="p-2 text-center">{importedEntry.team}</td>
                {#if someMatchSurveys}
                  <td class="p-2 text-center">
                    {#if importedEntry.type == "match" && importedEntry.matchLevel && importedEntry.matchLevel != "qm"}
                      {importedEntry.matchLevel}{importedEntry.matchSet || 1}-{importedEntry.match}
                    {:else if importedEntry.type == "match"}
                      {importedEntry.match}
                    {/if}
                  </td>
                  <td class="p-2 text-center">{importedEntry.type == "match" ? importedEntry.absent || "" : ""}</td>
                {/if}
                {#if duplicateIds.entries.size}
                  <td class="p-2">
                    {#if isSkipping}
                      Skipping
                    {:else if duplicateIds.entries.has(importedEntry.id)}
                      Yes
                    {/if}
                  </td>
                {/if}
                <td></td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </div>
  {/if}
</div>
