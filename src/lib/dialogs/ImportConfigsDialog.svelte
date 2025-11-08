<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import { compareMatches, schemaVersion, sessionStorageStore, type Match, type Team } from "$lib";
  import { type Comp } from "$lib/comp";
  import Button from "$lib/components/Button.svelte";
  import QRCodeReader from "$lib/components/QRCodeReader.svelte";
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import type { Field } from "$lib/field";
  import { idb } from "$lib/idb";
  import { cameraStore } from "$lib/settings";
  import type { MatchSurvey, Survey } from "$lib/survey";
  import { Undo2Icon } from "@lucide/svelte";

  let {
    compRecord,
    surveyRecords,
    fieldRecords,
  }: {
    compRecord: Comp;
    surveyRecords: Survey[];
    fieldRecords: Field[];
  } = $props();

  const tab = sessionStorageStore<"qrfcode" | "file">("import-data-tab", $cameraStore ? "qrfcode" : "file");

  let files = $state<FileList | undefined>();
  let importedComp = $state<Comp | undefined>();
  let importedSurveys = $state<Survey[] | undefined>();
  let importedFields = $state<Map<string, Field> | undefined>();

  let error = $state("");

  export const { onconfirm }: DialogExports = {
    async onconfirm() {
      if (error || !importedComp) {
        return;
      }

      const importTransaction = idb.transaction(["comps", "surveys", "fields"], "readwrite");
      const surveyStore = importTransaction.objectStore("surveys");
      const fieldStore = importTransaction.objectStore("fields");

      importTransaction.onabort = () => {
        error ||= "Could not import configs";
      };

      importTransaction.oncomplete = () => {
        invalidateAll();
        closeDialog();
      };

      importTransaction.objectStore("comps").put({ ...$state.snapshot(importedComp), modified: new Date() });

      if (importedSurveys?.length) {
        for (const importedSurvey of importedSurveys) {
          surveyStore.put($state.snapshot(importedSurvey));
        }
      }

      if (importedFields?.size) {
        for (const [, importedField] of importedFields) {
          fieldStore.put($state.snapshot(importedField));
        }
      }

      for (const field of fieldRecords) {
        if (!importedFields?.size || !importedFields.has(field.id)) {
          fieldStore.delete(field.id);
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
    retry();

    let json: {
      version: number;
      comps?: Comp[];
      surveys?: Survey[];
      fields?: Field[];
    };

    try {
      json = JSON.parse(data);
    } catch (e) {
      console.error("JSON failed to parse imported configs:", data);
      error = "JSON failed to parse";
      return;
    }

    if (json.version < schemaVersion) {
      error = "Outdated version";
      return;
    } else if (json.version > schemaVersion) {
      error = "Unsupported version";
      return;
    }

    const jsonComp = json.comps?.find((c) => c.id == compRecord.id);
    const jsonSurveys = json.surveys?.filter((s) => s.compId == (jsonComp?.id || compRecord.id));

    if (!jsonComp && !jsonSurveys?.length) {
      error = "No matching configs found";
      return;
    }

    if (jsonComp) {
      const matches: Match[] = [];

      for (const match of compRecord.matches) {
        const matchIndex = matches.findIndex((existingMatch) => compareMatches(existingMatch, match) == 0);

        if (matchIndex == -1) {
          matches.push(match);
        } else {
          matches[matchIndex] = match;
        }
      }

      for (const importedMatch of jsonComp.matches) {
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

      for (const team of compRecord.teams) {
        teams.set(team.number, team);
      }

      for (const importedTeam of jsonComp.teams) {
        const existingTeam = teams.get(importedTeam.number);

        if (existingTeam) {
          if (importedTeam.name != existingTeam.name) {
            existingTeam.name = importedTeam.name;
            teams.set(importedTeam.number, existingTeam);
          }
        } else {
          teams.set(importedTeam.number, importedTeam);
        }
      }

      const comp: Comp = {
        id: compRecord.id,
        name: jsonComp.name,
        matches: matches.toSorted(compareMatches),
        teams: teams
          .values()
          .toArray()
          .toSorted((a, b) => a.number.localeCompare(b.number, "en", { numeric: true })),
        created: compRecord.created,
        modified: compRecord.modified,
      };

      if (jsonComp.tbaEventKey || compRecord.tbaEventKey) {
        comp.tbaEventKey = jsonComp.tbaEventKey || compRecord.tbaEventKey;
      }

      const scouts = new Set<string>();

      for (const scout of compRecord.scouts || []) {
        scouts.add(scout);
      }

      for (const scout of jsonComp.scouts || []) {
        scouts.add(scout);
      }

      if (scouts.size) {
        comp.scouts = scouts
          .values()
          .toArray()
          .toSorted((a, b) => a.localeCompare(b));
      }

      importedComp = comp;
    }

    if (jsonSurveys?.length) {
      for (const jsonSurvey of jsonSurveys) {
        const surveyRecord = surveyRecords.find((s) => s.id == jsonSurvey.id);

        const jsonFields = json.fields?.filter((jsonField) => jsonField.surveyId == jsonSurvey.id);

        if (!importedFields) {
          importedFields = new Map();
        }

        for (const field of jsonFields || []) {
          importedFields.set(field.id, field);
        }

        if (!surveyRecord) {
          importedSurveys = [...(importedSurveys || []), jsonSurvey];
          continue;
        }

        if (jsonSurvey.type == "match") {
          const importedSurvey: MatchSurvey = {
            id: surveyRecord.id,
            compId: surveyRecord.compId,
            name: jsonSurvey.name,
            type: "match",
            fieldIds: jsonSurvey.fieldIds,
            pickLists: jsonSurvey.pickLists,
            expressions: jsonSurvey.expressions,
            created: surveyRecord.created,
            modified: surveyRecord.modified,
          };

          if (jsonSurvey.tbaMetrics?.length) {
            importedSurvey.tbaMetrics = jsonSurvey.tbaMetrics;
          }

          importedSurveys = [...(importedSurveys || []), importedSurvey];
        }

        if (jsonSurvey.type == "pit") {
          importedSurveys = [
            ...(importedSurveys || []),
            {
              id: surveyRecord.id,
              compId: surveyRecord.compId,
              name: jsonSurvey.name,
              type: "pit",
              fieldIds: jsonSurvey.fieldIds,
              created: surveyRecord.created,
              modified: surveyRecord.modified,
            },
          ];
        }
      }
    }
  }

  function retry() {
    error = "";

    importedComp = undefined;
    importedSurveys = undefined;
    importedFields = undefined;
  }
</script>

<div class="flex flex-wrap items-center justify-between gap-2">
  <span>Merge configs for "{compRecord.name}"</span>

  {#if $cameraStore}
    <div class="flex flex-wrap gap-2 text-sm">
      <Button onclick={() => ($tab = "qrfcode")} class={$tab == "qrfcode" ? "font-bold" : "font-light"}>
        QRF code
      </Button>
      <Button onclick={() => ($tab = "file")} class={$tab == "file" ? "font-bold" : "font-light"}>File</Button>
    </div>
  {/if}
</div>

{#if $tab == "qrfcode" && $cameraStore}
  {#if importedComp}
    <Button onclick={retry}>
      <Undo2Icon class="text-theme" />
      Retry
    </Button>
  {:else}
    <QRCodeReader {onread} />
  {/if}
{:else}
  <input
    type="file"
    accept=".json,.txt"
    bind:files
    {onchange}
    class="file:text-theme file:mr-3 file:border-none file:bg-neutral-800 file:p-2"
  />
{/if}

{#if importedComp || importedSurveys?.length}
  <div
    class="grid max-h-[500px] items-center gap-x-3 gap-y-1 overflow-auto text-sm"
    style="grid-template-columns:min-content auto auto"
  >
    <div class="text-xs font-light">Data</div>
    <div class="text-xs font-light">Existing</div>
    <div class="text-xs font-light">Imported</div>

    {#if importedComp}
      <div class="text-base">Comp</div>
      <div class="text-base">{compRecord.name}</div>
      <div class="text-base">{importedComp.name}</div>

      <div class="text-xs font-light text-nowrap">Event Key</div>
      <div>{compRecord.tbaEventKey || "-"}</div>
      <div>{importedComp.tbaEventKey || "-"}</div>

      <div class="text-xs font-light">Matches</div>
      <div>{compRecord.matches.length || "-"}</div>
      <div>{importedComp.matches.length || "-"}</div>

      <div class="text-xs font-light">Teams</div>
      <div>{compRecord.teams.length || "-"}</div>
      <div>{importedComp.teams.length || "-"}</div>

      <div class="text-xs font-light">Scouts</div>
      <div>{compRecord.scouts?.length || "-"}</div>
      <div>{importedComp.scouts?.length || "-"}</div>

      <div class="text-xs font-light">Fields</div>
      <div>{fieldRecords.length || "-"}</div>
      <div>{importedFields?.size || "-"}</div>
    {/if}

    {#each importedSurveys || [] as importedSurvey}
      {@const surveyRecord = surveyRecords.find((survey) => survey.id == importedSurvey.id)}

      {#if surveyRecord}
        <div class="text-base">Survey</div>
        <div class="text-base">{surveyRecord.name}</div>
        <div class="text-base">{importedSurvey.name}</div>

        {#if surveyRecord.type == "match" && importedSurvey.type == "match"}
          <div class="text-xs font-light">Pick Lists</div>
          <div>{surveyRecord.pickLists.length}</div>
          <div>{importedSurvey.pickLists.length}</div>

          <div class="text-xs font-light">Expressions</div>
          <div>{surveyRecord.expressions.length}</div>
          <div>{importedSurvey.expressions.length}</div>
        {/if}
      {/if}
    {/each}
  </div>
{/if}

{#if error}
  <span>{error}</span>
{/if}
