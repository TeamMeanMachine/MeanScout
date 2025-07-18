<script lang="ts">
  import { download, schemaVersion, sessionStorageStore, share } from "$lib";
  import type { Comp } from "$lib/comp";
  import Button from "$lib/components/Button.svelte";
  import QrCodeDisplay from "$lib/components/QRCodeDisplay.svelte";
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import type { Entry } from "$lib/entry";
  import type { Field } from "$lib/field";
  import type { Survey } from "$lib/survey";
  import { FileJsonIcon, Share2Icon } from "@lucide/svelte";

  let {
    comps,
    surveys,
    fields,
    entries,
    onexport,
  }: {
    comps?: IDBRecord<Comp>[];
    surveys?: IDBRecord<Survey>[];
    fields?: IDBRecord<Field>[];
    entries?: IDBRecord<Entry>[];
    onexport?: () => void;
  } = $props();

  const tab = sessionStorageStore<"qrfcode" | "file">("export-data-tab", "qrfcode");

  const json = generateExportedData();

  const fileName = ["ms", compsDescriptor(), surveysDescriptor(), fieldsDescriptor(), entriesDescriptor()]
    .filter((p) => p)
    .join("-")
    .replaceAll(" ", "_")
    .toLowerCase();

  export const { onconfirm }: DialogExports = {
    onconfirm: onexport
      ? () => {
          onexport();
          closeDialog();
        }
      : undefined,
  };

  function shareBulkAsFile() {
    // Web Share API does not allow JSON files.
    // https://docs.google.com/document/d/1tKPkHA5nnJtmh2TgqWmGSREUzXgMUFDL6yMdVZHqUsg
    share(json, `${fileName}.txt`, "text/plain");
  }

  function saveBulkAsFile() {
    download(json, `${fileName}.json`, "application/json");
  }

  function compsDescriptor() {
    if (!comps?.length) return undefined;
    if (comps.length == 1) return comps[0].name;
    return "c" + comps.length;
  }

  function surveysDescriptor() {
    if (!surveys?.length) return undefined;
    if (surveys.length == 1) return surveys[0].name;
    return "s" + surveys.length;
  }

  function fieldsDescriptor() {
    if (!fields?.length) return undefined;
    return "f" + fields.length;
  }

  function entriesDescriptor() {
    if (!entries?.length) return undefined;
    return "e" + entries.length;
  }

  function generateExportedData() {
    const oldToNewCompIds = new Map<number, number>();
    const oldToNewSurveyIds = new Map<number, number>();
    const oldToNewFieldIds = new Map<number, number>();

    const preparedComps = $state.snapshot(comps)?.map((comp, index) => {
      oldToNewCompIds.set(comp.id, index + 1);

      return {
        ...structuredClone(comp),
        id: index + 1,
        created: undefined,
        modified: undefined,
      };
    });

    const partiallyPreparedSurveys = $state.snapshot(surveys)?.map((survey, index) => {
      oldToNewSurveyIds.set(survey.id, index + 1);

      return {
        ...structuredClone(survey),
        id: index + 1,
        compId: oldToNewCompIds.get(survey.compId),
        created: undefined,
        modified: undefined,
      };
    });

    fields?.forEach((field, index) => {
      oldToNewFieldIds.set(field.id, index + 1);
    });

    const preparedFields = $state.snapshot(fields)?.map((field) => {
      if (field.type == "group") {
        return {
          ...structuredClone(field),
          id: oldToNewFieldIds.get(field.id)!,
          surveyId: oldToNewSurveyIds.get(field.surveyId)!,
          fieldIds: field.fieldIds.map((id) => oldToNewFieldIds.get(id)!),
        };
      }

      return {
        ...structuredClone(field),
        id: oldToNewFieldIds.get(field.id)!,
        surveyId: oldToNewSurveyIds.get(field.surveyId)!,
      };
    });

    const fullyPreparedSurveys = partiallyPreparedSurveys?.map((survey) => {
      survey.fieldIds = survey.fieldIds.map((id) => oldToNewFieldIds.get(id)!);

      if (survey.type == "match") {
        survey.expressions = survey.expressions.map((e) => {
          if (e.input.from == "fields") {
            e.input.fieldIds = e.input.fieldIds.map((id) => oldToNewFieldIds.get(id)!);
          }

          return e;
        });
      }

      return survey;
    });

    const preparedEntries = $state.snapshot(entries)?.map((entry) => {
      return {
        ...structuredClone(entry),
        id: undefined,
        surveyId: oldToNewSurveyIds.get(entry.surveyId),
        type: undefined,
        status: undefined,
        created: undefined,
        modified: undefined,
      };
    });

    const data = {
      version: schemaVersion,
      comps: preparedComps,
      surveys: fullyPreparedSurveys,
      fields: preparedFields,
      entries: preparedEntries,
    };

    return JSON.stringify(data);
  }
</script>

<span>Export data</span>

<div class="flex flex-wrap gap-2 text-sm">
  <Button onclick={() => ($tab = "qrfcode")} class={$tab == "qrfcode" ? "font-bold" : "font-light"}>QRF code</Button>
  <Button onclick={() => ($tab = "file")} class={$tab == "file" ? "font-bold" : "font-light"}>File</Button>
</div>

{#if $tab == "qrfcode"}
  <QrCodeDisplay data={json} />
{:else}
  {#if "canShare" in navigator}
    <Button onclick={shareBulkAsFile}>
      <Share2Icon class="text-theme" />
      <div class="flex flex-col">
        Share
        <span class="text-xs font-light">As JSON</span>
      </div>
    </Button>
  {/if}
  <Button onclick={saveBulkAsFile}>
    <FileJsonIcon class="text-theme" />
    <div class="flex flex-col">
      Save
      <span class="text-xs font-light">As JSON</span>
    </div>
  </Button>
{/if}

{#if onexport}
  <span>Mark as exported?</span>
{/if}
