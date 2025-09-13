<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import { schemaVersion, sessionStorageStore, type Match, type Team } from "$lib";
  import { type Comp } from "$lib/comp";
  import Button from "$lib/components/Button.svelte";
  import QRCodeReader from "$lib/components/QRCodeReader.svelte";
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import type { Entry } from "$lib/entry";
  import type { Field } from "$lib/field";
  import { idb } from "$lib/idb";
  import { cameraStore } from "$lib/settings";
  import type { MatchSurvey, Survey } from "$lib/survey";
  import { Undo2Icon } from "@lucide/svelte";

  let {
    compRecord,
    surveyRecords,
    fieldRecords,
    entryRecords,
  }: {
    compRecord: Comp;
    surveyRecords: Survey[];
    fieldRecords: Field[];
    entryRecords: Entry[];
  } = $props();

  const tab = sessionStorageStore<"qrfcode" | "file">("import-data-tab", $cameraStore ? "qrfcode" : "file");

  let files = $state<FileList | undefined>();
  let importedComp = $state<Comp | undefined>();
  let importedSurveys = $state<Survey[] | undefined>();
  let importedFields = $state<Map<string, Field> | undefined>();

  let compChanges = $state<{
    name: boolean;
    tbaEventKey: boolean;
    matches: boolean;
    matchesEdited: number;
    teams: boolean;
    teamsEdited: number;
    scouts: boolean;
  }>({
    name: false,
    tbaEventKey: false,
    matches: false,
    matchesEdited: 0,
    teams: false,
    teamsEdited: 0,
    scouts: false,
  });

  let surveyChanges = $state<
    Record<
      string,
      {
        name: boolean;
        type: boolean;
        fields: boolean;
        tbaMetrics: boolean;
        pickLists: boolean;
        expressions: boolean;
      }
    >
  >({});

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
      if (jsonComp.name != compRecord.name) {
        compChanges.name = true;
      }

      if (jsonComp.tbaEventKey != compRecord.tbaEventKey) {
        compChanges.tbaEventKey = true;
      }

      const matches = new Map<number, Match>();

      for (const match of compRecord.matches) {
        matches.set(match.number, match);
      }

      for (const importedMatch of jsonComp.matches) {
        const existingMatch = matches.get(importedMatch.number);

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

            compChanges.matches = true;
            compChanges.matchesEdited++;
            matches.set(importedMatch.number, existingMatch);
          }
        } else {
          compChanges.matches = true;
          matches.set(importedMatch.number, importedMatch);
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
            compChanges.teams = true;
            compChanges.teamsEdited++;
            existingTeam.name = importedTeam.name;
            teams.set(importedTeam.number, existingTeam);
          }
        } else {
          compChanges.teams = true;
          teams.set(importedTeam.number, importedTeam);
        }
      }

      const comp: Comp = {
        id: compRecord.id,
        name: jsonComp.name,
        matches: matches
          .values()
          .toArray()
          .toSorted((a, b) => a.number - b.number),
        teams: teams
          .values()
          .toArray()
          .toSorted((a, b) => a.number.localeCompare(b.number, "en", { numeric: true })),
        created: compRecord.created,
        modified: compRecord.modified,
      };

      if (jsonComp.tbaEventKey || compRecord.tbaEventKey) {
        if (jsonComp.tbaEventKey != compRecord.tbaEventKey) {
          compChanges.tbaEventKey = true;
        }

        comp.tbaEventKey = jsonComp.tbaEventKey || compRecord.tbaEventKey;
      }

      const scouts = new Set<string>();

      for (const scout of compRecord.scouts || []) {
        scouts.add(scout);
      }

      for (const scout of jsonComp.scouts || []) {
        if (!scouts.has(scout)) {
          compChanges.scouts = true;
        }

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
        const jsonFields = json.fields?.filter((jsonField) => jsonField.surveyId == jsonSurvey.id);

        if (
          entryRecords.filter((e) => e.surveyId == jsonSurvey.id).length &&
          (jsonFields?.length || 0) != fieldRecords.length
        ) {
          continue;
        }

        const surveyRecord = surveyRecords.find((s) => s.id == jsonSurvey.id);
        if (!surveyRecord) {
          importedSurveys = [...(importedSurveys || []), jsonSurvey];
          continue;
        }

        const changes: {
          name: boolean;
          type: boolean;
          fields: boolean;
          tbaMetrics: boolean;
          pickLists: boolean;
          expressions: boolean;
        } = {
          name: false,
          type: false,
          fields: false,
          tbaMetrics: false,
          pickLists: false,
          expressions: false,
        };

        if (jsonSurvey.name != surveyRecord.name) {
          changes.name = true;
        }

        if (jsonSurvey.type != surveyRecord.type) {
          changes.type = true;
        }

        importedFields = new Map();

        for (const field of jsonFields || []) {
          importedFields.set(field.id, field);
        }

        if (importedFields.size != fieldRecords.length) {
          changes.fields = true;
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

          if (surveyRecord.type == "match") {
            changes.pickLists = jsonSurvey.pickLists.length != surveyRecord.pickLists.length;
            changes.expressions = jsonSurvey.expressions.length != surveyRecord.expressions.length;
          } else {
            changes.pickLists = !!jsonSurvey.pickLists.length;
            changes.expressions = !!jsonSurvey.expressions.length;
          }

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

    compChanges = {
      name: false,
      tbaEventKey: false,
      matches: false,
      matchesEdited: 0,
      teams: false,
      teamsEdited: 0,
      scouts: false,
    };

    surveyChanges = {};
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
  <div class="grid max-h-[500px] grid-cols-3 gap-1 overflow-auto">
    <div class="text-sm font-light">Data</div>
    <div class="text-sm font-light">Existing</div>
    <div class="text-sm font-light">Imported</div>

    {#if importedComp}
      {#if compChanges.name}
        <div>Name</div>
        <div>{compRecord.name}</div>
        <div>{importedComp.name}</div>
      {/if}

      {#if compChanges.tbaEventKey}
        <div>TBA Event Key</div>
        <div>{compRecord.tbaEventKey || "-"}</div>
        <div>{importedComp.tbaEventKey || "-"}</div>
      {/if}

      {#if compChanges.matches}
        <div>Matches</div>
        <div>{compRecord.matches.length || "-"}</div>
        <div>
          {importedComp.matches.length || "-"}
          {#if compChanges.matchesEdited}
            ({compChanges.matchesEdited} edited)
          {/if}
        </div>
      {/if}

      {#if compChanges.teams}
        <div>Teams</div>
        <div>{compRecord.teams.length || "-"}</div>
        <div>
          {importedComp.teams.length || "-"}
          {#if compChanges.teamsEdited}
            ({compChanges.teamsEdited} edited)
          {/if}
        </div>
      {/if}

      {#if importedComp.scouts?.length != compRecord.scouts?.length}
        <div>Scouts</div>
        <div>{compRecord.scouts?.length || "-"}</div>
        <div>{importedComp.scouts?.length || "-"}</div>
      {/if}
    {/if}

    {#each importedSurveys || [] as importedSurvey}
      {@const surveyRecord = surveyRecords.find((survey) => survey.id == importedSurvey.id)}
      {@const changes = surveyChanges[importedSurvey.id]}

      {#if surveyRecord && changes}
        {#if changes.name}
          <div>Name</div>
          <div>{surveyRecord.name}</div>
          <div>{importedSurvey.name}</div>
        {/if}

        {#if changes.type}
          <div>Type</div>
          <div>{surveyRecord.type}</div>
          <div>{importedSurvey.type}</div>
        {/if}

        {#if changes.fields}
          <div>Fields</div>
          <div>{fieldRecords.length || "-"}</div>
          <div>{importedFields?.size || "-"}</div>
        {/if}

        {#if changes.pickLists}
          <div>Pick Lists</div>
          <div>{(surveyRecord.type == "match" ? surveyRecord.pickLists.length : 0) || "-"}</div>
          <div>{(importedSurvey.type == "match" ? importedSurvey.pickLists.length : 0) || "-"}</div>
        {/if}

        {#if changes.expressions}
          <div>Expressions</div>
          <div>{(surveyRecord.type == "match" ? surveyRecord.expressions.length : 0) || "-"}</div>
          <div>{(importedSurvey.type == "match" ? importedSurvey.expressions.length : 0) || "-"}</div>
        {/if}
      {/if}
    {/each}
  </div>
{/if}

{#if error}
  <span>{error}</span>
{/if}
