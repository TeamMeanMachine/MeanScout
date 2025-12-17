<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import { schemaVersion, sessionStorageStore } from "$lib";
  import type { Comp } from "$lib/comp";
  import Button from "$lib/components/Button.svelte";
  import QrCodeReader from "$lib/components/QRCodeReader.svelte";
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import type { Entry } from "$lib/entry";
  import { type Field } from "$lib/field";
  import { idb } from "$lib/idb";
  import { cameraStore } from "$lib/settings";
  import { type Survey } from "$lib/survey";
  import { Undo2Icon } from "@lucide/svelte";

  let imported = $state<{
    comps?: Comp[];
    surveys?: Survey[];
    fields?: Field[];
    entries?: Entry[];
  }>({});

  let anyImported = $derived.by(() => {
    return imported.comps?.length || imported.surveys?.length || imported.fields?.length || imported.entries?.length;
  });

  const tab = sessionStorageStore<"qrfcode" | "file">("import-data-tab", $cameraStore ? "qrfcode" : "file");

  let files = $state<FileList | undefined>();
  let error = $state("");

  export const { onconfirm }: DialogExports = {
    async onconfirm() {
      if (!anyImported) {
        error = "No input";
        return;
      }

      const transaction = idb.transaction(["comps", "surveys", "fields", "entries"], "readwrite");

      const compStore = transaction.objectStore("comps");
      const surveyStore = transaction.objectStore("surveys");
      const fieldStore = transaction.objectStore("fields");
      const entryStore = transaction.objectStore("entries");

      transaction.oncomplete = () => {
        invalidateAll();
        closeDialog();
      };

      transaction.onabort = () => {
        error = transaction.error?.message || "Could not import data";
      };

      if (imported.comps?.length) {
        for (const importedComp of imported.comps) {
          compStore.put($state.snapshot(importedComp));
        }
      }

      if (imported.surveys?.length) {
        for (const importedSurvey of imported.surveys) {
          surveyStore.put($state.snapshot(importedSurvey));
        }
      }

      if (imported.fields?.length) {
        for (const importedField of imported.fields) {
          fieldStore.put($state.snapshot(importedField));
        }
      }

      if (imported.entries?.length) {
        for (const importedEntry of imported.entries) {
          entryStore.put($state.snapshot(importedEntry));
        }
      }

      invalidateAll();
      closeDialog();
    },
  };

  async function onchange() {
    if (!files?.length) {
      return;
    }

    onread(await files[0].text());
  }

  function onread(data: string) {
    let json: {
      version: number;
      comps?: Comp[];
      surveys?: Survey[];
      fields?: Field[];
      entries?: Entry[];
    };

    try {
      json = JSON.parse(data);
    } catch (e) {
      console.error("JSON failed to parse imported data:", data);
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

    const importedComps = json.comps?.map((jsonComp) => {
      const comp: Comp = {
        id: jsonComp.id,
        name: jsonComp.name,
        matches: jsonComp.matches,
        teams: jsonComp.teams,
        created: new Date(),
        modified: new Date(),
      };

      if (jsonComp.tbaEventKey) {
        comp.tbaEventKey = jsonComp.tbaEventKey;
      }

      if (jsonComp.scouts) {
        comp.scouts = jsonComp.scouts;
      }

      return comp;
    });

    const importedSurveys = json.surveys
      ?.map((jsonSurvey) => {
        let survey: Survey;

        switch (jsonSurvey.type) {
          case "match":
            survey = {
              id: jsonSurvey.id,
              compId: jsonSurvey.compId,
              name: jsonSurvey.name,
              type: "match",
              fieldIds: jsonSurvey.fieldIds,
              pickLists: jsonSurvey.pickLists,
              expressions: jsonSurvey.expressions,
              created: new Date(),
              modified: new Date(),
            };
            if (jsonSurvey.tbaMetrics?.length) {
              survey.tbaMetrics = jsonSurvey.tbaMetrics;
            }
            break;
          case "pit":
            survey = {
              id: jsonSurvey.id,
              compId: jsonSurvey.compId,
              name: jsonSurvey.name,
              type: "pit",
              fieldIds: jsonSurvey.fieldIds,
              created: new Date(),
              modified: new Date(),
            };
            break;
          default:
            return;
        }

        return survey;
      })
      .filter((jsonSurvey) => jsonSurvey !== undefined);

    const importedFields = json.fields?.map((jsonField) => {
      let field: Field;

      switch (jsonField.type) {
        case "number":
          field = {
            id: jsonField.id,
            surveyId: jsonField.surveyId,
            name: jsonField.name,
            type: jsonField.type,
          };
          if (jsonField.allowNegative) {
            field.allowNegative = true;
          }
          break;
        case "toggle":
          field = {
            id: jsonField.id,
            surveyId: jsonField.surveyId,
            name: jsonField.name,
            type: jsonField.type,
          };
          break;
        case "select":
          field = {
            id: jsonField.id,
            surveyId: jsonField.surveyId,
            name: jsonField.name,
            type: jsonField.type,
            values: jsonField.values,
          };
          if (jsonField.radio) {
            field.radio = true;
          }
          break;
        case "text":
          field = {
            id: jsonField.id,
            surveyId: jsonField.surveyId,
            name: jsonField.name,
            type: jsonField.type,
          };
          if (jsonField.long) {
            field.long = true;
          }
          break;
        case "rating":
          field = {
            id: jsonField.id,
            surveyId: jsonField.surveyId,
            name: jsonField.name,
            type: jsonField.type,
          };
          break;
        case "timer":
          field = {
            id: jsonField.id,
            surveyId: jsonField.surveyId,
            name: jsonField.name,
            type: jsonField.type,
          };
          break;
        case "group":
          field = {
            id: jsonField.id,
            surveyId: jsonField.surveyId,
            name: jsonField.name,
            type: jsonField.type,
            fieldIds: jsonField.fieldIds,
          };
          break;
      }

      if (field.type != "group" && jsonField.type != "group" && jsonField.tip) {
        field.tip = jsonField.tip;
      }

      return field;
    });

    const importedEntries = json.entries?.map((jsonEntry) => {
      let entry: Entry;

      if ("match" in jsonEntry) {
        entry = {
          id: jsonEntry.id,
          surveyId: jsonEntry.surveyId,
          type: "match",
          status: "exported",
          team: jsonEntry.team,
          match: jsonEntry.match,
          absent: jsonEntry.absent,
          values: jsonEntry.values,
          created: new Date(),
          modified: new Date(),
        };

        if (jsonEntry.matchSet && jsonEntry.matchSet > 1) {
          entry.matchSet = jsonEntry.matchSet;
        }

        if (jsonEntry.matchLevel && jsonEntry.matchLevel != "qm") {
          entry.matchLevel = jsonEntry.matchLevel;
        }

        if (jsonEntry.tbaMetrics) {
          entry.tbaMetrics = jsonEntry.tbaMetrics;
        }

        if (jsonEntry.scout && jsonEntry.prediction) {
          entry.prediction = jsonEntry.prediction;
          if (jsonEntry.predictionReason) {
            entry.predictionReason = jsonEntry.predictionReason;
          }
        }
      } else {
        entry = {
          id: jsonEntry.id,
          surveyId: jsonEntry.surveyId,
          type: "pit",
          status: "exported",
          team: jsonEntry.team,
          values: jsonEntry.values,
          created: new Date(),
          modified: new Date(),
        };
      }

      if (jsonEntry.scout) {
        entry.scout = jsonEntry.scout;
      }

      return entry;
    });

    imported = {
      comps: importedComps?.length ? importedComps : undefined,
      surveys: importedSurveys?.length ? importedSurveys : undefined,
      fields: importedFields?.length ? importedFields : undefined,
      entries: importedEntries?.length ? importedEntries : undefined,
    };
  }

  function retry() {
    error = "";
    imported = {};
  }
</script>

<div class="flex flex-wrap items-center justify-between gap-2">
  <span>Import data</span>

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
    class="file:text-theme file:mr-3 file:border-none file:bg-neutral-800 file:p-2"
  />
{/if}

{#if anyImported}
  <div class="flex flex-col gap-1 text-sm">
    {#if imported.comps?.length}
      <span>Comps: {imported.comps.length == 1 ? imported.comps[0].name : imported.comps.length}</span>
    {/if}

    {#if imported.surveys?.length}
      <span>Surveys: {imported.surveys.length == 1 ? imported.surveys[0].name : imported.surveys.length}</span>
    {/if}

    {#if imported.fields?.length}
      <span>Fields: {imported.fields.length}</span>
    {/if}

    {#if imported.entries?.length}
      <span>Entries: {imported.entries.length}</span>
    {/if}
  </div>
{/if}

{#if error}
  <span>{error}</span>
{/if}
