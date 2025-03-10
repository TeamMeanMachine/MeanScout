<script lang="ts">
  import { sessionStorageStore } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import FieldValueEditor from "$lib/components/FieldValueEditor.svelte";
  import Header from "$lib/components/Header.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import QrCodeDisplay from "$lib/components/QRCodeDisplay.svelte";
  import { openDialog } from "$lib/dialog";
  import DeleteEntryDialog from "$lib/dialogs/DeleteEntryDialog.svelte";
  import SubmitEntryDialog from "$lib/dialogs/SubmitEntryDialog.svelte";
  import { exportEntriesCompressed } from "$lib/entry";
  import { objectStore } from "$lib/idb";
  import type { PageData } from "./$types";
  import NewScoutDialog from "$lib/dialogs/NewScoutDialog.svelte";
  import { getDefaultFieldValue } from "$lib/field";

  let {
    data,
  }: {
    data: PageData;
  } = $props();

  const entryExport = sessionStorageStore<"true" | "">("entry-export", "");

  let exportButton: HTMLDivElement;

  let entry = $state(structuredClone($state.snapshot(data.entryRecord)));
  let compressedEntry = $state<Uint8Array>();

  let error = $state("");

  $effect(() => {
    entry;
    if (entry.type == "match" && entry.absent) {
      exportEntriesCompressed([{ ...entry, values: data.defaultValues }]).then((result) => (compressedEntry = result));
    } else {
      exportEntriesCompressed([entry]).then((result) => (compressedEntry = result));
    }
  });

  async function onchange() {
    data = {
      ...data,
      entryRecord: { ...entry, modified: new Date() },
      surveyRecord: { ...data.surveyRecord, modified: new Date() },
    } as PageData;
    objectStore("entries", "readwrite").put($state.snapshot(data.entryRecord));
    objectStore("surveys", "readwrite").put($state.snapshot(data.surveyRecord));
  }
</script>

<Header
  title="Draft - {data.surveyRecord.name} - MeanScout"
  heading={[
    { type: "sm", text: data.surveyRecord.name },
    { type: "h1", text: "Draft" },
  ]}
  backLink="survey/{data.surveyRecord.id}"
/>

