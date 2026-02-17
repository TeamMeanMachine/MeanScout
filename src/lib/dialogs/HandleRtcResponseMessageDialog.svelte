<script lang="ts">
  import { ChevronRightIcon, CircleCheckBigIcon, CircleIcon } from "@lucide/svelte";
  import { compareMatches, type Match, type Team } from "$lib";
  import type { Comp } from "$lib/comp";
  import Button from "$lib/components/Button.svelte";
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import type { Entry, TbaMetrics } from "$lib/entry";
  import type { Field } from "$lib/field";
  import { idb } from "$lib/idb";
  import type { ClientInfo, RTCResponseMessage } from "$lib/online-transfer.svelte";
  import type { MatchSurvey, PitSurvey, Survey } from "$lib/survey";

  let {
    message,
    client,
    existing,
    onhandle,
  }: {
    message: RTCResponseMessage;
    client: ClientInfo;
    existing: {
      comps?: Comp[] | undefined;
      surveys?: Survey[] | undefined;
      fields?: Field[] | undefined;
      entries?: Entry[] | undefined;
    };
    onhandle(action: "accept-overwrite-entries" | "accept-no-overwrite-entries" | "ignore"): void;
  } = $props();

  const incomingIds = {
    comps: new Set(message.comps?.map((c) => c.id)),
    surveys: new Set(message.surveys?.map((s) => s.id)),
    fields: new Set(message.fields?.map((f) => f.id)),
    entries: new Set(message.entries?.map((e) => e.id)),
  };

  const existingIds = {
    comps: new Set(existing.comps?.map((c) => c.id)),
    surveys: new Set(existing.surveys?.map((s) => s.id)),
    fields: new Set(existing.fields?.map((f) => f.id)),
    entries: new Set(existing.entries?.map((e) => e.id)),
  };

  const duplicateIds = {
    comps: incomingIds.comps.intersection(existingIds.comps),
    surveys: incomingIds.surveys.intersection(existingIds.surveys),
    fields: incomingIds.fields.intersection(existingIds.fields),
    entries: incomingIds.entries.intersection(existingIds.entries),
  };

  let action = $state<"accept-overwrite-entries" | "accept-no-overwrite-entries" | "ignore">(
    "accept-overwrite-entries",
  );

  let viewEntries = $state(false);

  let error = $state("");

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      if (error) {
        return;
      }

      if (action == "ignore") {
        onhandle(action);
        closeDialog();
        return;
      }

      if (!message.comps?.length && !message.surveys?.length && !message.fields?.length && !message.entries?.length) {
        error = "No data in message";
        return;
      }

      const transaction = idb.transaction(["comps", "surveys", "fields", "entries"], "readwrite");
      transaction.onabort = () => {
        error = "Could not accept message!";
      };

      transaction.oncomplete = () => {
        onhandle(action);
        closeDialog();
      };

      if (message.comps?.length) {
        const compStore = transaction.objectStore("comps");
        const incomingComps = $state
          .snapshot(message.comps)
          .map((comp) => ({ ...comp, created: new Date(), modified: new Date() }));

        for (const incomingComp of incomingComps) {
          if (!duplicateIds.comps.has(incomingComp.id)) {
            compStore.put(incomingComp);
            continue;
          }

          const existingComp = existing.comps?.find((c) => c.id == incomingComp.id);
          if (!existingComp) {
            compStore.put(incomingComp);
            continue;
          }

          const matches: Match[] = [];

          for (const match of existingComp.matches) {
            const matchIndex = matches.findIndex((existingMatch) => compareMatches(existingMatch, match) == 0);

            if (matchIndex == -1) {
              matches.push(match);
            } else {
              matches[matchIndex] = match;
            }
          }

          for (const importedMatch of incomingComp.matches) {
            const existingMatch = matches.find((m) => compareMatches(importedMatch, m) == 0);

            if (existingMatch) {
              if (
                importedMatch.red1 != existingMatch.red1 ||
                importedMatch.red2 != existingMatch.red2 ||
                importedMatch.red3 != existingMatch.red3 ||
                importedMatch.blue1 != existingMatch.blue1 ||
                importedMatch.blue2 != existingMatch.blue2 ||
                importedMatch.blue3 != existingMatch.blue3 ||
                (importedMatch.redScore !== undefined && importedMatch.redScore != existingMatch.redScore) ||
                (importedMatch.blueScore !== undefined && importedMatch.blueScore != existingMatch.blueScore)
              ) {
                existingMatch.red1 = importedMatch.red1;
                existingMatch.red2 = importedMatch.red2;
                existingMatch.red3 = importedMatch.red3;
                existingMatch.blue1 = importedMatch.blue1;
                existingMatch.blue2 = importedMatch.blue2;
                existingMatch.blue3 = importedMatch.blue3;

                if (importedMatch.redScore !== undefined) {
                  existingMatch.redScore = importedMatch.redScore;
                }

                if (importedMatch.blueScore !== undefined) {
                  existingMatch.blueScore = importedMatch.blueScore;
                }
              }
            } else {
              matches.push(importedMatch);
            }
          }

          const teams = new Map<string, Team>();

          for (const team of existingComp.teams) {
            teams.set(team.number, team);
          }

          for (const incomingTeam of incomingComp.teams) {
            const existingTeam = teams.get(incomingTeam.number);

            if (existingTeam) {
              if (incomingTeam.name != existingTeam.name) {
                existingTeam.name = incomingTeam.name;
                teams.set(incomingTeam.number, existingTeam);
              }
            } else {
              teams.set(incomingTeam.number, incomingTeam);
            }
          }

          const created = incomingComp.created < existingComp.created ? incomingComp.created : existingComp.created;

          const mergedComp: Comp = {
            id: existingComp.id,
            name: incomingComp.name,
            matches: matches.toSorted(compareMatches),
            teams: teams
              .values()
              .toArray()
              .toSorted((a, b) => a.number.localeCompare(b.number, "en", { numeric: true })),
            created,
            modified: new Date(),
          };

          const mergedTbaEventKey = incomingComp.tbaEventKey || existingComp.tbaEventKey;

          if (mergedTbaEventKey) {
            mergedComp.tbaEventKey = mergedTbaEventKey;
          }

          const scouts = new Set<string>();

          for (const scout of existingComp.scouts || []) {
            scouts.add(scout);
          }

          for (const scout of incomingComp.scouts || []) {
            scouts.add(scout);
          }

          if (existingComp.scouts != undefined || incomingComp.scouts != undefined) {
            mergedComp.scouts = scouts
              .values()
              .toArray()
              .toSorted((a, b) => a.localeCompare(b));
          }

          compStore.put($state.snapshot(mergedComp));
        }
      }

      if (message.surveys?.length) {
        const surveyStore = transaction.objectStore("surveys");
        const fieldStore = transaction.objectStore("fields");

        const incomingSurveys = $state
          .snapshot(message.surveys)
          .map((survey) => ({ ...survey, created: new Date(), modified: new Date() }));

        const incomingFields = $state.snapshot(message.fields);

        for (const incomingSurvey of incomingSurveys) {
          const incomingFieldsForThisSurvey = incomingFields?.filter((f) => f.surveyId == incomingSurvey.id);
          if (incomingFieldsForThisSurvey?.length) {
            for (const field of incomingFieldsForThisSurvey) {
              fieldStore.put(field);
            }
          }

          const oldFieldIds = existingIds.fields.difference(incomingIds.fields);
          for (const id of oldFieldIds) {
            fieldStore.delete(id);
          }

          if (!duplicateIds.surveys.has(incomingSurvey.id)) {
            surveyStore.put(incomingSurvey);
            continue;
          }

          const existingSurvey = existing.surveys?.find((s) => s.id == incomingSurvey.id);
          if (!existingSurvey) {
            surveyStore.put(incomingSurvey);
            continue;
          }

          if (incomingSurvey.type == "match") {
            const mergedSurvey: MatchSurvey = {
              id: existingSurvey.id,
              compId: existingSurvey.compId,
              name: incomingSurvey.name,
              type: "match",
              fieldIds: incomingSurvey.fieldIds,
              pickLists: incomingSurvey.pickLists,
              expressions: incomingSurvey.expressions,
              created: existingSurvey.created,
              modified: existingSurvey.modified,
            };

            if (incomingSurvey.tbaMetrics?.length) {
              mergedSurvey.tbaMetrics = incomingSurvey.tbaMetrics;
            }

            surveyStore.put($state.snapshot(mergedSurvey));
          }

          if (incomingSurvey.type == "pit") {
            const mergedSurvey: PitSurvey = {
              id: existingSurvey.id,
              compId: existingSurvey.compId,
              name: incomingSurvey.name,
              type: "pit",
              fieldIds: incomingSurvey.fieldIds,
              created: existingSurvey.created,
              modified: existingSurvey.modified,
            };

            surveyStore.put($state.snapshot(mergedSurvey));
          }
        }
      }

      if (message.entries?.length) {
        const entryStore = transaction.objectStore("entries");
        const incomingEntries = $state
          .snapshot(message.entries)
          .map((entry) => ({ ...entry, status: "exported", created: new Date(), modified: new Date() }));

        for (const incomingEntry of incomingEntries) {
          if (!duplicateIds.entries.has(incomingEntry.id)) {
            entryStore.put(incomingEntry);
            continue;
          }

          const existingEntry = existing.entries?.find((e) => e.id == incomingEntry.id);
          if (!existingEntry) {
            entryStore.put(incomingEntry);
            continue;
          }

          const tbaMetrics: TbaMetrics = [];

          if (existingEntry?.type == "match") {
            for (const metric of existingEntry.tbaMetrics || []) {
              tbaMetrics.push($state.snapshot(metric));
            }
          }

          if (incomingEntry.type == "match") {
            for (const metric of incomingEntry.tbaMetrics || []) {
              const metricIndex = tbaMetrics.findIndex((m) => m.name == metric.name);
              if (metricIndex !== -1 && action == "accept-overwrite-entries") {
                tbaMetrics[metricIndex].value = $state.snapshot(metric).value;
              } else {
                tbaMetrics.push($state.snapshot(metric));
              }
            }
          }

          let newEntry =
            action == "accept-overwrite-entries" ? $state.snapshot(incomingEntry) : $state.snapshot(existingEntry);

          if (tbaMetrics.length) {
            entryStore.put({ ...newEntry, tbaMetrics });
          } else {
            entryStore.put(newEntry);
          }
        }
      }
    },
  };

  function sortEntries(a: Entry, b: Entry) {
    const duplicateCompare = Number(duplicateIds.entries.has(a.id)) - Number(duplicateIds.entries.has(b.id));
    const teamCompare = a.team.localeCompare(b.team, "en", { numeric: true });
    const typeCompare = Number(a.type == "match") - Number(b.type == "match");
    const matchCompare = a.type == "match" && b.type == "match" ? compareMatches(b, a) : 0;
    const scoutCompare = a.scout?.localeCompare(b.scout || "") || 0;
    return duplicateCompare || typeCompare || matchCompare || teamCompare || scoutCompare;
  }
