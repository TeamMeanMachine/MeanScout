<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import FieldValueEditor from "$lib/components/FieldValueEditor.svelte";
  import Header from "$lib/components/Header.svelte";
  import { openDialog } from "$lib/dialog";
  import DeleteEntryDialog from "$lib/dialogs/DeleteEntryDialog.svelte";
  import SubmitEntryDialog from "$lib/dialogs/SubmitEntryDialog.svelte";
  import { objectStore } from "$lib/idb";
  import type { PageData } from "./$types";
  import NewScoutDialog from "$lib/dialogs/NewScoutDialog.svelte";
  import { getDefaultFieldValue } from "$lib/field";
  import { PlusIcon, SaveIcon, SquareCheckBigIcon, SquareIcon, Trash2Icon } from "@lucide/svelte";

  let {
    data,
  }: {
    data: PageData;
  } = $props();

  let entry = $state(structuredClone($state.snapshot(data.entryRecord)));

  let error = $state("");

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
  <div class="flex flex-wrap items-start gap-x-6 gap-y-3">
    {#if data.surveyType == "match"}
      <div class="flex flex-col">
        <small>Match</small>
        <strong>{data.entryRecord.match}</strong>
      </div>
    {/if}
    <div class="flex flex-col">
      <small class="text-wrap">{data.teamName || "Team"}</small>
      <strong>{data.entryRecord.team}</strong>
    </div>

    {#if data.surveyRecord.scouts && entry.scout && data.surveyType == "match" && data.entryRecord.prediction}
      <div class="flex flex-col">
        <small>Prediction</small>
        <strong class="capitalize text-{data.entryRecord.prediction}">
          {data.entryRecord.prediction} wins
        </strong>
      </div>
    {/if}
  </div>

  {#if data.surveyRecord.scouts}
    <div class="flex flex-wrap items-end gap-2">
      {#if data.surveyRecord.scouts.length}
        <label class="flex flex-col">
          <small>Scout</small>
          <select bind:value={entry.scout} {onchange} class="text-theme bg-neutral-800 p-2">
            {#each data.surveyRecord.scouts.toSorted((a, b) => a.localeCompare(b)) as scout}
              <option>{scout}</option>
            {/each}
          </select>
        </label>
      {/if}
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
              onchange();
            },
          });
        }}
      >
        <PlusIcon class="text-theme" />
      </Button>
    </div>
  {:else if entry.scout}
    <div class="flex flex-col">
      <small>Scout</small>
      <strong>{entry.scout}</strong>
    </div>
  {/if}

  {#if entry.type == "match"}
    <Button
      onclick={() => {
        entry.absent = !entry.absent;
        onchange();
      }}
      class="self-start"
    >
      {#if entry.absent}
        <SquareCheckBigIcon class="text-theme" />
      {:else}
        <SquareIcon class="text-theme" />
      {/if}
      <div class="flex flex-col">
        <span class:font-bold={entry.absent}>Absent</span>
        <small class="font-light">Robot no-showed</small>
      </div>
    </Button>
  {/if}

  {#if entry.type == "match" && entry.absent}{:else}
    <div class="flex flex-col flex-wrap gap-3">
      {#each data.surveyRecord.fieldIds as fieldId}
        {@const fieldDetails = data.detailedFields.get(fieldId)}

        {#if fieldDetails?.type == "group"}
          <div class="flex w-full flex-col gap-2">
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
          <FieldValueEditor field={fieldDetails.field} bind:value={entry.values[fieldDetails.valueIndex]} {onchange} />
        {/if}
      {/each}
    </div>
  {/if}

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
      <SaveIcon class="text-theme" />
      Submit
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
      <Trash2Icon class="text-theme" />
    </Button>

    {#if error}
      <span class="w-full">Error: {error}</span>
    {/if}
  </div>
</div>