<div class="flex flex-col gap-6" style="view-transition-name:draft-{data.entryRecord.id}">
  <div class="flex flex-col gap-6">
    <div class="flex flex-wrap items-end gap-x-6 gap-y-3">
      <div class="flex flex-col">
        {#if data.surveyType == "match"}
          <span><small>Match</small> <strong>{data.entryRecord.match}</strong></span>
        {/if}
        <span><small>Team</small> <strong>{data.entryRecord.team}</strong></span>
        {#if data.teamName?.length}
          <span><small class="font-light">{data.teamName}</small></span>
        {/if}
      </div>

      {#if data.surveyRecord.scouts}
        <div class="flex flex-wrap items-end gap-x-6 gap-y-3">
          <div class="flex flex-col">
            <small>Scout</small>
            <div class="flex flex-wrap gap-2">
              {#if data.surveyRecord.scouts}
                <select bind:value={entry.scout} class="text-theme bg-neutral-800 p-2">
                  {#each data.surveyRecord.scouts.toSorted((a, b) => a.localeCompare(b)) as scout}
                    <option>{scout}</option>
                  {/each}
                </select>
                <Button
                  onclick={() => {
                    openDialog(NewScoutDialog, {
                      scouts: data.surveyRecord.scouts ?? [],
                      onadd(newScout) {
                        data = {
                          ...data,
                          surveyRecord: {
                            ...data.surveyRecord,
                            scouts: [...(data.surveyRecord.scouts || []), newScout],
                          },
                        } as PageData;
                        objectStore("surveys", "readwrite").put($state.snapshot(data.surveyRecord));
                        entry.scout = newScout;
                      },
                    });
                  }}
                >
                  <Icon name="plus" />
                </Button>
              {/if}
            </div>
          </div>

          {#if entry.scout && data.surveyType == "match" && data.entryRecord.prediction}
            <div class="flex flex-col">
              <span>
                <small>Prediction</small>
                <strong class="capitalize text-{data.entryRecord.prediction}">
                  {data.entryRecord.prediction} wins
                </strong>
              </span>
              {#if data.entryRecord.predictionReason}
                <span><small class="font-light">"{data.entryRecord.predictionReason}"</small></span>
              {/if}
            </div>
          {/if}
        </div>
      {/if}
    </div>

    {#if entry.type == "match"}
      <Button
        onclick={() => {
          entry.absent = !entry.absent;
          onchange();
        }}
        class="self-start"
      >
        {#if entry.absent}
          <Icon name="square-check" />
          <strong>Absent</strong>
        {:else}
          <Icon style="regular" name="square" />
          Absent
        {/if}
      </Button>
    {/if}

    {#if entry.type == "match" && entry.absent}{:else}
      <div class="flex flex-col flex-wrap gap-3">
        {#each data.surveyRecord.fieldIds as fieldId}
          {@const fieldDetails = data.detailedFields.get(fieldId)}

          {#if fieldDetails?.type == "group"}
            <div class="flex w-full flex-col gap-1">
              <h2 class="font-bold">{fieldDetails.field.name}</h2>

              <div class="mb-4 flex flex-wrap items-end gap-x-6 gap-y-3">
                {#each fieldDetails.field.fieldIds as innerFieldId}
                  {@const innerFieldDetails = data.detailedInnerFields.get(innerFieldId)}

                  {#if innerFieldDetails}
                    <FieldValueEditor
                      field={innerFieldDetails.field}
                      bind:value={entry.values[innerFieldDetails.valueIndex]}
                      {onchange}
                    />
                  {/if}
                {/each}
              </div>
            </div>
          {:else if fieldDetails}
            <FieldValueEditor
              field={fieldDetails.field}
              bind:value={entry.values[fieldDetails.valueIndex]}
              {onchange}
            />
          {/if}
        {/each}
      </div>
    {/if}
  </div>

  <div bind:this={exportButton} class="flex flex-col">
    <Button
      onclick={() => {
        $entryExport = $entryExport ? "" : "true";
        if ($entryExport == "true") {
          setTimeout(() => exportButton.scrollIntoView(), 0);
        }
      }}
      class="w-[516px] max-w-full self-start"
    >
      {#if $entryExport}
        <div class="flex flex-col gap-2">
          <div class="flex flex-wrap items-center gap-2">
            <Icon name="square-check" />
            <div class="flex grow flex-col">
              <strong>Export</strong>
              <small>QRF code</small>
            </div>
            <Icon name="caret-up" />
          </div>
          {#if CompressionStream && compressedEntry}
            {#key compressedEntry}
              <QrCodeDisplay data={compressedEntry} />
            {/key}
          {/if}
        </div>
      {:else}
        <Icon style="regular" name="square" />
        <div class="flex grow flex-col">
          Export
          <small>QRF code</small>
        </div>
        <Icon name="caret-down" />
      {/if}
    </Button>
  </div>

  <div class="mb-4 flex flex-wrap justify-between gap-2">
    <Button
      onclick={() => {
        for (let i = 0; i < entry.values.length; i++) {
          const value = entry.values[i];
          if (typeof value !== typeof getDefaultFieldValue(data.fields[i].field)) {
            error = `Invalid value for ${data.fields[i].field.name}`;
            return;
          }
        }

        openDialog(SubmitEntryDialog, {
          fields: data.fields,
          entryRecord: data.entryRecord,
          onexport: () => {
            objectStore("surveys", "readwrite").put({ ...$state.snapshot(data.surveyRecord), modified: new Date() });
            location.hash = `/survey/${data.surveyRecord.id}`;
          },
        });
      }}
    >
      <Icon name="floppy-disk" />
      Submit
      {#if $entryExport}
        as exported
      {/if}
    </Button>

    <Button
      onclick={() =>
        openDialog(DeleteEntryDialog, {
          entryRecord: data.entryRecord,
          ondelete: () => {
            objectStore("surveys", "readwrite").put({ ...$state.snapshot(data.surveyRecord), modified: new Date() });
            location.hash = `/survey/${data.surveyRecord.id}`;
          },
        })}
    >
      <Icon name="trash" />
    </Button>

    {#if error}
      <span class="w-full">Error: {error}</span>
    {/if}
  </div>
</div>
