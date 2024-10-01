<script lang="ts">
  import { parseValueFromString } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import Dialog from "$lib/components/Dialog.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import QRCodeReader from "$lib/components/QRCodeReader.svelte";
  import type { Entry } from "$lib/entry";
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

  let qrCodeData = $state<string | undefined>();
  let error = $state("");

  function onopen() {
    qrCodeReader.start();
  }

  function onconfirm() {
    if (!qrCodeData) {
      error = "No input";
      return;
    }

    const entryCSV = qrCodeData
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

    let entry: Entry;
    if (surveyRecord.type == "match") {
      entry = {
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
      entry = {
        surveyId: surveyRecord.id,
        type: surveyRecord.type,
        status: "exported",
        team: entryCSV[0],
        values: entryCSV.slice(1).map(parseValueFromString),
        created: new Date(),
        modified: new Date(),
      };
    }

    const addRequest = idb.transaction("entries", "readwrite").objectStore("entries").add(entry);
    addRequest.onsuccess = () => {
      const id = addRequest.result;
      if (!id) {
        error = "Could not add entry!";
        return;
      }

      entryRecords = [{ ...entry, id: id as number }, ...entryRecords];
      dialog.close();
    };

    addRequest.onerror = (e) => {
      e.preventDefault();
      error = "Could not add entry!";
    };
  }

  function onclose() {
    qrCodeReader.stop();
    qrCodeData = "";
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

<Dialog bind:this={dialog} {onconfirm} {onopen} {onclose}>
  <span>Import from QR code</span>
  <QRCodeReader
    bind:this={qrCodeReader}
    onRead={(data) => {
      qrCodeData = data;
    }}
  />
  {#if qrCodeData}
    <span>{qrCodeData}</span>
  {/if}
  {#if error}
    <span>{error}</span>
  {/if}
</Dialog>
