<script lang="ts">
  import {
    ChevronRightIcon,
    DownloadIcon,
    RefreshCwIcon,
    SquareCheckBigIcon,
    SquareIcon,
    Undo2Icon,
    XIcon,
  } from "@lucide/svelte";
  import { compareMatches, rerunAllContextLoads, sessionStorageStore, type Match, type Team } from "$lib";
  import { compSchema, type Comp } from "$lib/comp";
  import Button from "$lib/components/Button.svelte";
  import QrCodeReader from "$lib/components/QRCodeReader.svelte";
  import RoomWidget from "$lib/components/RoomWidget.svelte";
  import { closeDialog, openDialog, type DialogExports } from "$lib/dialog";
  import { entrySchema, type Entry, type TbaMetrics } from "$lib/entry";
  import { fieldSchema, type Field } from "$lib/field";
  import { idb } from "$lib/idb";
  import { onlineTransfer } from "$lib/online-transfer.svelte";
  import { cameraStore } from "$lib/settings";
  import { surveySchema, type MatchSurvey, type PitSurvey, type Survey } from "$lib/survey";
  import { z } from "zod";
  import HandleRtcResponseMessageDialog from "./HandleRtcResponseMessageDialog.svelte";

  let {
    existing,
    request,
  }: {
    existing: {
      comps?: Comp[];
      surveys?: Survey[];
      fields?: Field[];
      entries?: Entry[];
    };
    request: "entries" | "configs" | "all";
  } = $props();

  const jsonSchema = z.object({
    comps: compSchema.array().optional(),
    surveys: surveySchema.array().optional(),
    fields: fieldSchema.array().optional(),
    entries: z
      .preprocess((val) => {
        if (val && typeof val == "object" && !("type" in val)) {
          return { ...val, type: "match" in val ? "match" : "pit" };
        }
        return val;
      }, entrySchema)
      .array()
      .optional(),
    version: z.number().optional(),
  });

  let rtcMessages = $state($state.snapshot(onlineTransfer.rtcMessages.filter((m) => m.type == "response")));
  let rtcClients = $state($state.snapshot(onlineTransfer.remoteClients));

  const clientsChanged = $derived.by(() => {
    const savedIds = new Set(rtcClients.map((c) => c.info.id));
    const currentIds = new Set(onlineTransfer.remoteClients.map((c) => c.info.id));

    if (currentIds.symmetricDifference(savedIds).size) {
      return true;
    }
    return false;
  });

  function refreshMessages() {
    rtcMessages = $state.snapshot(onlineTransfer.rtcMessages.filter((m) => m.type == "response"));
  }

  function refreshClients() {
    rtcClients = $state.snapshot(onlineTransfer.remoteClients);
  }

  let imported = $state<z.infer<typeof jsonSchema>>({});

  const anyImported = $derived.by(() => {
    return imported.comps?.length || imported.surveys?.length || imported.fields?.length || imported.entries?.length;
  });

  const incomingIds = $derived({
    comps: new Set(imported.comps?.map((c) => c.id)),
    surveys: new Set(imported.surveys?.map((s) => s.id)),
    fields: new Set(imported.fields?.map((f) => f.id)),
    entries: new Set(imported.entries?.map((e) => e.id)),
  });

  const existingIds = {
    comps: new Set(existing.comps?.map((c) => c.id)),
    surveys: new Set(existing.surveys?.map((s) => s.id)),
    fields: new Set(existing.fields?.map((f) => f.id)),
    entries: new Set(existing.entries?.map((e) => e.id)),
  };

  const duplicateIds = $derived({
    comps: incomingIds.comps.intersection(existingIds.comps),
    surveys: incomingIds.surveys.intersection(existingIds.surveys),
    fields: incomingIds.fields.intersection(existingIds.fields),
    entries: incomingIds.entries.intersection(existingIds.entries),
  });

  const tab = sessionStorageStore<"room" | "qrfcode" | "file">("import-data-tab", "room");
  tab.subscribe(() => {
    refreshMessages();
    refreshClients();
  });

  let overwriteDuplicateEntries = $state(true);

  let viewEntries = $state(false);

  let files = $state<FileList | undefined>();
  let error = $state("");

  export const { onconfirm }: DialogExports = {
    async onconfirm() {
      if (error) {
        return;
      }

      if (!anyImported) {
        error = "No data from input";
        return;
      }

      const transaction = idb.transaction(["comps", "surveys", "fields", "entries"], "readwrite");
      transaction.onabort = () => {
        error = "Could not accept message!";
      };

      transaction.oncomplete = () => {
        rerunAllContextLoads();
        closeDialog();
      };

      if (imported.comps?.length) {
        const compStore = transaction.objectStore("comps");
        const incomingComps = $state
          .snapshot(imported.comps)
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

      if (imported.surveys?.length) {
        const surveyStore = transaction.objectStore("surveys");
        const fieldStore = transaction.objectStore("fields");

        const incomingSurveys = $state
          .snapshot(imported.surveys)
          .map((survey) => ({ ...survey, created: new Date(), modified: new Date() }));

        const incomingFields = $state.snapshot(imported.fields);

        for (const incomingSurvey of incomingSurveys) {
          const incomingFieldsForThisSurvey = incomingFields?.filter((f) => f.surveyId == incomingSurvey.id);
          const existingFieldsForThisSurvey = existing.fields?.filter((f) => f.surveyId == incomingSurvey.id);

          if (incomingFieldsForThisSurvey?.length) {
            for (const field of incomingFieldsForThisSurvey) {
              fieldStore.put(field);
            }
          }

          if (existingFieldsForThisSurvey?.length) {
            for (const field of existingFieldsForThisSurvey) {
              if (!incomingFieldsForThisSurvey?.some((f) => f.id == field.id)) {
                fieldStore.delete(field.id);
              }
            }
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

      if (imported.entries?.length) {
        const entryStore = transaction.objectStore("entries");
        const incomingEntries = $state
          .snapshot(imported.entries)
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
              if (metricIndex !== -1 && overwriteDuplicateEntries) {
                tbaMetrics[metricIndex].value = $state.snapshot(metric).value;
              } else {
                tbaMetrics.push($state.snapshot(metric));
              }
            }
          }

          let newEntry = overwriteDuplicateEntries ? $state.snapshot(incomingEntry) : $state.snapshot(existingEntry);

          if (tbaMetrics.length) {
            entryStore.put({ ...newEntry, tbaMetrics });
          } else {
            entryStore.put(newEntry);
          }
        }
      }
    },
  };

  async function onchange() {
    if (!files?.length) {
      return;
    }

    onread(await files[0].text());
  }

  function onread(data: string) {
    try {
      const json = JSON.parse(data);
      imported = z.parse(jsonSchema, json);
    } catch (e) {
      console.error("Failed to parse imported data:", data, e);
      error = "Failed to parse imported data";
      return;
    }
  }

  function retry() {
    error = "";
    imported = {};
  }

  function requestFromAll() {
    if (!onlineTransfer.localId) return;
    onlineTransfer.sendToAll({ type: "request", request });
  }

  function requestFrom(id: string) {
    if (!onlineTransfer.localId) return;
    onlineTransfer.sendTo(id, { type: "request", request });
  }

  function sortEntries(a: Entry, b: Entry) {
    const duplicateCompare = Number(duplicateIds.entries.has(a.id)) - Number(duplicateIds.entries.has(b.id));
    const teamCompare = a.team.localeCompare(b.team, "en", { numeric: true });
    const typeCompare = Number(a.type == "match") - Number(b.type == "match");
    const matchCompare = a.type == "match" && b.type == "match" ? compareMatches(b, a) : 0;
    const scoutCompare = a.scout?.localeCompare(b.scout || "") || 0;
    return duplicateCompare || typeCompare || matchCompare || teamCompare || scoutCompare;
  }
</script>

<div class="flex flex-wrap items-center justify-between gap-2">
  <span>Receive {request}</span>

  <div class="flex flex-wrap gap-2 text-sm">
    <Button onclick={() => ($tab = "room")} class={$tab == "room" ? "font-bold" : "font-light"}>Room</Button>
    <Button onclick={() => ($tab = "qrfcode")} class={$tab == "qrfcode" ? "font-bold" : "font-light"}>QRF code</Button>
    <Button onclick={() => ($tab = "file")} class={$tab == "file" ? "font-bold" : "font-light"}>File</Button>
  </div>
</div>

{#if $tab == "room"}
  <Button
    onclick={() => {
      refreshMessages();
      refreshClients();
    }}
    class="relative self-start text-sm"
    disabled={onlineTransfer.rtcMessages.length == rtcMessages.length && !clientsChanged}
  >
    <RefreshCwIcon class="size-5 text-theme" />
    Refresh
    {#if onlineTransfer.rtcMessages.length != rtcMessages.length || clientsChanged}
      <span class="absolute top-0 right-0.5 text-xs font-bold tracking-tighter italic"> ! </span>
    {/if}
  </Button>

  {#if rtcMessages.length}
    <div class="flex flex-col">
      <span class="text-sm font-light">Incoming data</span>

      <div class="flex flex-col gap-2">
        {#each rtcMessages as message}
          {@const client = message.from ? onlineTransfer.clients.get(message.from) : undefined}

          <div class="flex items-stretch gap-1">
            <Button
              onclick={() => {
                openDialog(HandleRtcResponseMessageDialog, {
                  message,
                  client: client?.info || { id: "", name: "Disconnected" },
                  existing,
                  onhandle() {
                    onlineTransfer.clearRtcMessage(message);
                    refreshMessages();
                  },
                });
              }}
              class="grow flex-col items-start gap-1! text-sm"
            >
              <span>
                {#if client}
                  {client.info.name}
                  {#if client.info.team}
                    <span class="text-xs font-light">({client.info.team})</span>
                  {/if}
                {:else}
                  Disconnected
                {/if}
              </span>

              {#if message.comps?.length}
                <span>Comps: {message.comps?.length}</span>
              {/if}

              {#if message.surveys?.length}
                <span>Surveys: {message.surveys?.length}</span>
              {/if}

              {#if message.fields?.length}
                <span>Fields: {message.fields?.length}</span>
              {/if}

              {#if message.entries?.length}
                <span>Entries: {message.entries?.length}</span>
              {/if}
            </Button>

            <Button
              onclick={() => {
                onlineTransfer.clearRtcMessage(message);
                refreshMessages();
              }}
            >
              <XIcon class="text-theme" />
            </Button>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  {#if onlineTransfer.remoteClients.length}
    <div class="flex flex-col">
      <span class="text-sm font-light">Request from</span>

      <div class="flex flex-col gap-2">
        <Button onclick={requestFromAll}>
          <DownloadIcon class="text-theme" />
          Everyone
        </Button>

        {#each onlineTransfer.remoteClients as client (client.info.id)}
          <Button onclick={() => requestFrom(client.info.id)}>
            <div class="w-6 shrink-0"></div>
            <span class="text-sm">
              {client.info.name}
              {#if client.info.team}
                <span class="text-xs font-light">({client.info.team})</span>
              {/if}
            </span>
          </Button>
        {/each}
      </div>
    </div>
  {:else}
    <RoomWidget />
  {/if}
{:else if $tab == "qrfcode" && $cameraStore}
  {#if anyImported}
    <Button onclick={retry}>
      <Undo2Icon class="text-theme" />
      Retry
    </Button>
  {:else}
    <QrCodeReader {onread} />
  {/if}
{:else}
  <input
    type="file"
    accept=".json,.txt"
    bind:files
    {onchange}
    class="file:mr-3 file:border-none file:bg-neutral-800 file:p-2 file:text-theme"
  />
{/if}

{#if $tab != "room" && anyImported}
  <div class="-m-1 flex max-h-[500px] flex-col gap-2 overflow-auto p-1">
    {#if imported.comps?.length || imported.surveys?.length || imported.fields?.length}
      <div class="grid items-center gap-x-3 gap-y-1 text-sm" style="grid-template-columns:min-content auto auto">
        <div class="text-xs font-light">Configs</div>
        <div class="text-xs font-light">Existing</div>
        <div class="text-xs font-light">Imported</div>

        {#each imported.comps as incomingComp}
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

        {#each imported.surveys as incomingSurvey}
          {@const existingSurvey = existing.surveys?.find((s) => s.id == incomingSurvey.id)}
          {@const existingSurveyFields = existing.fields?.filter((f) => f.surveyId == incomingSurvey.id)}
          {@const incomingSurveyFields = imported.fields?.filter((f) => f.surveyId == incomingSurvey.id)}

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
              Incoming entries: {imported.entries.length}
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
              {#each imported.entries.toSorted(sortEntries) as incomingEntry}
                {@const isSkipping = !overwriteDuplicateEntries && duplicateIds.entries.has(incomingEntry.id)}

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
{/if}

{#if $tab != "room" && duplicateIds.entries.size}
  <Button
    onclick={() => (overwriteDuplicateEntries = !overwriteDuplicateEntries)}
    class={["grow basis-0", overwriteDuplicateEntries ? "font-bold" : "font-light"]}
  >
    {#if overwriteDuplicateEntries}
      <SquareCheckBigIcon class="text-theme" />
    {:else}
      <SquareIcon class="text-theme" />
    {/if}
    <div class="flex flex-col">Overwrite duplicate entries</div>
  </Button>
{/if}

{#if error}
  <span>{error}</span>
{/if}
