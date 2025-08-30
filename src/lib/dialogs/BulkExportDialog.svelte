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
    comps?: Comp[];
    surveys?: Survey[];
    fields?: Field[];
    entries?: Entry[];
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
    const preparedComps = $state.snapshot(comps)?.map((comp) => {
      return {
        ...structuredClone(comp),
        created: undefined,
        modified: undefined,
      };
    });

    const preparedSurveys = $state.snapshot(surveys)?.map((survey) => {
      return {
        ...structuredClone(survey),
        created: undefined,
        modified: undefined,
      };
    });

    const preparedFields = $state.snapshot(fields);

    const preparedEntries = $state.snapshot(entries)?.map((entry) => {
      return {
        ...structuredClone(entry),
        type: undefined,
        status: undefined,
        created: undefined,
        modified: undefined,
      };
    });

    const data = {
      version: schemaVersion,
      comps: preparedComps,
      surveys: preparedSurveys,
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
