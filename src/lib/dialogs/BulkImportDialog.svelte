<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import { schemaVersion, sessionStorageStore } from "$lib";
  import type { Comp } from "$lib/comp";
  import Button from "$lib/components/Button.svelte";
  import QrCodeReader from "$lib/components/QRCodeReader.svelte";
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import type { Entry } from "$lib/entry";
  import { fieldTypes, type Field } from "$lib/field";
  import { idb } from "$lib/idb";
  import { cameraStore } from "$lib/settings";
  import { surveyTypes, type Survey } from "$lib/survey";
  import { Undo2Icon } from "@lucide/svelte";

  let {
    compId,
    surveyId,
  }: {
    compId?: number;
    surveyId?: number;
  } = $props();

  let imported = $state<{
    comps?: Map<number, Comp>;
    surveys?: Map<number, Survey>;
    fields?: Map<number, Field>;
    entries?: Entry[];
  }>({});

  let anyImported = $derived.by(() => {
    return imported.comps?.size || imported.surveys?.size || imported.fields?.size || imported.entries?.length;
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

      const oldToNewCompIds = new Map<number, number>();
      const oldToNewSurveyIds = new Map<number, number>();
      const oldToNewFieldIds = new Map<number, number>();

      if (!compId && imported.comps?.size) {
        await addImportedComps(oldToNewCompIds).catch(console.error);
      }

      if (!surveyId && imported.surveys?.size) {
        await addImportedSurveys(oldToNewCompIds, oldToNewSurveyIds).catch(console.error);
      }

      if (imported.fields?.size) {
        await addImportedSingleFields(oldToNewSurveyIds, oldToNewFieldIds).catch(console.error);
        await addImportedGroupFields(oldToNewSurveyIds, oldToNewFieldIds).catch(console.error);

        if (surveyId) {
          const survey = await idb.getOne({ from: "surveys", is: surveyId });
          await updateExistingSurveyWithNewFields(survey, oldToNewFieldIds).catch(console.error);
        } else {
          await updateImportedSurveysWithNewFields(oldToNewSurveyIds, oldToNewFieldIds).catch(console.error);
        }
      }

      if (imported.entries?.length) {
        await addImportedEntries(oldToNewSurveyIds).catch(console.error);
      }

      invalidateAll();
      closeDialog();
    },
  };

  function addImportedComps(oldToNewCompIds: Map<number, number>) {
    return new Promise<void>((resolve, reject) => {
      if (!imported.comps?.size) {
        reject("No comps");
        return;
      }

      const compTx = idb.transaction("comps", "readwrite");

      for (const [id, importedComp] of imported.comps) {
        const req = compTx.objectStore("comps").add($state.snapshot(importedComp));
        req.onsuccess = () => {
          oldToNewCompIds.set(id, req.result as number);
        };
      }

      compTx.oncomplete = () => resolve();
      compTx.onabort = () => reject(compTx.error?.message);
    });
  }

  function addImportedSurveys(oldToNewCompIds: Map<number, number>, oldToNewSurveyIds: Map<number, number>) {
    return new Promise<void>((resolve, reject) => {
      if (!imported.surveys?.size) {
        reject("No surveys");
        return;
      }

      const surveyTx = idb.transaction("surveys", "readwrite");

      for (const [id, importedSurvey] of imported.surveys) {
        const thisCompId = compId || oldToNewCompIds.get(importedSurvey.compId);
        if (!thisCompId) {
          continue;
        }

        const survey = $state.snapshot(importedSurvey);
        survey.compId = thisCompId;

        const req = surveyTx.objectStore("surveys").add(survey);
        req.onsuccess = () => {
          oldToNewSurveyIds.set(id, req.result as number);
        };
      }

      surveyTx.oncomplete = () => resolve();
      surveyTx.onabort = () => reject(surveyTx.error?.message);
    });
  }

  function addImportedSingleFields(oldToNewSurveyIds: Map<number, number>, oldToNewFieldIds: Map<number, number>) {
    return new Promise<void>((resolve, reject) => {
      if (!imported.fields?.size) {
        reject("No fields");
        return;
      }

      const fieldTx = idb.transaction("fields", "readwrite");

      for (const [id, importedField] of imported.fields) {
        if (importedField.type == "group") {
          continue;
        }

        const thisSurveyId = surveyId || oldToNewSurveyIds.get(importedField.surveyId);
        if (!thisSurveyId) {
          continue;
        }

        const field = $state.snapshot(importedField);
        field.surveyId = thisSurveyId;

        const req = fieldTx.objectStore("fields").add(field);
        req.onsuccess = () => {
          oldToNewFieldIds.set(id, req.result as number);
        };
      }

      fieldTx.oncomplete = () => resolve();
      fieldTx.onabort = () => reject(fieldTx.error?.message);
    });
  }

  function addImportedGroupFields(oldToNewSurveyIds: Map<number, number>, oldToNewFieldIds: Map<number, number>) {
    return new Promise<void>((resolve, reject) => {
      if (!imported.fields?.size) {
        reject("No fields");
        return;
      }

      const fieldTx = idb.transaction("fields", "readwrite");

      for (const [id, importedField] of imported.fields) {
        if (importedField.type != "group") {
          continue;
        }

        const thisSurveyId = surveyId || oldToNewSurveyIds.get(importedField.surveyId);
        if (!thisSurveyId) {
          continue;
        }

        const field = $state.snapshot(importedField);
        field.surveyId = thisSurveyId;
        field.fieldIds = field.fieldIds
          .map((innerId) => oldToNewFieldIds.get(innerId))
          .filter((id) => id !== undefined);

        const req = fieldTx.objectStore("fields").add(field);
        req.onsuccess = () => {
          oldToNewFieldIds.set(id, req.result as number);
        };
      }

      fieldTx.oncomplete = () => resolve();
      fieldTx.onabort = () => reject(fieldTx.error?.message);
    });
  }

  function updateExistingSurveyWithNewFields(survey: IDBRecord<Survey>, oldToNewFieldIds: Map<number, number>) {
    return new Promise<void>((resolve, reject) => {
      survey.fieldIds = survey.fieldIds.map((id) => oldToNewFieldIds.get(id)).filter((id) => id !== undefined);

      if (survey.type == "match") {
        survey.expressions = survey.expressions.map((e) => {
          if (e.input.from == "fields") {
            e.input.fieldIds = e.input.fieldIds.map((id) => oldToNewFieldIds.get(id)).filter((id) => id !== undefined);
          }
          return e;
        });
      }

      const req = idb.objectStore("surveys", "readwrite").put(survey);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error?.message);
    });
  }

  function updateImportedSurveysWithNewFields(
    oldToNewSurveyIds: Map<number, number>,
    oldToNewFieldIds: Map<number, number>,
  ) {
    return new Promise<void>((resolve, reject) => {
      if (!imported.surveys?.size || !imported.fields?.size) {
        reject("No surveys or fields");
        return;
      }

      const surveyTx = idb.transaction("surveys", "readwrite");

      for (const [oldId, importedSurvey] of imported.surveys) {
        const survey = $state.snapshot(importedSurvey);

        survey.fieldIds = survey.fieldIds.map((id) => oldToNewFieldIds.get(id)).filter((id) => id !== undefined);

        if (survey.type == "match") {
          survey.expressions = survey.expressions.map((e) => {
            if (e.input.from == "fields") {
              e.input.fieldIds = e.input.fieldIds
                .map((id) => oldToNewFieldIds.get(id))
                .filter((id) => id !== undefined);
            }
            return e;
          });
        }

        surveyTx.objectStore("surveys").put({ ...survey, id: oldToNewSurveyIds.get(oldId) });
      }

      surveyTx.oncomplete = () => resolve();
      surveyTx.onabort = () => reject(surveyTx.error?.message);
    });
  }

  function addImportedEntries(oldToNewSurveyIds: Map<number, number>) {
    return new Promise<void>((resolve, reject) => {
      if (!imported.entries?.length) {
        reject("No entries");
        return;
      }

      const entryTx = idb.transaction("entries", "readwrite");

      for (const importedEntry of imported.entries) {
        const thisSurveyId = surveyId || oldToNewSurveyIds.get(importedEntry.surveyId);
        if (!thisSurveyId) {
          continue;
        }

        const entry: Entry = $state.snapshot(importedEntry);
        entry.surveyId = thisSurveyId;
        entryTx.objectStore("entries").add(entry);
      }

      entryTx.oncomplete = () => resolve();
      entryTx.onabort = () => reject(entryTx.error?.message);
    });
  }

  async function onchange() {
    if (!files?.length) {
      return;
    }

    onread(await files[0].text());
  }

  function onread(data: string) {
    let json: {
      version: number;
      comps?: Partial<IDBRecord<Comp>>[];
      surveys?: Partial<IDBRecord<Survey>>[];
      fields?: Partial<IDBRecord<Field>>[];
      entries?: Partial<Entry>[];
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

    const importedComps = new Map<number, Comp>();
    const importedSurveys = new Map<number, Survey>();
    const importedFields = new Map<number, Field>();

    json.comps?.forEach((jsonComp, index) => {
      const comp: Comp = {
        name: jsonComp.name || jsonComp.tbaEventKey || `Comp ${index}`,
        matches: jsonComp.matches || [],
        teams: jsonComp.teams || [],
        created: new Date(),
        modified: new Date(),
      };

      if (jsonComp.tbaEventKey) {
        comp.tbaEventKey = jsonComp.tbaEventKey;
      }

      if (jsonComp.scouts) {
        comp.scouts = jsonComp.scouts;
      }

      importedComps.set(jsonComp.id || index + 1, comp);
    });

    json.surveys?.forEach((jsonSurvey, index) => {
      let compIdToUse = 0;

      if (compId) {
        compIdToUse = compId;
      } else if (jsonSurvey.compId !== undefined && importedComps?.has(jsonSurvey.compId)) {
        compIdToUse = jsonSurvey.compId;
      }

      if (!jsonSurvey.type || !surveyTypes.includes(jsonSurvey.type)) {
        return;
      }

      let survey: Survey;

      switch (jsonSurvey.type) {
        case "match":
          survey = {
            compId: compIdToUse,
            name: jsonSurvey.name || "Match Survey",
            type: "match",
            fieldIds: jsonSurvey.fieldIds || [],
            pickLists: jsonSurvey.pickLists || [],
            expressions: jsonSurvey.expressions || [],
            created: new Date(),
            modified: new Date(),
          };
          if (jsonSurvey.tbaMetrics?.length) {
            survey.tbaMetrics = jsonSurvey.tbaMetrics;
          }
          break;
        case "pit":
          survey = {
            compId: compIdToUse,
            name: jsonSurvey.name || "Pit Survey",
            type: "pit",
            fieldIds: jsonSurvey.fieldIds || [],
            created: new Date(),
            modified: new Date(),
          };
          break;
        default:
          return;
      }

      importedSurveys.set(jsonSurvey.id || index + 1, survey);
    });

    json.fields?.forEach((jsonField, index) => {
      let surveyIdToUse = 0;

      if (surveyId) {
        surveyIdToUse = surveyId;
      } else if (jsonField.surveyId !== undefined && importedSurveys?.has(jsonField.surveyId)) {
        surveyIdToUse = jsonField.surveyId;
      }

      if (!jsonField.type || !fieldTypes.includes(jsonField.type)) {
        return;
      }

      let field: Field;

      switch (jsonField.type) {
        case "number":
          field = {
            surveyId: surveyIdToUse,
            name: jsonField.name || jsonField.type,
            type: jsonField.type,
          };
          if (jsonField.allowNegative) {
            field.allowNegative = true;
          }
          break;
        case "toggle":
          field = {
            surveyId: surveyIdToUse,
            name: jsonField.name || jsonField.type,
            type: jsonField.type,
          };
          break;
        case "select":
          field = {
            surveyId: surveyIdToUse,
            name: jsonField.name || jsonField.type,
            type: jsonField.type,
            values: jsonField.values || [],
          };
          if (jsonField.radio) {
            field.radio = true;
          }
          break;
        case "text":
          field = {
            surveyId: surveyIdToUse,
            name: jsonField.name || jsonField.type,
            type: jsonField.type,
          };
          if (jsonField.long) {
            field.long = true;
          }
          break;
        case "rating":
          field = {
            surveyId: surveyIdToUse,
            name: jsonField.name || jsonField.type,
            type: jsonField.type,
          };
          break;
        case "timer":
          field = {
            surveyId: surveyIdToUse,
            name: jsonField.name || jsonField.type,
            type: jsonField.type,
          };
          break;
        case "group":
          field = {
            surveyId: surveyIdToUse,
            name: jsonField.name || jsonField.type,
            type: jsonField.type,
            fieldIds: jsonField.fieldIds || [],
          };
          break;
        default:
          return;
      }

      if ("tip" in field && "tip" in jsonField && jsonField.tip) {
        field.tip = jsonField.tip;
      }

      importedFields.set(jsonField.id || index + 1, field);
    });

    imported = {
      comps: importedComps.size ? importedComps : undefined,
      surveys: importedSurveys.size ? importedSurveys : undefined,
      fields: importedFields.size ? importedFields : undefined,
      entries: json.entries?.map((jsonEntry) => {
        let surveyIdToUse = 0;

        if (surveyId) {
          surveyIdToUse = surveyId;
        } else if (jsonEntry.surveyId !== undefined && importedSurveys?.has(jsonEntry.surveyId)) {
          surveyIdToUse = jsonEntry.surveyId;
        }

        let entry: Entry;

        if ("match" in jsonEntry) {
          entry = {
            surveyId: surveyIdToUse,
            type: "match",
            status: "exported",
            team: jsonEntry.team || "",
            match: jsonEntry.match || 0,
            absent: jsonEntry.absent || false,
            values: jsonEntry.values || [],
            created: new Date(),
            modified: new Date(),
          };

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
            surveyId: surveyIdToUse,
            type: "pit",
            status: "exported",
            team: jsonEntry.team || "",
            values: jsonEntry.values || [],
            created: new Date(),
            modified: new Date(),
          };
        }

        if (jsonEntry.scout) {
          entry.scout = jsonEntry.scout;
        }

        return entry;
      }),
    };
  }

  function retry() {
    error = "";
    imported = {};
  }
