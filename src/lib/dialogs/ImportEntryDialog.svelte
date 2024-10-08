<script lang="ts">
  import { parseValueFromString, type Value } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import Dialog from "$lib/components/Dialog.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import QRCodeReader from "$lib/components/QRCodeReader.svelte";
  import type { Entry } from "$lib/entry";
  import { countPreviousFields, type SingleField } from "$lib/field";
  import type { Survey } from "$lib/survey";

  let {
    idb,
    surveyRecord,
    entryRecords = $bindable(),
  }: {
    idb: IDBDatabase;
    surveyRecord: IDBRecord<Survey>;
    entryRecords: IDBRecord<Entry>[];
  } = $props();

  let dialog: Dialog;
  let qrCodeReader: QRCodeReader;

  let importedEntry = $state<Entry | undefined>();
  let error = $state("");

  function onopen() {
    qrCodeReader.start();
  }

  function onread(data: string) {
    const entryCSV = data
      .trim()
      .split(",")
      .map((value) => value.trim());

    if (!entryCSV.length || !entryCSV[0].length) {
      error = "No input";
      return;
    }

    if (entryCSV[0] == "Team") {
      return;
    }

    if (surveyRecord.type == "match") {
      importedEntry = {
        surveyId: surveyRecord.id,
        type: surveyRecord.type,
        status: "exported",
        team: entryCSV[0],
        match: parseInt(entryCSV[1]),
        absent: entryCSV[2].toLowerCase() == "true" ? true : false,
        values: entryCSV.slice(3).map(parseValueFromString),
        created: new Date(),
        modified: new Date(),
      };
    } else {
      importedEntry = {
        surveyId: surveyRecord.id,
        type: surveyRecord.type,
        status: "exported",
        team: entryCSV[0],
        values: entryCSV.slice(1).map(parseValueFromString),
        created: new Date(),
        modified: new Date(),
      };
    }
  }

  function retry() {
    importedEntry = undefined;
    error = "";
    qrCodeReader.stop();
    qrCodeReader.start();
  }

  function onconfirm() {
    if (!importedEntry) {
      error = "No input";
      return;
    }

    const addRequest = idb
      .transaction("entries", "readwrite")
      .objectStore("entries")
      .add($state.snapshot(importedEntry));

    addRequest.onsuccess = () => {
      const id = addRequest.result;
      if (!id || !importedEntry) {
        error = "Could not add entry!";
        return;
      }

      entryRecords = [{ ...importedEntry, id: id as number }, ...entryRecords];
      dialog.close();
    };

    addRequest.onerror = (e) => {
      e.preventDefault();
      error = "Could not add entry!";
    };
  }

  function onclose() {
    qrCodeReader.stop();
    importedEntry = undefined;
    error = "";
  }
</script>

<Button onclick={() => dialog.open()}>
  <Icon name="qrcode" />
  <div class="flex flex-col">
    Import
    <small>QR code</small>
  </div>
</Button>

{#snippet fieldRow(field: SingleField, value: Value)}
  {#if field.type == "text"}
    <tr>
      <td colspan="2" class="p-2">
        <div class="flex flex-col">
          <small>{field.name}</small>
          <strong>"{value}"</strong>
        </div>
      </td>
    </tr>
  {:else}
    <tr>
      <td class="p-2 text-sm">{field.name}</td>
      <td class="p-2 font-bold">{value}</td>
    </tr>
  {/if}
{/snippet}

<Dialog bind:this={dialog} {onconfirm} {onopen} {onclose}>
  <span>Import from QR code</span>
  <QRCodeReader bind:this={qrCodeReader} {onread} />
  {#if importedEntry}
    <div class="flex max-h-[500px] flex-col gap-2 overflow-auto">
      <table class="w-full text-left">
        <tbody>
          <tr><th colspan="2" class="p-2">Entry</th></tr>
          <tr>
            <td class="w-0 p-2 text-sm">Team</td>
            <td class="p-2 font-bold">{importedEntry.team}</td>
          </tr>
          {#if importedEntry.type == "match"}
            <tr>
              <td class="p-2 text-sm">Match</td>
              <td class="p-2 font-bold">{importedEntry.match}</td>
            </tr>
            <tr>
              <td class="p-2 text-sm">Absent</td>
              <td class="p-2 font-bold">{importedEntry.absent}</td>
            </tr>
          {/if}
          <tr><td class="p-2"></td></tr>
          {#if importedEntry.type != "match" || !importedEntry.absent}
            {#each surveyRecord.fields as field, i (field)}
              {@const previousFields = countPreviousFields(i, surveyRecord.fields)}
              {#if field.type == "group"}
                <tr><th colspan="2" class="p-2">{field.name}</th></tr>
                {#each field.fields as innerField, innerFieldIndex (innerField)}
                  {@render fieldRow(innerField, importedEntry.values[previousFields + innerFieldIndex])}
                {/each}
                <tr><td class="p-2"></td></tr>
              {:else}
                {@render fieldRow(field, importedEntry.values[previousFields])}
              {/if}
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  {/if}
  <Button onclick={retry}>
    <Icon name="arrow-rotate-left" />
    Retry
  </Button>
  {#if error}
    <span>{error}</span>
  {/if}
</Dialog>