</script>

<span>From: {client.name} {client.team ? `(${client.team})` : ""}</span>

<div class="-m-1 flex max-h-[500px] flex-col gap-2 overflow-auto p-1">
  {#if message.comps?.length || message.surveys?.length || message.fields?.length}
    <div class="grid items-center gap-x-3 gap-y-1 text-sm" style="grid-template-columns:min-content auto auto">
      <div class="text-xs font-light">Configs</div>
      <div class="text-xs font-light">Existing</div>
      <div class="text-xs font-light">Imported</div>

      {#each message.comps as incomingComp}
        {@const existingComp = existing.comps?.find((c) => c.id == incomingComp.id)}
        {#if existingComp}
          <div class="text-base">Comp</div>
          <div class="text-base">{existingComp.name}</div>
          <div class="text-base">{incomingComp.name}</div>

          <div class="text-xs font-light text-nowrap">Event Key</div>
          <div>{existingComp.tbaEventKey || "-"}</div>
          <div>{incomingComp.tbaEventKey || "-"}</div>

          <div class="text-xs font-light">Matches</div>
          <div>{existingComp.matches.length || "-"}</div>
          <div>{incomingComp.matches.length || "-"}</div>

          <div class="text-xs font-light">Teams</div>
          <div>{existingComp.teams.length || "-"}</div>
          <div>{incomingComp.teams.length || "-"}</div>

          <div class="text-xs font-light">Scouts</div>
          <div>{existingComp.scouts?.length || "-"}</div>
          <div>{incomingComp.scouts?.length || "-"}</div>
        {:else}
          <div class="text-base">New comp</div>
          <div class="text-base"></div>
          <div class="text-base">{incomingComp.name}</div>

          <div class="text-xs font-light text-nowrap">Event Key</div>
          <div></div>
          <div>{incomingComp.tbaEventKey || "-"}</div>

          <div class="text-xs font-light">Matches</div>
          <div></div>
          <div>{incomingComp.matches.length || "-"}</div>

          <div class="text-xs font-light">Teams</div>
          <div></div>
          <div>{incomingComp.teams.length || "-"}</div>

          <div class="text-xs font-light">Scouts</div>
          <div></div>
          <div>{incomingComp.scouts?.length || "-"}</div>
        {/if}
      {/each}

      {#each message.surveys as incomingSurvey}
        {@const existingSurvey = existing.surveys?.find((s) => s.id == incomingSurvey.id)}
        {@const existingSurveyFields = existing.fields?.filter((f) => f.surveyId == incomingSurvey.id)}
        {@const incomingSurveyFields = message.fields?.filter((f) => f.surveyId == incomingSurvey.id)}

        {#if existingSurvey}
          <div class="text-base">Survey</div>
          <div class="text-base">{existingSurvey.name}</div>
          <div class="text-base">{incomingSurvey.name}</div>

          <div class="text-xs font-light">Fields</div>
          <div>{existingSurveyFields?.length || "-"}</div>
          <div>{incomingSurveyFields?.length || "-"}</div>

          {#if existingSurvey.type == "match" && incomingSurvey.type == "match"}
            <div class="text-xs font-light">Pick Lists</div>
            <div>{existingSurvey.pickLists.length}</div>
            <div>{incomingSurvey.pickLists.length}</div>

            <div class="text-xs font-light">Expressions</div>
            <div>{existingSurvey.expressions.length}</div>
            <div>{incomingSurvey.expressions.length}</div>
          {/if}
        {:else}
          <div class="text-base">New survey</div>
          <div class="text-base"></div>
          <div class="text-base">{incomingSurvey.name}</div>

          <div class="text-xs font-light">Fields</div>
          <div>{existingSurveyFields?.length || "-"}</div>
          <div>{incomingSurveyFields?.length || "-"}</div>

          {#if incomingSurvey.type == "match"}
            <div class="text-xs font-light">Pick Lists</div>
            <div></div>
            <div>{incomingSurvey.pickLists.length}</div>

            <div class="text-xs font-light">Expressions</div>
            <div></div>
            <div>{incomingSurvey.expressions.length}</div>
          {/if}
        {/if}
      {/each}
    </div>
  {/if}

  {#if message.entries?.length}
    {@const someMatchSurveys = [...(existing.surveys || []), ...(message.surveys || [])].some(
      (survey) => survey.type == "match",
    )}

    <div class="flex flex-col gap-2">
      <Button onclick={() => (viewEntries = !viewEntries)}>
        <ChevronRightIcon class="text-theme transition-[rotate] {viewEntries ? 'rotate-90' : 'rotate-0'}" />
        <div class="flex flex-col">
          <span
            class={duplicateIds.entries.size &&
            action == "accept-no-overwrite-entries" &&
            message.entries.length == duplicateIds.entries.size
              ? "line-through opacity-60"
              : ""}
          >
            Incoming entries: {message.entries.length}
          </span>
          {#if duplicateIds.entries.size}
            <span class={["text-xs font-light", action == "accept-no-overwrite-entries" && "line-through opacity-60"]}>
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
            {#each message.entries.toSorted(sortEntries) as incomingEntry}
              {@const isSkipping =
                action == "accept-no-overwrite-entries" && duplicateIds.entries.has(incomingEntry.id)}

              <tr class={isSkipping ? "line-through opacity-60" : ""}>
                <td class="p-2 text-center">{incomingEntry.team}</td>
                {#if someMatchSurveys}
                  <td class="p-2 text-center">
                    {#if incomingEntry.type == "match" && incomingEntry.matchLevel && incomingEntry.matchLevel != "qm"}
                      {incomingEntry.matchLevel}{incomingEntry.matchSet || 1}-{incomingEntry.match}
                    {:else if incomingEntry.type == "match"}
                      {incomingEntry.match}
                    {/if}
                  </td>
                  <td class="p-2 text-center">{incomingEntry.type == "match" ? incomingEntry.absent || "" : ""}</td>
                {/if}
                {#if duplicateIds.entries.size}
                  <td class="p-2">
                    {#if isSkipping}
                      Skipping
                    {:else if duplicateIds.entries.has(incomingEntry.id)}
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

<div class="flex flex-wrap gap-2">
  <Button
    onclick={() => (action = "accept-overwrite-entries")}
    class={["grow basis-0", action == "accept-overwrite-entries" ? "font-bold" : "font-light"]}
  >
    {#if action == "accept-overwrite-entries"}
      <CircleCheckBigIcon class="text-theme" />
    {:else}
      <CircleIcon class="text-theme" />
    {/if}
    <div class="flex flex-col">
      Accept
      {#if duplicateIds.entries.size}
        <span class="text-xs">Overwrite duplicate entries</span>
      {:else}
        <span class="text-xs font-light">and store this data on your device</span>
      {/if}
    </div>
  </Button>

  {#if duplicateIds.entries.size}
    <Button
      onclick={() => (action = "accept-no-overwrite-entries")}
      class={["grow basis-0", action == "accept-no-overwrite-entries" ? "font-bold" : "font-light"]}
    >
      {#if action == "accept-no-overwrite-entries"}
        <CircleCheckBigIcon class="text-theme" />
      {:else}
        <CircleIcon class="text-theme" />
      {/if}
      <div class="flex flex-col">
        Accept
        <span class="text-xs">Skip duplicate entries</span>
      </div>
    </Button>
  {/if}

  <Button onclick={() => (action = "ignore")} class={["grow basis-0", action == "ignore" ? "font-bold" : "font-light"]}>
    {#if action == "ignore"}
      <CircleCheckBigIcon class="text-theme" />
    {:else}
      <CircleIcon class="text-theme" />
    {/if}
    <div class="flex flex-col">
      Ignore
      <span class="text-xs font-light">and dismiss</span>
    </div>
  </Button>
</div>