</script>

<span>Import data</span>

{#if $cameraStore}
  <div class="flex flex-wrap gap-2 text-sm">
    <Button onclick={() => ($tab = "qrfcode")} class={$tab == "qrfcode" ? "font-bold" : "font-light"}>QRF code</Button>
    <Button onclick={() => ($tab = "file")} class={$tab == "file" ? "font-bold" : "font-light"}>File</Button>
  </div>
{/if}

{#if $tab == "qrfcode" && $cameraStore}
  {#if anyImported}
    {@render preview(imported)}

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

  {#if anyImported}
    {@render preview(imported)}
  {/if}
{/if}

{#snippet preview(imp: typeof imported)}
  <div class="flex flex-col gap-1 text-sm">
    {#if compId}
      <span>Adding to comp {compId}</span>
    {:else if imp.comps?.size}
      <span>Comps: {imp.comps.size == 1 ? [...imp.comps.values()][0].name : imp.comps.size}</span>
    {/if}

    {#if surveyId}
      <span>Adding to survey {surveyId}</span>
    {:else if imp.surveys?.size}
      <span>Surveys: {imp.surveys.size == 1 ? [...imp.surveys.values()][0].name : imp.surveys.size}</span>
    {/if}

    {#if imp.fields?.size}
      <span>Fields: {imp.fields.size}</span>
    {/if}

    {#if imp.entries?.length}
      <span>Entries: {imp.entries.length}</span>
    {/if}
  </div>
{/snippet}

{#if error}
  <span>{error}</span>
{/if}
